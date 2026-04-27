import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import * as fabric from "fabric";
import { toast } from "sonner";

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

/** A point inside a specific page's artboard (in artboard coordinates). */
export type ImageInsertPoint = {
  pageId: string;
  /** X in artboard pixels (0..artboard.width). Centered if omitted. */
  x?: number;
  /** Y in artboard pixels (0..artboard.height). Centered if omitted. */
  y?: number;
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

  addImageFromSource: (src: string, at?: ImageInsertPoint) => Promise<void>;
  addImageFromFile: (file: File, at?: ImageInsertPoint) => Promise<void>;
  openImagePicker: (at?: ImageInsertPoint) => void;

  addPage: () => void;
  deletePage: (pageId: string) => void;
  deleteActiveObject: () => void;
  startCropMode: () => void;

  /** Read the live Fabric.Canvas for a given page (null if not registered yet). */
  getPageCanvas: (pageId: string) => fabric.Canvas | null;

  pages: PageState[];
  activePageId: string | null;
};

type CropOverlayObject = fabric.Rect & { isCropOverlay?: boolean };

type CropSession = {
  canvas: fabric.Canvas;
  image: fabric.FabricImage;
  cropBox: CropOverlayObject;
  overlays: CropOverlayObject[];
  actions: fabric.Group[];
  refresh: () => void;
  keydown: (event: KeyboardEvent) => void;
  original: {
    selectable: boolean;
    evented: boolean;
    opacity: number;
  };
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingInsertAtRef = useRef<ImageInsertPoint | null>(null);
  const cropSessionRef = useRef<CropSession | null>(null);

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

  const deletePage = useCallback((pageId: string) => {
    setPages((prev) => {
      // Security rule: never delete the last remaining page.
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((p) => p.id === pageId);
      if (idx === -1) return prev;
      const next = prev.filter((p) => p.id !== pageId);

      // Dispose the Fabric instance for the removed page.
      const map = canvasesRef.current;
      const fab = map.get(pageId);
      if (fab) {
        fab.dispose();
        map.delete(pageId);
      }

      // If the deleted page was the active one, fall back to a neighbor.
      if (activePageIdRef.current === pageId) {
        const fallback = next[idx] ?? next[idx - 1] ?? next[0];
        if (fallback) {
          const fc = map.get(fallback.id) ?? null;
          activePageIdRef.current = fallback.id;
          setActivePageIdState(fallback.id);
          setActiveCanvas(fc);
        } else {
          activePageIdRef.current = null;
          setActivePageIdState(null);
          setActiveCanvas(null);
        }
      }

      return next;
    });
  }, []);

  const getPageCanvas = useCallback(
    (pageId: string) => canvasesRef.current.get(pageId) ?? null,
    [],
  );

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

  const addImageFromSource = useCallback(
    async (src: string, at?: ImageInsertPoint) => {
      const targetPageId = at?.pageId ?? activePageIdRef.current ?? "";
      const c = canvasesRef.current.get(targetPageId);
      if (!c) return;
      try {
        // DataURLs must NOT pass crossOrigin (causes a silent CORS failure on some browsers).
        const isDataUrl = src.startsWith("data:");
        const img = await fabric.FabricImage.fromURL(
          src,
          isDataUrl ? {} : { crossOrigin: "anonymous" },
        );

        const aw = artboard.width;
        const ah = artboard.height;
        const iw = img.width ?? 1;
        const ih = img.height ?? 1;
        const maxScale = Math.min((aw * 0.8) / iw, (ah * 0.8) / ih);
        const scale = Math.min(maxScale, 1);
        img.scale(scale);

        const cx = at?.x ?? aw / 2;
        const cy = at?.y ?? ah / 2;

        img.set({
          left: cx,
          top: cy,
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
    async (file: File, at?: ImageInsertPoint) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await addImageFromSource(dataUrl, at);
    },
    [addImageFromSource],
  );

  // Pending insertion point used by openImagePicker(at) — applied to the next
  // file selected via the shared <input type=file>.

  const openImagePicker = useCallback(
    (at?: ImageInsertPoint) => {
      if (at?.pageId) {
        activePageIdRef.current = at.pageId;
        setActivePageIdState(at.pageId);
        setActiveCanvas(canvasesRef.current.get(at.pageId) ?? null);
      }
      pendingInsertAtRef.current = at ?? null;
      if (!fileInputRef.current) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.style.display = "none";
        input.addEventListener("change", () => {
          const f = input.files?.[0];
          const target = pendingInsertAtRef.current;
          pendingInsertAtRef.current = null;
          if (f) addImageFromFile(f, target ?? undefined);
          input.value = "";
        });
        document.body.appendChild(input);
        fileInputRef.current = input;
      }
      fileInputRef.current.click();
    },
    [addImageFromFile],
  );

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

  const contextValue = useMemo<EditorCtx>(() => ({
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
    deletePage,
    deleteActiveObject,
    getPageCanvas,
    pages,
    activePageId,
  }), [
    activeCanvas, registerPageCanvas, setActivePageId, artboard, setArtboardPreset, preset, zoom,
    setZoom, fitToScreen, addImageFromSource, addImageFromFile, openImagePicker, addPage,
    deletePage, deleteActiveObject, getPageCanvas, pages, activePageId,
  ]);

  return (
    <EditorContext.Provider
      value={contextValue}
    >
      {children}
    </EditorContext.Provider>
  );
}
