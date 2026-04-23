import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import * as fabric from "fabric";

export type ArtboardPresetId = "square" | "story" | "portrait";

export const ARTBOARD_PRESETS: Record<ArtboardPresetId, { label: string; width: number; height: number }> = {
  square: { label: "Feed Quadrado", width: 1080, height: 1080 },
  portrait: { label: "Feed Retrato", width: 1080, height: 1350 },
  story: { label: "Story", width: 1080, height: 1920 },
};

type EditorCtx = {
  canvas: fabric.Canvas | null;
  registerCanvas: (el: HTMLCanvasElement | null, wrapper: HTMLDivElement | null) => void;
  artboard: { width: number; height: number };
  setArtboardPreset: (id: ArtboardPresetId) => void;
  zoom: number;
  setZoom: (z: number) => void;
  fitToScreen: () => void;
  preset: ArtboardPresetId;
  addImageFromSource: (src: string) => Promise<void>;
  addImageFromFile: (file: File) => Promise<void>;
  openImagePicker: () => void;
  addPage: () => void;
  deleteActiveObject: () => void;
};

const EditorContext = createContext<EditorCtx | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}

const PADDING = 64; // breathing room around the artboard inside the wrapper

export function EditorProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const artboardRectRef = useRef<fabric.Rect | null>(null);

  const [canvasState, setCanvasState] = useState<fabric.Canvas | null>(null);
  const [preset, setPreset] = useState<ArtboardPresetId>("square");
  const [artboard, setArtboard] = useState({ width: 1080, height: 1080 });
  const [zoom, setZoomState] = useState(40);

  // Build (or rebuild) the artboard rect + clipPath inside the canvas
  const buildArtboard = useCallback((width: number, height: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Remove old artboard
    if (artboardRectRef.current) {
      canvas.remove(artboardRectRef.current);
      artboardRectRef.current = null;
    }

    const rect = new fabric.Rect({
      left: 0,
      top: 0,
      width,
      height,
      fill: "#ffffff",
      selectable: false,
      evented: false,
      hoverCursor: "default",
      shadow: new fabric.Shadow({
        color: "rgba(15, 12, 41, 0.35)",
        blur: 40,
        offsetX: 0,
        offsetY: 10,
      }),
    });
    // Tag it so we can identify
    (rect as fabric.Rect & { isArtboard?: boolean }).isArtboard = true;

    canvas.add(rect);
    canvas.sendObjectToBack(rect);
    artboardRectRef.current = rect;

    // ClipPath ensures nothing is drawn outside the artboard bounds.
    const clip = new fabric.Rect({
      left: 0,
      top: 0,
      width,
      height,
      absolutePositioned: true,
    });
    canvas.clipPath = clip;
    canvas.requestRenderAll();
  }, []);

  // Compute fit-to-screen zoom and re-center artboard inside the wrapper
  const fitToScreen = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    if (w === 0 || h === 0) return;

    canvas.setDimensions({ width: w, height: h });

    const availableW = w - PADDING * 2;
    const availableH = h - PADDING * 2;
    const scale = Math.min(availableW / artboard.width, availableH / artboard.height);
    const safeScale = Math.max(0.05, Math.min(scale, 5));

    canvas.setZoom(safeScale);

    const vt = canvas.viewportTransform;
    if (vt) {
      vt[4] = (w - artboard.width * safeScale) / 2;
      vt[5] = (h - artboard.height * safeScale) / 2;
      canvas.setViewportTransform(vt);
    }

    setZoomState(Math.round(safeScale * 100));
    canvas.requestRenderAll();
  }, [artboard.width, artboard.height]);

  const setZoom = useCallback(
    (z: number) => {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper) {
        setZoomState(z);
        return;
      }
      const scale = z / 100;
      canvas.setZoom(scale);
      const vt = canvas.viewportTransform;
      if (vt) {
        vt[4] = (wrapper.clientWidth - artboard.width * scale) / 2;
        vt[5] = (wrapper.clientHeight - artboard.height * scale) / 2;
        canvas.setViewportTransform(vt);
      }
      setZoomState(z);
      canvas.requestRenderAll();
    },
    [artboard.width, artboard.height]
  );

  const setArtboardPreset = useCallback((id: ArtboardPresetId) => {
    const p = ARTBOARD_PRESETS[id];
    setPreset(id);
    setArtboard({ width: p.width, height: p.height });
  }, []);

  // When artboard size changes, rebuild rect+clip and fit
  useEffect(() => {
    if (!canvasRef.current) return;
    buildArtboard(artboard.width, artboard.height);
    requestAnimationFrame(() => fitToScreen());
  }, [artboard.width, artboard.height, buildArtboard, fitToScreen]);

  // Resize observer keeps the canvas sized to its wrapper
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(() => fitToScreen());
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [fitToScreen]);

  // ---------- Page actions ----------

  /** Clear all non-artboard objects from the canvas (start a fresh page) */
  const clearUserObjects = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const userObjs = canvas
      .getObjects()
      .filter((o) => !(o as fabric.Object & { isArtboard?: boolean }).isArtboard);
    userObjs.forEach((o) => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, []);

  const addPage = useCallback(() => {
    clearUserObjects();
    fitToScreen();
  }, [clearUserObjects, fitToScreen]);

  // ---------- Image insertion ----------
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addImageFromSource = useCallback(
    async (src: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const img = await fabric.FabricImage.fromURL(src, { crossOrigin: "anonymous" });

        const aw = artboard.width;
        const ah = artboard.height;
        const iw = img.width ?? 1;
        const ih = img.height ?? 1;
        const maxScale = Math.min((aw * 0.8) / iw, (ah * 0.8) / ih);
        const scale = Math.min(maxScale, 1);
        img.scale(scale);

        img.set({
          left: aw / 2,
          top: ah / 2,
          originX: "center",
          originY: "center",
          cornerColor: "#ffffff",
          cornerStrokeColor: "oklch(0.55 0.28 295)",
          borderColor: "oklch(0.55 0.28 295)",
          cornerSize: 12,
          transparentCorners: false,
          cornerStyle: "circle",
          rotatingPointOffset: 28,
          lockUniScaling: true,
        });
        img.setControlsVisibility({
          mt: false,
          mb: false,
          ml: false,
          mr: false,
          mtr: true,
          tl: true,
          tr: true,
          bl: true,
          br: true,
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      } catch (err) {
        console.error("Falha ao adicionar imagem:", err);
      }
    },
    [artboard.width, artboard.height]
  );

  const addImageFromFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await addImageFromSource(dataUrl);
    },
    [addImageFromSource]
  );

  const openImagePicker = useCallback(() => {
    if (!fileInputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.style.display = "none";
      input.addEventListener("change", () => {
        const f = input.files?.[0];
        if (f) addImageFromFile(f);
        input.value = "";
      });
      document.body.appendChild(input);
      fileInputRef.current = input;
    }
    fileInputRef.current.click();
  }, [addImageFromFile]);

  useEffect(() => {
    return () => {
      if (fileInputRef.current) {
        fileInputRef.current.remove();
        fileInputRef.current = null;
      }
    };
  }, []);

  const registerCanvas = useCallback(
    (el: HTMLCanvasElement | null, wrapper: HTMLDivElement | null) => {
      wrapperRef.current = wrapper;

      if (canvasRef.current) {
        canvasRef.current.dispose();
        canvasRef.current = null;
      }

      if (!el || !wrapper) {
        setCanvasState(null);
        return;
      }

      const canvas = new fabric.Canvas(el, {
        width: wrapper.clientWidth,
        height: wrapper.clientHeight,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
        selection: true,
      });
      canvasRef.current = canvas;
      setCanvasState(canvas);

      buildArtboard(artboard.width, artboard.height);
      requestAnimationFrame(() => fitToScreen());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <EditorContext.Provider
      value={{
        canvas: canvasState,
        registerCanvas,
        artboard,
        setArtboardPreset,
        zoom,
        setZoom,
        fitToScreen,
        preset,
        addImageFromSource,
        addImageFromFile,
        openImagePicker,
        addPage,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
