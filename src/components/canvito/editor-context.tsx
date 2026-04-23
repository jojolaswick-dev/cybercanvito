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

  // ---------- Delete active object ----------
  const deleteActiveObject = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    if ((active as fabric.Object & { isArtboard?: boolean }).isArtboard) return;

    // Handle multi-selection
    if (active.type === "activeselection" && "forEachObject" in active) {
      (active as fabric.ActiveSelection).forEachObject((obj) => {
        if (!(obj as fabric.Object & { isArtboard?: boolean }).isArtboard) {
          canvas.remove(obj);
        }
      });
    } else {
      canvas.remove(active);
    }
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, []);

  // Build the trash icon image used by the custom Fabric Control
  const trashIconRef = useRef<HTMLImageElement | null>(null);
  if (typeof window !== "undefined" && !trashIconRef.current) {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="11" fill="oklch(0.55 0.28 295)" stroke="white" stroke-width="1.5"/>
  <path d="M8 8 L16 16 M16 8 L8 16" stroke="white" stroke-width="2"/>
</svg>`;
    const img = new Image();
    img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
    trashIconRef.current = img;
  }

  // Build a trash Control once (Fabric v6 uses fabric.Control)
  const trashControlRef = useRef<fabric.Control | null>(null);
  if (!trashControlRef.current) {
    const renderIcon: fabric.Control["render"] = (ctx, left, top, _styleOverride, fabricObject) => {
      const size = 26;
      const icon = trashIconRef.current;
      ctx.save();
      ctx.translate(left, top);
      ctx.rotate((fabricObject.angle * Math.PI) / 180);
      if (icon && icon.complete && icon.naturalWidth > 0) {
        ctx.drawImage(icon, -size / 2, -size / 2, size, size);
      } else {
        // Fallback circle
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = "oklch(0.55 0.28 295)";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(5, 5);
        ctx.moveTo(5, -5);
        ctx.lineTo(-5, 5);
        ctx.stroke();
      }
      ctx.restore();
    };

    trashControlRef.current = new fabric.Control({
      x: 0.5,
      y: -0.5,
      offsetX: 20,
      offsetY: -20,
      cursorStyle: "pointer",
      mouseUpHandler: (_eventData, transform) => {
        const canvas = canvasRef.current;
        const target = transform.target;
        if (!canvas || !target) return false;
        canvas.remove(target);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        return true;
      },
      render: renderIcon,
      sizeX: 26,
      sizeY: 26,
    });
  }


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
