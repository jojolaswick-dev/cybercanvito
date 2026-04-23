import {
  Eraser,
  Shapes,
  Type,
  Upload,
  PenLine,
  ImageMinus,
  Image as ImageIcon,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ToolId =
  | "removedor-objetos"
  | "elementos"
  | "texto"
  | "uploads"
  | "marcacao"
  | "removedor-fundo"
  | "backgrounds"
  | "editar"
  | "ia-magica";

export const TOOLS: { id: ToolId; label: string; icon: LucideIcon; magic?: boolean }[] = [
  { id: "removedor-objetos", label: "Removedor de Objetos", icon: Eraser },
  { id: "elementos", label: "Elementos", icon: Shapes },
  { id: "texto", label: "Texto", icon: Type },
  { id: "uploads", label: "Uploads", icon: Upload },
  { id: "marcacao", label: "Marcação", icon: PenLine },
  { id: "removedor-fundo", label: "Removedor de Fundo", icon: ImageMinus },
  { id: "backgrounds", label: "Backgrounds", icon: ImageIcon },
  { id: "editar", label: "Editar", icon: SlidersHorizontal },
  { id: "ia-magica", label: "IA Mágica", icon: Sparkles, magic: true },
];

export function Sidebar({
  active,
  onSelect,
}: {
  active: ToolId | null;
  onSelect: (id: ToolId) => void;
}) {
  return (
    <aside className="relative z-20 flex w-[88px] flex-col items-stretch gap-1 border-r border-white/10 bg-cyber-bar py-3">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[var(--electric-blue)] to-transparent opacity-50" />

      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = active === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onSelect(tool.id)}
            className={`group relative mx-1.5 flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 transition-all ${
              isActive
                ? "bg-white/15 text-white"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--neon-pink)] shadow-[0_0_10px_var(--neon-pink)]" />
            )}
            <div className="relative">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              {tool.magic && (
                <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_6px_var(--neon-cyan)]" />
              )}
            </div>
            <span className="text-center text-[10px] font-medium leading-tight">
              {tool.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
