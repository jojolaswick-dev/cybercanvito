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
import { memo, useCallback } from "react";
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

export const Sidebar = memo(function Sidebar({
  active,
  onSelect,
}: {
  active: ToolId | null;
  onSelect: (id: ToolId) => void;
}) {
  return (
    <aside className="sticky top-14 z-20 flex w-[88px] h-[calc(100dvh-56px)] flex-col items-stretch gap-1 border-r border-white/10 bg-cyber-bar py-3">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[var(--electric-blue)] to-transparent opacity-50" />

      {TOOLS.map((tool) => (
        <SidebarItem key={tool.id} tool={tool} active={active === tool.id} onSelect={onSelect} />
      ))}
    </aside>
  );
});

const SidebarItem = memo(function SidebarItem({
  tool,
  active,
  onSelect,
}: {
  tool: { id: ToolId; label: string; icon: LucideIcon; magic?: boolean };
  active: boolean;
  onSelect: (id: ToolId) => void;
}) {
  const Icon = tool.icon;
  const handleSelect = useCallback(() => onSelect(tool.id), [onSelect, tool.id]);

  return (
    <button
      onClick={handleSelect}
      className={`group relative mx-1.5 flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 transition-all ${
        active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--neon-pink)] shadow-[0_0_10px_var(--neon-pink)]" />
      )}
      <div className="relative">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
        {tool.magic && (
          <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_6px_var(--neon-cyan)]" />
        )}
      </div>
      <span className="text-center text-[10px] font-medium leading-tight">{tool.label}</span>
    </button>
  );
});
