import { X, Search } from "lucide-react";
import { memo, useCallback } from "react";
import { TOOLS, type ToolId } from "./Sidebar";
import { useEditor } from "./editor-context";

const PANEL_CONTENT: Record<ToolId, { title: string; description: string; items: string[] }> = {
  "removedor-objetos": {
    title: "Removedor de Objetos",
    description: "Pinte sobre o que deseja remover.",
    items: ["Pincel mágico", "Laço inteligente", "Auto-detecção"],
  },
  elementos: {
    title: "Elementos",
    description: "Formas, ícones e gráficos.",
    items: ["Formas", "Linhas", "Ícones", "Adesivos", "Gráficos", "Frames", "Grelhas", "Tabelas"],
  },
  texto: {
    title: "Texto",
    description: "Adicione tipografia ao seu design.",
    items: ["Adicionar título", "Subtítulo", "Texto corpo", "Combinações"],
  },
  uploads: {
    title: "Uploads",
    description: "Suas imagens e arquivos.",
    items: ["Carregar arquivos", "Imagens", "Vídeos", "Áudio"],
  },
  marcacao: {
    title: "Marcação",
    description: "Sua identidade visual.",
    items: ["Logos", "Paleta de cores", "Fontes da marca"],
  },
  "removedor-fundo": {
    title: "Removedor de Fundo",
    description: "Remova fundos com um clique.",
    items: ["Auto remover", "Refinar bordas", "Substituir fundo"],
  },
  backgrounds: {
    title: "Backgrounds",
    description: "Texturas e gradientes.",
    items: ["Cores sólidas", "Gradientes", "Padrões", "Texturas", "Fotos"],
  },
  editar: {
    title: "Editar",
    description: "Ajustes de imagem.",
    items: ["Brilho", "Contraste", "Saturação", "Filtros", "Efeitos"],
  },
  "ia-magica": {
    title: "IA Mágica",
    description: "Crie com inteligência artificial.",
    items: ["Gerar imagem", "Expandir tela", "Variações", "Estilizar", "Upscale"],
  },
};

export const SidePanel = memo(function SidePanel({
  active,
  onClose,
}: {
  active: ToolId | null;
  onClose: () => void;
}) {
  const handleClose = useCallback(() => onClose(), [onClose]);
  if (!active) return null;
  const content = PANEL_CONTENT[active];
  const tool = TOOLS.find((t) => t.id === active);
  if (!tool) return null;
  const Icon = tool.icon;

  return (
    <div className="relative z-40 flex h-full w-[min(16rem,calc(100vw-56px))] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[var(--panel)] text-white shadow-panel animate-in slide-in-from-left-4 duration-200 md:w-80">
      <div className="flex items-start justify-between gap-2 border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-neon-glow shadow-neon">
            <Icon className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide">{content.title}</h2>
            <p className="text-xs text-white/60">{content.description}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-white/10 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
          <input
            placeholder="Pesquisar..."
            className="w-full rounded-md bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none ring-1 ring-white/10 transition-all placeholder:text-white/40 focus:ring-[var(--electric-blue)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {content.items.map((item) => (
            <PanelItem key={item} item={item} activeToolId={active} />
          ))}
        </div>
      </div>
    </div>
  );
});

const PanelItem = memo(function PanelItem({ 
  item, 
  activeToolId 
}: { 
  item: string;
  activeToolId: ToolId | null;
}) {
  const isMagicBrush = activeToolId === "removedor-objetos" && item === "Pincel mágico";

  return (
    <div className="flex flex-col gap-3">
      <button className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-[var(--electric-blue)]/60 hover:bg-white/10 hover:shadow-[0_0_16px_oklch(0.62_0.24_255/0.25)]">
        <div className="flex h-full flex-col justify-end">
          <span className="text-xs font-medium text-white/90">{item}</span>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--neon-violet)]/0 to-[var(--electric-blue)]/0 opacity-0 transition-opacity group-hover:opacity-30" />
      </button>

      {isMagicBrush && (
        <MagicBrushSettings />
      )}
    </div>
  );
});

const MagicBrushSettings = () => {
  const { brushSize, setBrushSize } = useEditor();
  
  return (
    <div className="col-span-2 mt-2 rounded-lg bg-white/5 p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-medium text-white/70">Tamanho do Pincel</label>
        <span className="text-[10px] font-mono text-[var(--neon-pink)] bg-[var(--neon-pink)]/10 px-1.5 py-0.5 rounded border border-[var(--neon-pink)]/20">
          {brushSize}px
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="100"
        value={brushSize}
        onChange={(e) => setBrushSize(parseInt(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--neon-pink)] hover:bg-white/20 transition-all"
      />
      <div className="mt-4 flex flex-col gap-2">
        <p className="text-[10px] text-white/40 leading-relaxed italic">
          Pinte sobre a imagem para marcar os objetos que deseja remover. A seleção aparecerá em Roxo Neon transparente.
        </p>
      </div>
    </div>
  );
};
