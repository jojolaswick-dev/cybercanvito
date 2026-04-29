import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ImagePlus, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type * as fabric from "fabric";
import { useEditor } from "./editor-context";

/** What was hit on right-click — used to choose menu options. */
type CtxMenuState = {
  /** Position relative to the page paper. */
  x: number;
  y: number;
  /** When true, the click landed on a selected (deletable) object. */
  hasObject: boolean;
  /** Artboard coordinates where an uploaded image should be inserted. */
  insertX: number;
  insertY: number;
};

/**
 * The Workspace = a single scrollable gray container. Pages stack vertically,
 * each one is its own Fabric canvas. The "+ Adicionar página" button sits at
 * the very bottom of the stack.
 */
export const Canvas = memo(function Canvas() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const {
    pages,
    addPage,
    deletePage,
    addImageFromFile,
    activeCanvas,
    activePageId,
    deleteActiveObject,
    fitToScreen,
    undo,
    redo,
    reorderPage,
  } = useEditor();
  const [isDragging, setIsDragging] = useState(false);

  // ---------- Drag & drop on the entire workspace ----------
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragging(false);
  }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    files.filter((f) => f.type.startsWith("image/")).forEach((f) => addImageFromFile(f));
  }, [addImageFromFile]);

  // Block the rest of the document from opening a dropped file in a new tab
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  // ---------- Auto-fit on first mount (once the first canvas is ready) ----------
  const didAutoFitRef = useRef(false);
  useEffect(() => {
    if (didAutoFitRef.current) return;
    if (!activeCanvas) return;
    const id = requestAnimationFrame(() => {
      fitToScreen();
      didAutoFitRef.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [activeCanvas, fitToScreen]);

  // ---------- Keyboard shortcuts (Delete, Undo, Redo) ----------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      
      if ((e.ctrlKey || e.metaKey) && !isInput) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          return;
        }
        if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
          return;
        }
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (isInput) return;

      if (activeCanvas?.getActiveObject()) {
        e.preventDefault();
        deleteActiveObject();
        return;
      }
      if (activePageId && pages.length > 1) {
        e.preventDefault();
        deletePage(activePageId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCanvas, deleteActiveObject, activePageId, pages.length, deletePage, undo, redo]);

  return (
    <div 
      id="canvas-root"
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[oklch(0.95_0.01_240)]"
    >
      {/* Subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 z-0"
        style={{
          backgroundImage: "radial-gradient(oklch(0.75 0.02 250) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div
        ref={scrollRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="relative z-10 flex-1 overflow-auto overscroll-contain px-4 py-12 lg:px-12"
      >
        <div className="mx-auto flex w-full flex-col items-center">
          {pages.map((page, idx) => (
            <PageBoard
              key={page.id}
              pageId={page.id}
              index={idx}
            />
          ))}

          {/* Add Page Button at the end of the vertical flow */}
          <button
            onClick={() => {
              addPage();
              setTimeout(() => {
                const scrollContainer = scrollRef.current;
                if (scrollContainer) {
                  scrollContainer.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: "smooth"
                  });
                }
              }, 100);
            }}
            className="group mt-12 mb-24 flex h-14 items-center gap-3 rounded-2xl bg-white px-8 font-bold text-[oklch(0.45_0.02_270)] shadow-lg shadow-black/5 ring-1 ring-black/5 transition-all hover:scale-105 hover:bg-[oklch(0.55_0.28_295)] hover:text-white active:scale-95"
          >
            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
            <span>Adicionar Página</span>
          </button>
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.55_0.28_295/0.08)] ring-2 ring-inset ring-[oklch(0.55_0.28_295)]">
            <div className="rounded-xl bg-white/90 px-5 py-3 text-sm font-semibold text-[oklch(0.55_0.28_295)] shadow-xl shadow-black/10">
              Solte a imagem para inserir no papel ativo
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/** A single stacked page = one Fabric canvas instance, with a 20px gap below. */
const PageBoard = memo(function PageBoard({
  pageId,
  index,
}: {
  pageId: string;
  index: number;
}) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const {
    artboard,
    zoom,
    registerPageCanvas,
    setActivePageId,
    activePageId,
    openImagePicker,
    deletePage,
    deleteActiveObject,
    getPageCanvas,
    pages,
    reorderPage,
    isMagicBrushActive,
  } = useEditor();
  const canDelete = pages.length > 1;
  const [contextMenu, setContextMenu] = useState<CtxMenuState | null>(null);

  const { w, h } = useMemo(() => {
    const nextScale = zoom / 100;
    return {
      w: Math.round(artboard.width * nextScale),
      h: Math.round(artboard.height * nextScale),
    };
  }, [artboard.width, artboard.height, zoom]);

  // Register on mount, unregister on unmount
  useEffect(() => {
    registerPageCanvas(pageId, canvasElRef.current, artboard.width, artboard.height);
    return () => registerPageCanvas(pageId, null, artboard.width, artboard.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const isActive = activePageId === pageId;

  const onAddImage = useCallback((x?: number, y?: number) => {
    setActivePageId(pageId);
    openImagePicker(x === undefined || y === undefined ? { pageId } : { pageId, x, y });
  }, [openImagePicker, pageId, setActivePageId]);

  const onContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePageId(pageId);

    const pageEl = e.currentTarget;
    const rect = pageEl.getBoundingClientRect();
    const fab = getPageCanvas(pageId);
    const z = fab?.getZoom() ?? 1;
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const ax = localX / z;
    const ay = localY / z;

    let hitObject: fabric.Object | null = null;
    if (fab) {
      const objs = fab.getObjects();
      for (let i = objs.length - 1; i >= 0; i--) {
        const obj = objs[i] as fabric.Object & { isArtboard?: boolean };
        if (obj.isArtboard) continue;
        try {
          if (obj.containsPoint({ x: ax, y: ay } as fabric.Point)) {
            hitObject = obj;
            break;
          }
        } catch {
          // fall through to the page background menu
        }
      }
      if (hitObject) fab.setActiveObject(hitObject);
    }

    setContextMenu({ x: localX, y: localY, hasObject: Boolean(hitObject), insertX: ax, insertY: ay });
  }, [getPageCanvas, pageId, setActivePageId]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  const pageStyle = useMemo(() => ({
    width: w,
    height: h,
    flexShrink: 0,
    overflow: "hidden",
    willChange: "transform, contents",
    contain: "layout paint size",
  }) satisfies CSSProperties, [w, h]);

  const onPageMouseDown = useCallback(() => setActivePageId(pageId), [pageId, setActivePageId]);
  const onDeleteMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
  }, []);
  const onDeletePageClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (canDelete) deletePage(pageId);
  }, [canDelete, deletePage, pageId]);
  const onDeleteObjectFromMenu = useCallback(() => {
    deleteActiveObject();
    setContextMenu(null);
  }, [deleteActiveObject]);
  const onAddImageFromMenu = useCallback(() => {
    if (!contextMenu) return;
    onAddImage(contextMenu.insertX, contextMenu.insertY);
    setContextMenu(null);
  }, [contextMenu, onAddImage]);
  const onDeletePageFromMenu = useCallback(() => {
    setContextMenu(null);
    if (canDelete) deletePage(pageId);
  }, [canDelete, deletePage, pageId]);

  return (
    // Outer wrapper: fixed-shrink so it never collapses, centered on the
    // workspace's central axis, 20px gap below.
    <div
      className="flex flex-col items-center"
      style={{ flexShrink: 0, marginBottom: 20 }}
        onMouseDown={onPageMouseDown}
    >
      {/* Floating Controls above each page */}
      <div className="mb-3 flex items-center gap-1.5 whitespace-nowrap">
        <div className="flex items-center gap-1 rounded-full border border-black/5 bg-white/90 p-1 shadow-md backdrop-blur-sm ring-1 ring-black/5">
          <button
            onClick={() => reorderPage(pageId, "up")}
            disabled={index === 0}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[oklch(0.45_0.02_270)] transition-colors hover:bg-[oklch(0.55_0.28_295/0.1)] hover:text-[oklch(0.55_0.28_295)] disabled:opacity-20"
            title="Mover para cima"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          
          <div className="flex h-7 items-center px-3 text-[10px] font-black uppercase tracking-tighter text-[oklch(0.45_0.02_270)]">
            Pág {index + 1}
          </div>

          <button
            onClick={() => reorderPage(pageId, "down")}
            disabled={index === pages.length - 1}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[oklch(0.45_0.02_270)] transition-colors hover:bg-[oklch(0.55_0.28_295/0.1)] hover:text-[oklch(0.55_0.28_295)] disabled:opacity-20"
            title="Mover para baixo"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {canDelete && (
            <>
              <div className="mx-0.5 h-4 w-px bg-black/5" />
              <button
                onClick={onDeletePageClick}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[oklch(0.45_0.18_25)] transition-colors hover:bg-[oklch(0.45_0.18_25/0.1)] hover:text-[oklch(0.45_0.18_25)]"
                title="Excluir página"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* The actual paper — fixed dimensions, hidden overflow so nothing leaks
          out of the artboard rectangle. */}
      <div
        id={isActive ? "canvas-workspace" : undefined}
        data-page-id={pageId}
        onContextMenu={onContextMenu}
        className={
          "relative bg-white transition-shadow " +
          (isActive
            ? "shadow-[0_18px_50px_-12px_oklch(0.55_0.28_295/0.45)] ring-2 ring-[var(--neon-violet)]/50"
            : "shadow-[0_12px_40px_-12px_oklch(0.2_0.05_270/0.35)]")
        }
        style={pageStyle}
      >
        <canvas ref={canvasElRef} />
        {/* Superior Overlay Canvas for Magic Brush */}
        {isActive && isMagicBrushActive && (
          <OverlayPaintCanvas pageId={pageId} width={w} height={h} />
        )}
        <PageEmptyCTA pageId={pageId} onAddImage={onAddImage} />

        {contextMenu && (
          <div
            style={{ left: contextMenu.x, top: contextMenu.y, position: "absolute" }}
            onMouseDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            className="z-50 min-w-[200px] overflow-hidden rounded-lg border border-[var(--neon-violet)]/40 bg-[oklch(0.18_0.03_280)]/95 shadow-[0_10px_30px_oklch(0.55_0.28_295/0.35),0_0_0_1px_oklch(0.55_0.28_295/0.15)] backdrop-blur-md"
          >
            {contextMenu.hasObject ? (
              <button
                type="button"
                onClick={onDeleteObjectFromMenu}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[oklch(0.85_0.18_25)] transition-colors hover:bg-[oklch(0.5_0.22_25)]/20 hover:text-[oklch(0.92_0.2_25)]"
              >
                <Trash2 className="h-4 w-4" />
                Deletar Imagem
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={false}
                  onClick={onAddImageFromMenu}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[oklch(0.95_0.01_280)] transition-colors hover:bg-[var(--neon-violet)]/20 hover:text-[var(--neon-violet)]"
                >
                  <ImagePlus className="h-4 w-4 text-[var(--neon-violet)]" />
                  Adicionar Imagem
                </button>
                <div className="h-px bg-[var(--neon-violet)]/20" />
                <button
                  type="button"
                  disabled={!canDelete}
                  onClick={onDeletePageFromMenu}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[oklch(0.85_0.18_25)] transition-colors hover:bg-[oklch(0.5_0.22_25)]/20 hover:text-[oklch(0.92_0.2_25)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  title={canDelete ? "Deletar esta página" : "Não é possível excluir a única página"}
                >
                  <Trash2 className="h-4 w-4" />
                  Deletar Página
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * The "+ Adicionar Imagem" CTA — lives INSIDE its own page, absolutely
 * positioned only relative to that page's paper. Disappears as soon as the
 * page has at least one non-artboard object.
 */
const PageEmptyCTA = memo(function PageEmptyCTA({
  pageId,
  onAddImage,
}: {
  pageId: string;
  onAddImage: () => void;
}) {
  const { getPageCanvas } = useEditor();
  const [hasObjects, setHasObjects] = useState(false);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);

  // The page's Fabric canvas is created in an effect on PageBoard mount, so on
  // the very first render it might not exist yet. Poll on rAF until ready.
  useEffect(() => {
    let cancelled = false;
    const tryFind = () => {
      if (cancelled) return;
      const found = getPageCanvas(pageId);
      if (found) setCanvas(found);
      else requestAnimationFrame(tryFind);
    };
    tryFind();
    return () => {
      cancelled = true;
    };
  }, [pageId, getPageCanvas]);

  useEffect(() => {
    if (!canvas) return;
    const update = () => {
      const count = canvas
        .getObjects()
        .filter((o) => !(o as fabric.Object & { isArtboard?: boolean }).isArtboard).length;
      setHasObjects(count > 0);
    };
    update();
    canvas.on("object:added", update);
    canvas.on("object:removed", update);
    return () => {
      canvas.off("object:added", update);
      canvas.off("object:removed", update);
    };
  }, [canvas]);

  const { addImageFromFile, setActivePageId } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setActivePageId(pageId);
      await addImageFromFile(file, { pageId });
    }
    e.target.value = "";
  }, [pageId, setActivePageId, addImageFromFile]);

  if (hasObjects) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleClick}
        className="pointer-events-auto group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[oklch(0.7_0.05_280)] bg-white/70 px-8 py-6 text-[var(--background)] backdrop-blur-sm transition-all hover:border-[var(--neon-violet)] hover:bg-white/90 hover:shadow-[0_0_24px_oklch(0.55_0.28_295/0.35)]"
      >
        <ImagePlus className="h-7 w-7 text-[var(--neon-violet)]" />
        <span className="text-sm font-semibold">+ Adicionar Imagem</span>
        <span className="text-xs text-[oklch(0.45_0.02_270)]">
          Clique ou arraste uma imagem para este papel
        </span>
      </button>
    </div>
  );
});

/**
 * OverlayPaintCanvas: A physical canvas that sits on top of everything
 * (z-index 50) and handles the "Magic Brush" drawing logic.
 */
const OverlayPaintCanvas = memo(function OverlayPaintCanvas({ 
  pageId, 
  width, 
  height 
}: { 
  pageId: string; 
  width: number; 
  height: number; 
}) {
  const { isMagicBrushActive, brushSize, getPageCanvas } = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleClear = () => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, width, height);
    };
    window.addEventListener("magic-brush:clear", handleClear);
    return () => window.removeEventListener("magic-brush:clear", handleClear);
  }, [width, height]);

  useEffect(() => {
    if (!canvasRef.current || !isMagicBrushActive) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    contextRef.current = ctx;
  }, [isMagicBrushActive]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isMagicBrushActive || !contextRef.current) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const z = (getPageCanvas(pageId)?.getZoom() ?? 100) / 100;
    const x = (e.clientX - rect.left) / z;
    const y = (e.clientY - rect.top) / z;
    
    setIsDrawing(true);
    
    const ctx = contextRef.current;
    ctx.strokeStyle = "#0000FF";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.4;
    ctx.shadowBlur = 0; // Remove blur for clean selection
    
    ctx.beginPath();
    ctx.moveTo(x * z, y * z);
  }, [isMagicBrushActive, brushSize, pageId, getPageCanvas]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const z = (getPageCanvas(pageId)?.getZoom() ?? 100) / 100;
    const x = (e.clientX - rect.left) / z;
    const y = (e.clientY - rect.top) / z;
    setMousePos({ x: x * z, y: y * z });

    if (!isDrawing || !contextRef.current) return;
    
    const ctx = contextRef.current;
    ctx.lineTo(x * z, y * z);
    ctx.stroke();
  }, [isDrawing, pageId, getPageCanvas]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    if (contextRef.current) {
      contextRef.current.closePath();
    }
  }, []);

  if (!isMagicBrushActive) return null;

  return (
    <div className="absolute inset-0 z-[50] pointer-events-auto overflow-hidden">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="cursor-none"
        style={{ width, height }}
      />
      {mousePos && (
        <div 
          className="pointer-events-none absolute border-2 border-[#0000FF] rounded-full"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            width: brushSize,
            height: brushSize,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </div>
  );
});
