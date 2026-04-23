import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import * as fabric from "fabric";

export type ArtboardPresetId = "square" | "story" | "portrait";

export const ARTBOARD_PRESETS: Record<ArtboardPresetId, { label: string; width: number; height: number }> = {
  square: { label: "Feed Quadrado", width: 1080, height: 1080 },
  portrait: { label: "Feed Retrato", width: 1080, height: 1350 },
  story: { label: "Story", width: 1080, height: 1920 },
};

/** A page in the vertical stack. Each page owns its own Fabric canvas. */
export type PageState = {
  id: string;
};

type EditorCtx = {
  /** The currently focused canvas (last interacted). Used by tool/sidebar actions. */
  activeCanvas: fabric.Canvas | null;
  /**
   * A page registers its own <canvas> element here. The provider creates a
   * Fabric instance for it and tracks it. Returns the disposer.
   */
  registerPageCanvas: (
    pageId: string,
    el: HTMLCanvasElement | null,
    width: number,
    height: number,
  ) => void;
  /** Mark a page as the active one (called on focus / mousedown). */
  setActivePageId: (id: string) => void;

  artboard: { width: number; height: number };
  setArtboardPreset: (id: ArtboardPresetId) => void;
  preset: ArtboardPresetId;

  zoom: number;
  setZoom: (z: number) => void;
  fitToScreen: () => void;

  addImageFromSource: (src: string) => Promise<void>;
  addImageFromFile: (file: File) => Promise<void>;
  openImagePicker: () => void;

  addPage: () => void;
  deleteActiveObject: () => void;

  /** Read the live Fabric.Canvas for a given page (null if not registered yet). */
  getPageCanvas: (pageId: string) => fabric.Canvas | null;

  pages: PageState[];
  activePageId: string | null;
};

const EditorContext = createContext<EditorCtx | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}

/** Create a unique page id. */
function makePageId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<ArtboardPresetId>("square");
  const [artboard, setArtboard] = useState({ width: 1080, height: 1080 });
  const [zoom, setZoomState] = useState(40);

  const [pages, setPages] = useState<PageState[]>([{ id: makePageId() }]);
  const [activePageId, setActivePageIdState] = useState<string | null>(null);
  const [activeCanvas, setActiveCanvas] = useState<fabric.Canvas | null>(null);

  // Map of pageId -> Fabric.Canvas (one canvas per stacked page)
  const canvasesRef = useRef<Map<string, fabric.Canvas>>(new Map());
  const activePageIdRef = useRef<string | null>(null);

  // ---------- Trash icon + custom Fabric Control (delete handle on objects) ----------
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
        const target = transform.target;
        if (!target) return false;
        const c = target.canvas;
        if (!c) return false;
        c.remove(target);
        c.discardActiveObject();
        c.requestRenderAll();
        return true;
      },
      render: renderIcon,
      sizeX: 26,
      sizeY: 26,
    });
  }

  /** Setup a freshly created Fabric canvas: artboard + clipPath + activation hooks. */
  const initFabricCanvas = useCallback(
    (pageId: string, c: fabric.Canvas, w: number, h: number) => {
      // White artboard rectangle (the visible "paper")
      const artRect = new fabric.Rect({
        left: 0,
        top: 0,
        width: w,
        height: h,
        fill: "#ffffff",
        selectable: false,
        evented: false,
        hoverCursor: "default",
      });
      (artRect as fabric.Rect & { isArtboard?: boolean }).isArtboard = true;
      c.add(artRect);
      c.sendObjectToBack(artRect);

      // Clip everything to the artboard so dropped images don't bleed out.
      c.clipPath = new fabric.Rect({
        left: 0,
        top: 0,
        width: w,
        height: h,
        absolutePositioned: true,
      });

      // Activation: focusing this canvas marks it active for the toolbar/sidebar.
      const markActive = () => {
        activePageIdRef.current = pageId;
        setActivePageIdState(pageId);
        setActiveCanvas(c);
      };
      c.on("mouse:down", markActive);

      // Keep the deletion handle wired on every newly added object
      c.on("object:added", (e) => {
        const obj = e.target;
        if (!obj) return;
        if ((obj as fabric.Object & { isArtboard?: boolean }).isArtboard) return;
        if (trashControlRef.current) {
          obj.controls = { ...obj.controls, deleteControl: trashControlRef.current };
        }
      });

      c.requestRenderAll();
    },
    [],
  );

  /** Register (or unregister with `el = null`) a page's <canvas>. Idempotent. */
  const registerPageCanvas = useCallback(
    (pageId: string, el: HTMLCanvasElement | null, w: number, h: number) => {
      const map = canvasesRef.current;

      // Unregister
      if (!el) {
        const existing = map.get(pageId);
        if (existing) {
          existing.dispose();
          map.delete(pageId);
        }
        if (activePageIdRef.current === pageId) {
          activePageIdRef.current = null;
          setActivePageIdState(null);
          setActiveCanvas(null);
        }
        return;
      }

      // Already registered — skip (size handled by parent prop)
      if (map.get(pageId)) return;

      const fab = new fabric.Canvas(el, {
        width: w,
        height: h,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
        selection: true,
      });
      map.set(pageId, fab);
      initFabricCanvas(pageId, fab, w, h);

      // First-ever registration -> auto-activate
      if (!activePageIdRef.current) {
        activePageIdRef.current = pageId;
        setActivePageIdState(pageId);
        setActiveCanvas(fab);
      }
    },
    [initFabricCanvas],
  );

  /** Manually mark a page as active (e.g. from a click handler). */
  const setActivePageId = useCallback((id: string) => {
    const c = canvasesRef.current.get(id);
    if (!c) return;
    activePageIdRef.current = id;
    setActivePageIdState(id);
    setActiveCanvas(c);
  }, []);

  // ---------- Artboard preset ----------
  // When the preset changes, every existing canvas needs to be resized + clipped
  // to the new dimensions. We rebuild artboard + clipPath in place to preserve
  // user objects.
  useEffect(() => {
    canvasesRef.current.forEach((c) => {
      // Replace artboard rect
      const artRect = c
        .getObjects()
        .find((o) => (o as fabric.Object & { isArtboard?: boolean }).isArtboard) as
        | fabric.Rect
        | undefined;
      if (artRect) c.remove(artRect);

      const newArt = new fabric.Rect({
        left: 0,
        top: 0,
        width: artboard.width,
        height: artboard.height,
        fill: "#ffffff",
        selectable: false,
        evented: false,
        hoverCursor: "default",
      });
      (newArt as fabric.Rect & { isArtboard?: boolean }).isArtboard = true;
      c.add(newArt);
      c.sendObjectToBack(newArt);

      c.clipPath = new fabric.Rect({
        left: 0,
        top: 0,
        width: artboard.width,
        height: artboard.height,
        absolutePositioned: true,
      });

      c.setDimensions({ width: artboard.width * (zoom / 100), height: artboard.height * (zoom / 100) });
      c.setZoom(zoom / 100);
      c.requestRenderAll();
    });
  }, [artboard.width, artboard.height, zoom]);

  const setArtboardPreset = useCallback((id: ArtboardPresetId) => {
    const p = ARTBOARD_PRESETS[id];
    setPreset(id);
    setArtboard({ width: p.width, height: p.height });
  }, []);

  // ---------- Zoom (applies uniformly to every page in the stack) ----------
  const setZoom = useCallback(
    (z: number) => {
      const safe = Math.max(10, Math.min(400, Math.round(z)));
      setZoomState(safe);
      const scale = safe / 100;
      canvasesRef.current.forEach((c) => {
        c.setDimensions({ width: artboard.width * scale, height: artboard.height * scale });
        c.setZoom(scale);
        c.requestRenderAll();
      });
    },
    [artboard.width, artboard.height],
  );

  /** Fit a single page comfortably in the workspace. */
  const fitToScreen = useCallback(() => {
    // Find a representative page DOM node to measure available width
    const anyCanvas = canvasesRef.current.values().next().value as fabric.Canvas | undefined;
    if (!anyCanvas) return;
    const wrapper = anyCanvas.getElement().parentElement?.parentElement; // the scroll container
    if (!wrapper) return;
    const PADDING = 80;
    const availableW = wrapper.clientWidth - PADDING * 2;
    const availableH = wrapper.clientHeight - PADDING * 2;
    const scale = Math.min(availableW / artboard.width, availableH / artboard.height);
    setZoom(Math.round(Math.max(0.1, Math.min(scale, 5)) * 100));
  }, [artboard.width, artboard.height, setZoom]);

  // ---------- Pages ----------
  const addPage = useCallback(() => {
    setPages((prev) => [...prev, { id: makePageId() }]);
  }, []);

  // ---------- Delete active object ----------
  const deleteActiveObject = useCallback(() => {
    const c = canvasesRef.current.get(activePageIdRef.current ?? "");
    if (!c) return;
    const active = c.getActiveObject();
    if (!active) return;
    if ((active as fabric.Object & { isArtboard?: boolean }).isArtboard) return;
    if (active.type === "activeselection" && "forEachObject" in active) {
      (active as fabric.ActiveSelection).forEachObject((obj) => {
        if (!(obj as fabric.Object & { isArtboard?: boolean }).isArtboard) c.remove(obj);
      });
    } else {
      c.remove(active);
    }
    c.discardActiveObject();
    c.requestRenderAll();
  }, []);

  // ---------- Image insertion (always targets the active page's canvas) ----------
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addImageFromSource = useCallback(
    async (src: string) => {
      const c = canvasesRef.current.get(activePageIdRef.current ?? "");
      if (!c) return;
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
          mt: false, mb: false, ml: false, mr: false,
          mtr: true, tl: true, tr: true, bl: true, br: true,
        });

        c.add(img);
        if (trashControlRef.current) {
          img.controls = { ...img.controls, deleteControl: trashControlRef.current };
        }
        c.setActiveObject(img);
        c.requestRenderAll();
      } catch (err) {
        console.error("Falha ao adicionar imagem:", err);
      }
    },
    [artboard.width, artboard.height],
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
    [addImageFromSource],
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
      // Dispose all canvases on unmount
      canvasesRef.current.forEach((c) => c.dispose());
      canvasesRef.current.clear();
    };
  }, []);

  return (
    <EditorContext.Provider
      value={{
        activeCanvas,
        registerPageCanvas,
        setActivePageId,
        artboard,
        setArtboardPreset,
        preset,
        zoom,
        setZoom,
        fitToScreen,
        addImageFromSource,
        addImageFromFile,
        openImagePicker,
        addPage,
        deleteActiveObject,
        pages,
        activePageId,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
