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

type HistoryState = {
  pages: { id: string; json: string }[];
  activePageId: string | null;
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
  applyCrop: () => Promise<void>;
  cancelCrop: () => void;
  isCropMode: boolean;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

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
  const [isCropMode, setIsCropMode] = useState(false);

  const [pages, setPages] = useState<PageState[]>([{ id: makePageId() }]);
  const [activePageId, setActivePageIdState] = useState<string | null>(null);
  const [activeCanvas, setActiveCanvas] = useState<fabric.Canvas | null>(null);

  // Undo/Redo Stacks
  const undoStackRef = useRef<HistoryState[]>([]);
  const redoStackRef = useRef<HistoryState[]>([]);
  const isInternalUpdateRef = useRef(false);

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

  const saveHistory = useCallback(() => {
    if (isInternalUpdateRef.current) return;
    
    const currentState: HistoryState = {
      pages: pages.map(p => ({
        id: p.id,
        json: JSON.stringify(canvasesRef.current.get(p.id)?.toJSON() || {})
      })),
      activePageId: activePageIdRef.current
    };

    undoStackRef.current.push(currentState);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
  }, [pages]);

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

      // History tracking
      c.on("object:modified", saveHistory);
      c.on("object:added", (e) => {
        const obj = e.target;
        if (!obj) return;
        if ((obj as fabric.Object & { isArtboard?: boolean }).isArtboard) return;
        
        // Keep the deletion handle wired on every newly added object
        if (trashControlRef.current) {
          obj.controls = { ...obj.controls, deleteControl: trashControlRef.current };
        }
        saveHistory();
      });
      c.on("object:removed", saveHistory);

      c.requestRenderAll();
    },
    [saveHistory],
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

  const clearCropSession = useCallback(() => {
    const session = cropSessionRef.current;
    if (!session) return;
    window.removeEventListener("keydown", session.keydown);
    session.canvas.off("object:moving", session.refresh);
    session.canvas.off("object:scaling", session.refresh);
    session.canvas.remove(session.cropBox, ...session.overlays, ...session.actions);
    session.image.set({ selectable: session.original.selectable, evented: session.original.evented, opacity: session.original.opacity });
    session.image.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false, mtr: true, tl: true, tr: true, bl: true, br: true });
    session.canvas.setActiveObject(session.image);
    session.canvas.requestRenderAll();
    cropSessionRef.current = null;
    setIsCropMode(false);
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

  const startCropMode = useCallback(() => {
    clearCropSession();
    const c = canvasesRef.current.get(activePageIdRef.current ?? "");
    const target = c?.getActiveObject();
    if (!c || !(target instanceof fabric.FabricImage)) {
      toast.info("Selecione uma imagem para recortar");
      return;
    }

    const bounds = target.getBoundingRect();
    const minSize = 24;
    target.set({ selectable: false, evented: false, opacity: 0.82 });
    target.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false, mtr: false, tl: false, tr: false, bl: false, br: false });
    const cropBox = new fabric.Rect({ left: bounds.left + bounds.width * 0.12, top: bounds.top + bounds.height * 0.12, width: bounds.width * 0.76, height: bounds.height * 0.76, originX: "left", originY: "top", fill: "transparent", stroke: "oklch(0.98 0 0)", strokeWidth: 2 / c.getZoom(), cornerColor: "oklch(0.55 0.28 295)", cornerStrokeColor: "oklch(0.98 0 0)", borderColor: "oklch(0.98 0 0)", cornerSize: 12, transparentCorners: false, lockRotation: true, hasRotatingPoint: false, centeredScaling: false, lockScalingFlip: true, objectCaching: false, noScaleCache: true });
    const resizeCropBox = (handle: "tl" | "tr" | "bl" | "br" | "mt" | "mb" | "ml" | "mr") => (_eventData: unknown, _transform: unknown, x: number, y: number) => {
      const left = cropBox.left ?? bounds.left;
      const top = cropBox.top ?? bounds.top;
      const right = left + (cropBox.width ?? minSize);
      const bottom = top + (cropBox.height ?? minSize);
      let nextLeft = left;
      let nextTop = top;
      let nextRight = right;
      let nextBottom = bottom;
      if (handle.includes("l")) nextLeft = Math.min(Math.max(x, bounds.left), right - minSize);
      if (handle.includes("r")) nextRight = Math.max(Math.min(x, bounds.left + bounds.width), left + minSize);
      if (handle.includes("t")) nextTop = Math.min(Math.max(y, bounds.top), bottom - minSize);
      if (handle.includes("b")) nextBottom = Math.max(Math.min(y, bounds.top + bounds.height), top + minSize);
      cropBox.set({ left: nextLeft, top: nextTop, width: nextRight - nextLeft, height: nextBottom - nextTop, scaleX: 1, scaleY: 1 });
      cropBox.setCoords();
      refresh();
      return true;
    };
    cropBox.controls = {
      tl: new fabric.Control({ x: -0.5, y: -0.5, cursorStyle: "nwse-resize", actionHandler: resizeCropBox("tl") }),
      tr: new fabric.Control({ x: 0.5, y: -0.5, cursorStyle: "nesw-resize", actionHandler: resizeCropBox("tr") }),
      bl: new fabric.Control({ x: -0.5, y: 0.5, cursorStyle: "nesw-resize", actionHandler: resizeCropBox("bl") }),
      br: new fabric.Control({ x: 0.5, y: 0.5, cursorStyle: "nwse-resize", actionHandler: resizeCropBox("br") }),
      mt: new fabric.Control({ x: 0, y: -0.5, cursorStyle: "ns-resize", actionHandler: resizeCropBox("mt") }),
      mb: new fabric.Control({ x: 0, y: 0.5, cursorStyle: "ns-resize", actionHandler: resizeCropBox("mb") }),
      ml: new fabric.Control({ x: -0.5, y: 0, cursorStyle: "ew-resize", actionHandler: resizeCropBox("ml") }),
      mr: new fabric.Control({ x: 0.5, y: 0, cursorStyle: "ew-resize", actionHandler: resizeCropBox("mr") }),
    };
    (cropBox as CropOverlayObject).isCropOverlay = true;

    const overlays = [0, 1, 2, 3].map(() => {
      const overlay = new fabric.Rect({ fill: "oklch(0.08 0.02 280 / 0.56)", selectable: false, evented: false, objectCaching: false });
      (overlay as CropOverlayObject).isCropOverlay = true;
      return overlay as CropOverlayObject;
    });

    const makeAction = (label: string, left: number, fill: string) => {
      // Buttons removed from canvas - logic moved to TopBar
      return new fabric.Group([], { visible: false });
    };
    const confirmButton = makeAction("Confirmar", 0, "transparent");
    const cancelButton = makeAction("Cancelar", 0, "transparent");

    const refresh = () => {
      const box = cropBox.getBoundingRect();
      overlays[0].set({ left: bounds.left, top: bounds.top, width: bounds.width, height: Math.max(0, box.top - bounds.top) });
      overlays[1].set({ left: bounds.left, top: box.top, width: Math.max(0, box.left - bounds.left), height: box.height });
      overlays[2].set({ left: box.left + box.width, top: box.top, width: Math.max(0, bounds.left + bounds.width - box.left - box.width), height: box.height });
      overlays[3].set({ left: bounds.left, top: box.top + box.height, width: bounds.width, height: Math.max(0, bounds.top + bounds.height - box.top - box.height) });
      c.renderAll();
    };

    const applyCrop = async () => {
      const box = cropBox.getBoundingRect();
      const imageBounds = target.getBoundingRect();
      const element = target.getElement() as HTMLImageElement | HTMLCanvasElement;
      const sourceWidth = element instanceof HTMLImageElement ? element.naturalWidth : element.width;
      const sourceHeight = element instanceof HTMLImageElement ? element.naturalHeight : element.height;
      const sx = Math.max(0, Math.round(((box.left - imageBounds.left) / imageBounds.width) * sourceWidth));
      const sy = Math.max(0, Math.round(((box.top - imageBounds.top) / imageBounds.height) * sourceHeight));
      const sw = Math.max(1, Math.round((box.width / imageBounds.width) * sourceWidth));
      const sh = Math.max(1, Math.round((box.height / imageBounds.height) * sourceHeight));
      const out = document.createElement("canvas");
      out.width = Math.min(sourceWidth - sx, sw);
      out.height = Math.min(sourceHeight - sy, sh);
      const ctx = out.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(element, sx, sy, out.width, out.height, 0, 0, out.width, out.height);
      const cropped = await fabric.FabricImage.fromURL(out.toDataURL("image/png"));
      cropped.set({ left: box.left + box.width / 2, top: box.top + box.height / 2, originX: "center", originY: "center", scaleX: box.width / out.width, scaleY: box.height / out.height, cornerColor: "#ffffff", cornerStrokeColor: "oklch(0.55 0.28 295)", borderColor: "oklch(0.55 0.28 295)", cornerSize: 12, transparentCorners: false, cornerStyle: "circle", lockUniScaling: true });
      clearCropSession();
      c.remove(target);
      c.add(cropped);
      if (trashControlRef.current) cropped.controls = { ...cropped.controls, deleteControl: trashControlRef.current };
      c.setActiveObject(cropped);
      c.requestRenderAll();
      saveHistory();
    };

    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") clearCropSession(); if (event.key === "Enter") void applyCrop(); };
    cropSessionRef.current = { canvas: c, image: target, cropBox, overlays, actions: [], refresh, keydown, original: { selectable: Boolean(target.selectable), evented: Boolean(target.evented), opacity: target.opacity ?? 1 } };
    c.add(...overlays, cropBox);
    c.setActiveObject(cropBox);
    c.on("object:moving", refresh);
    c.on("object:scaling", refresh);
    window.addEventListener("keydown", keydown);
    setIsCropMode(true);
    refresh();
  }, [clearCropSession, saveHistory]);

  const applyCrop = useCallback(async () => {
    const session = cropSessionRef.current;
    if (!session) return;
    const { canvas, image, cropBox } = session;
    const target = image;
    const box = cropBox.getBoundingRect();
    const imageBounds = target.getBoundingRect();
    const element = target.getElement() as HTMLImageElement | HTMLCanvasElement;
    const sourceWidth = element instanceof HTMLImageElement ? element.naturalWidth : element.width;
    const sourceHeight = element instanceof HTMLImageElement ? element.naturalHeight : element.height;
    const sx = Math.max(0, Math.round(((box.left - imageBounds.left) / imageBounds.width) * sourceWidth));
    const sy = Math.max(0, Math.round(((box.top - imageBounds.top) / imageBounds.height) * sourceHeight));
    const sw = Math.max(1, Math.round((box.width / imageBounds.width) * sourceWidth));
    const sh = Math.max(1, Math.round((box.height / imageBounds.height) * sourceHeight));
    const out = document.createElement("canvas");
    out.width = Math.min(sourceWidth - sx, sw);
    out.height = Math.min(sourceHeight - sy, sh);
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(element, sx, sy, out.width, out.height, 0, 0, out.width, out.height);
    const cropped = await fabric.FabricImage.fromURL(out.toDataURL("image/png"));
    cropped.set({ left: box.left + box.width / 2, top: box.top + box.height / 2, originX: "center", originY: "center", scaleX: box.width / out.width, scaleY: box.height / out.height, cornerColor: "#ffffff", cornerStrokeColor: "oklch(0.55 0.28 295)", borderColor: "oklch(0.55 0.28 295)", cornerSize: 12, transparentCorners: false, cornerStyle: "circle", lockUniScaling: true });
    clearCropSession();
    canvas.remove(target);
    canvas.add(cropped);
    if (trashControlRef.current) cropped.controls = { ...cropped.controls, deleteControl: trashControlRef.current };
    canvas.setActiveObject(cropped);
    canvas.requestRenderAll();
  }, [clearCropSession]);

  const cancelCrop = useCallback(() => {
    clearCropSession();
  }, [clearCropSession]);

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
    startCropMode,
    applyCrop,
    cancelCrop,
    isCropMode,
    getPageCanvas,
    pages,
    activePageId,
  }), [
    activeCanvas, registerPageCanvas, setActivePageId, artboard, setArtboardPreset, preset, zoom,
    setZoom, fitToScreen, addImageFromSource, addImageFromFile, openImagePicker, addPage,
    deletePage, deleteActiveObject, startCropMode, applyCrop, cancelCrop, isCropMode, getPageCanvas,
    pages, activePageId,
  ]);

  return (
    <EditorContext.Provider
      value={contextValue}
    >
      {children}
    </EditorContext.Provider>
  );
}
