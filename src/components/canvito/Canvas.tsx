import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
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
    // Defer one frame so the workspace has its final measured size
    const id = requestAnimationFrame(() => {
      fitToScreen();
      didAutoFitRef.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [activeCanvas, fitToScreen]);

  // ---------- Keyboard delete (Delete / Backspace) ----------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      // Object selected? -> delete the object (existing behavior).
      if (activeCanvas?.getActiveObject()) {
        e.preventDefault();
        deleteActiveObject();
        return;
      }
      // No selection? -> delete the active page (only if more than one exists).
      if (activePageId && pages.length > 1) {
        e.preventDefault();
        deletePage(activePageId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCanvas, deleteActiveObject, activePageId, pages.length, deletePage]);

  return (
    <div className="relative flex flex-1 flex-col bg-[var(--canvas-bg)]">
      {/* Subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(oklch(0.75 0.02 250) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Workspace = vertically scrollable stack */}
      <div
        ref={scrollRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="relative flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="flex flex-col items-center px-4 py-10">
          {pages.map((page, idx) => (
            <PageBoard
              key={page.id}
              pageId={page.id}
              index={idx}
            />
          ))}

          {/* "+ Adicionar página" — directly below the last sheet */}
          <div className="mt-2 mb-10 flex justify-center">
            <button
              type="button"
              onClick={addPage}
              className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.85_0.01_270)] bg-white px-4 py-2 text-sm font-medium text-[var(--background)] shadow-sm transition-all hover:border-[var(--neon-violet)] hover:text-[var(--neon-violet)] hover:shadow-[0_0_16px_oklch(0.55_0.28_295/0.25)]"
            >
              <Plus className="h-4 w-4" />
              Adicionar página
            </button>
          </div>
        </div>
        {/* Drag overlay */}
        {isDragging && (
          <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[oklch(0.55_0.28_295/0.08)] ring-2 ring-inset ring-[var(--neon-violet)]">
            <div className="rounded-xl bg-white/90 px-5 py-3 text-sm font-semibold text-[var(--neon-violet)] shadow-[0_0_24px_oklch(0.55_0.28_295/0.4)]">
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
  } = useEditor();
  const canDelete = pages.length > 1;
  const [contextMenu, setContextMenu] = useState<CtxMenuState | null>(null);

  const { scale, w, h } = useMemo(() => {
    const nextScale = zoom / 100;
    return {
      scale: nextScale,
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
  }) satisfies React.CSSProperties, [w, h]);

  return (
    // Outer wrapper: fixed-shrink so it never collapses, centered on the
    // workspace's central axis, 20px gap below.
    <div
      className="flex flex-col items-center"
      style={{ flexShrink: 0, marginBottom: 20 }}
      onMouseDown={() => setActivePageId(pageId)}
    >
      {/* Page label + delete button */}
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[oklch(0.45_0.02_270)]">
        <span
          className={
            "rounded-full border px-2.5 py-0.5 transition-colors " +
            (isActive
              ? "border-[var(--neon-violet)] bg-[oklch(0.55_0.28_295/0.08)] text-[var(--neon-violet)]"
              : "border-[oklch(0.85_0.01_270)] bg-white/70 text-[oklch(0.45_0.02_270)]")
          }
        >
          Página {index + 1}
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (!canDelete) return;
            deletePage(pageId);
          }}
          disabled={!canDelete}
          title={canDelete ? "Excluir esta página" : "Não é possível excluir a única página"}
          aria-label="Excluir página"
          className={
            "inline-flex h-6 w-6 items-center justify-center rounded-full border transition-all " +
            (canDelete
              ? "cursor-pointer border-[oklch(0.85_0.01_270)] bg-white/80 text-[oklch(0.45_0.18_25)] hover:border-[oklch(0.55_0.22_25)] hover:bg-[oklch(0.97_0.02_25)] hover:text-[oklch(0.45_0.22_25)]"
              : "cursor-not-allowed border-[oklch(0.9_0.005_270)] bg-white/40 text-[oklch(0.75_0.01_270)] opacity-60")
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* The actual paper — fixed dimensions, hidden overflow so nothing leaks
          out of the artboard rectangle. */}
      <div
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
                onClick={() => {
                  deleteActiveObject();
                  setContextMenu(null);
                }}
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
                  onClick={() => {
                    onAddImage(contextMenu.insertX, contextMenu.insertY);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[oklch(0.95_0.01_280)] transition-colors hover:bg-[var(--neon-violet)]/20 hover:text-[var(--neon-violet)]"
                >
                  <ImagePlus className="h-4 w-4 text-[var(--neon-violet)]" />
                  Adicionar Imagem
                </button>
                <div className="h-px bg-[var(--neon-violet)]/20" />
                <button
                  type="button"
                  disabled={!canDelete}
                  onClick={() => {
                    setContextMenu(null);
                    if (canDelete) deletePage(pageId);
                  }}
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

  if (hasObjects) return null;

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onAddImage();
  }, [onAddImage]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
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
