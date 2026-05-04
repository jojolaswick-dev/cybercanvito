import { X, Search, Sparkles, Scissors, Scan, Trash2, ArrowLeft, Wand2, Image as ImageIcon, Video, Music, Shapes as ShapesIcon } from "lucide-react";
import { memo, useCallback, useState, useMemo, useEffect } from "react";
import { SHAPES } from "./shapes-library";
import { toast } from "sonner";
import { TOOLS, type ToolId } from "./Sidebar";
import { useEditor } from "./editor-context";
import { PainelTexto } from "./PainelTexto";

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
    items: ["Imagens", "Vídeos", "Áudio"],
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
  const [searchQuery, setSearchQuery] = useState("");
  const { uploadedFiles, addImageFromSource, addVideoFromSource } = useEditor();

  const handleClose = useCallback(() => onClose(), [onClose]);
  
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return uploadedFiles;
    return uploadedFiles.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [uploadedFiles, searchQuery]);

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none ring-1 ring-white/10 transition-all placeholder:text-white/40 focus:ring-[var(--electric-blue)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {active === "texto" ? (
          <PainelTexto />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-2">
              {content.items.map((item) => (
                <PanelItem key={item} item={item} activeToolId={active} />
              ))}
            </div>

            {active === "uploads" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Arquivos Recentes</h3>
                  <span className="text-[10px] text-white/30">{filteredFiles.length} arquivos</span>
                </div>
                
                {filteredFiles.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {filteredFiles.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => {
                          if (file.type === "image") {
                            addImageFromSource(file.url, undefined, file.name, true);
                          } else {
                            addVideoFromSource(file.url);
                          }
                        }}
                        className="group relative aspect-square overflow-hidden rounded-md border border-white/10 bg-white/5 transition-all hover:border-[var(--electric-blue)] hover:bg-white/10"
                      >
                        {file.type === "image" ? (
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-black/20">
                            {file.type === "video" ? (
                              <>
                                <video 
                                  src={file.url} 
                                  className="h-full w-full object-cover opacity-60 transition-opacity group-hover:opacity-100"
                                  onMouseOver={(e) => e.currentTarget.play()}
                                  onMouseOut={(e) => {
                                    e.currentTarget.pause();
                                    e.currentTarget.currentTime = 0;
                                  }}
                                  muted
                                  loop
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Video className="h-5 w-5 text-white shadow-lg" />
                                </div>
                              </>
                            ) : (
                              <Music className="h-5 w-5 text-white/40" />
                            )}
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="text-[10px] font-bold text-white">
                            {file.type === "image" ? "ADICIONAR" : "VER"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 py-8 text-center">
                    <ImageIcon className="mb-2 h-8 w-8 text-white/10" />
                    <p className="px-4 text-[10px] text-white/40 uppercase tracking-wider">
                      {searchQuery ? "Nenhum arquivo encontrado" : "Nenhum arquivo carregado ainda"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
  const { isMagicBrushActive, setIsMagicBrushActive, openImagePicker } = useEditor();
  const isMagicBrush = activeToolId === "removedor-objetos" && item === "Pincel mágico";
  const isUploadImagens = activeToolId === "uploads" && item === "Imagens";
  const isUploadVideos = activeToolId === "uploads" && item === "Vídeos";

  const handleClick = () => {
    if (isMagicBrush) {
      setIsMagicBrushActive(!isMagicBrushActive);
    } else if (isUploadImagens) {
      openImagePicker();
    } else if (isUploadVideos) {
      openImagePicker(undefined, "video");
    }
  };

  return (
    <div className={isMagicBrush ? "col-span-2 flex flex-col gap-3" : "flex flex-col gap-2"}>
      <button 
        onClick={handleClick}
        className={`group relative flex flex-col items-center justify-center gap-2 rounded-lg border p-3 transition-all ${
          isMagicBrush && isMagicBrushActive 
            ? "border-[var(--neon-pink)] bg-[var(--neon-pink)]/10 shadow-[0_0_12px_oklch(0.55_0.28_295/0.2)]" 
            : "border-white/10 bg-white/5 hover:border-[var(--electric-blue)]/60 hover:bg-white/10"
        }`}
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${isMagicBrush && isMagicBrushActive ? "text-[var(--neon-pink)]" : "text-white/70 group-hover:text-white"}`}>
          {item === "Pincel mágico" && <Sparkles className="h-5 w-5" />}
          {item === "Laço inteligente" && <Scissors className="h-5 w-5" />}
          {item === "Auto-detecção" && <Scan className="h-5 w-5" />}
          {item === "Imagens" && <ImageIcon className="h-5 w-5" />}
          {item === "Vídeos" && <Video className="h-5 w-5" />}
          {item === "Áudio" && <Music className="h-5 w-5" />}
          {!["Pincel mágico", "Laço inteligente", "Auto-detecção", "Imagens", "Vídeos", "Áudio"].includes(item) && <div className="h-5 w-5 rounded-full border border-current opacity-20" />}
        </div>
        <span className={`text-[10px] font-medium uppercase tracking-wider ${isMagicBrush && isMagicBrushActive ? "text-white" : "text-white/60 group-hover:text-white/90"}`}>
          {item}
        </span>
      </button>

      {isMagicBrush && isMagicBrushActive && (
        <MagicBrushSettings />
      )}
    </div>
  );
});

const MagicBrushSettings = () => {
  const { brushSize, setBrushSize, clearMagicBrush, applyMagicRemoval, setIsMagicBrushActive, isProcessingMagic } = useEditor();
  
  return (
    <div className="mt-1 flex flex-col gap-4 rounded-lg bg-white/5 p-4 border border-white/10">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tamanho do Pincel</label>
          <span className="text-[10px] font-mono text-[var(--neon-pink)]">
            {brushSize}px
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--neon-pink)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => applyMagicRemoval()}
          disabled={isProcessingMagic}
          className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-gradient-to-r from-[var(--neon-violet)] to-[var(--neon-pink)] py-2.5 text-xs font-bold text-white shadow-[0_0_15px_oklch(0.55_0.28_295/0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] ${isProcessingMagic ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <Wand2 className={`h-3.5 w-3.5 ${isProcessingMagic ? 'animate-spin' : ''}`} />
          <span>{isProcessingMagic ? 'PROCESSANDO...' : 'REMOVER OBJETOS'}</span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
        </button>

        <div className="flex gap-2">
          <button
            onClick={clearMagicBrush}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 py-2 text-[10px] font-bold uppercase tracking-wider text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Trash2 className="h-3 w-3" />
            Limpar
          </button>
          <button
            onClick={() => setIsMagicBrushActive(false)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 py-2 text-[10px] font-bold uppercase tracking-wider text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};
