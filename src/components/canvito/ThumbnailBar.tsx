import { ChevronDown, Plus, X } from "lucide-react";
import { useEditor } from "./editor-context";

export function ThumbnailBar() {
  const { pages, activePageId, selectPage, addPage, removePage, artboard, showThumbnails } =
    useEditor();

  if (!showThumbnails) return null;

  // Mirror the artboard aspect ratio so thumbnails feel "real"
  const ratio = artboard.width / artboard.height;
  const THUMB_HEIGHT = 72;
  const thumbWidth = Math.round(THUMB_HEIGHT * ratio);

  return (
    <div className="relative z-20 flex shrink-0 items-center gap-3 border-t border-white/5 bg-[var(--canvas-bg)] px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.45_0.02_270)]">
        Páginas
      </span>

      <div className="flex flex-1 items-center gap-2 overflow-x-auto">
        {pages.map((page, idx) => {
          const isActive = page.id === activePageId;
          return (
            <div key={page.id} className="group relative shrink-0">
              <button
                type="button"
                onClick={() => selectPage(page.id)}
                style={{ width: thumbWidth, height: THUMB_HEIGHT }}
                className={`relative overflow-hidden rounded-md bg-white transition-all ${
                  isActive
                    ? "shadow-[0_0_0_2px_#7D2AE8,0_4px_12px_rgba(125,42,232,0.25)]"
                    : "border border-[oklch(0.85_0.01_270)] hover:border-[oklch(0.7_0.05_280)]"
                }`}
                aria-label={`Página ${idx + 1}`}
                aria-current={isActive}
              >
                {page.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.thumbnail}
                    alt={`Pré-visualização da página ${idx + 1}`}
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <div className="h-full w-full bg-white" />
                )}
                <span
                  className={`absolute bottom-1 left-1.5 rounded px-1 text-[10px] font-bold leading-tight ${
                    isActive ? "text-[#7D2AE8]" : "text-[oklch(0.35_0.02_270)]"
                  }`}
                >
                  {idx + 1}
                </span>
              </button>

              {pages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePage(page.id);
                  }}
                  className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-[var(--background)] text-white shadow-md ring-2 ring-[var(--canvas-bg)] hover:bg-[var(--neon-violet)] group-hover:flex"
                  aria-label={`Remover página ${idx + 1}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        <div className="flex shrink-0 items-stretch">
          <button
            type="button"
            onClick={addPage}
            style={{ height: THUMB_HEIGHT }}
            className="flex w-12 items-center justify-center rounded-l-md border border-[oklch(0.85_0.01_270)] bg-white text-[oklch(0.35_0.02_270)] transition-colors hover:border-[var(--neon-violet)] hover:text-[var(--neon-violet)]"
            aria-label="Adicionar página"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            style={{ height: THUMB_HEIGHT }}
            className="flex w-7 items-center justify-center rounded-r-md border border-l-0 border-[oklch(0.85_0.01_270)] bg-white text-[oklch(0.35_0.02_270)] transition-colors hover:border-[var(--neon-violet)] hover:text-[var(--neon-violet)]"
            aria-label="Mais opções"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
