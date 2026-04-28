import { memo, useState } from "react";
import { 
  X, 
  Image, 
  FileJson, 
  FileText, 
  Video, 
  Film,
  Download,
  Loader2,
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { useEditor } from "./editor-context";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
}

type ExportFormat = "jpg" | "png" | "pdf" | "webp" | "mp4" | "gif";

export const ExportModal = memo(function ExportModal({ open, onOpenChange, projectName }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<string>("");
  const { activePageId, getPageCanvas } = useEditor();

  const handleExport = async (format: ExportFormat) => {
    try {
      console.log(`[EXPORT] Solicitado formato: ${format}`);
      
      // 1. Localizar o Canvas e Desativar Seleção
      const canvas = activePageId ? getPageCanvas(activePageId) : null;
      if (!canvas) {
        console.warn("[EXPORT] Canvas fabric instance not found for ID:", activePageId);
        toast.error("Ocorreu um problema ao acessar o design.");
        return;
      }
      
      canvas.discardActiveObject();
      canvas.requestRenderAll();

      setIsExporting(true);
      setProgress(10);
      setExportStatus(`Isolando área do design...`);

      // 2. Alvo Estrito: Elemento com ID estável 'canvas-workspace'
      let activePageElement = document.getElementById('canvas-workspace');
      
      // Fallback para o data-page-id caso o ID não esteja no DOM ainda
      if (!activePageElement && activePageId) {
        activePageElement = document.querySelector(`[data-page-id="${activePageId}"]`) as HTMLElement;
      }
      
      if (!activePageElement) {
        console.error("[EXPORT] DOM element for canvas not found ('canvas-workspace')");
        toast.error("Erro técnico: Elemento do Canvas não encontrado.");
        setIsExporting(false);
        return;
      }

      // 3. Garantir ocultação de controles (molduras roxas) via CSS temporário
      const targetId = activePageElement.id || `temp-export-${activePageId}`;
      if (!activePageElement.id) activePageElement.id = targetId;

      const style = document.createElement('style');
      style.innerHTML = `
        #${targetId} .upper-canvas { display: none !important; }
        #${targetId} { border: none !important; outline: none !important; box-shadow: none !important; ring: 0 !important; }
      `;
      document.head.appendChild(style);
      
      // Pequeno delay para renderização e garantir que o CSS acima foi aplicado
      await new Promise(r => setTimeout(r, 150));
      
      setProgress(40);
      setExportStatus("Gerando imagem em alta definição...");

      const options = {
        pixelRatio: 2, // 2x Escala solicitada
        backgroundColor: "#ffffff",
        width: activePageElement.clientWidth,
        height: activePageElement.clientHeight,
        style: {
          transform: 'none',
          margin: '0',
          padding: '0'
        }
      };

      const fileName = `${projectName.trim() || "Design_Canvito"}.${format === 'pdf' ? 'pdf' : format}`;
      let output: Blob | string = "";
      
      // 4. Captura Real
      if (format === "png") {
        output = await htmlToImage.toBlob(activePageElement, options) as Blob;
      } else if (format === "jpg") {
        output = await htmlToImage.toBlob(activePageElement, { ...options, quality: 0.95, type: 'image/jpeg' }) as Blob;
      } else if (format === "webp") {
        output = await htmlToImage.toBlob(activePageElement, { ...options, type: 'image/webp' }) as Blob;
      } else if (format === "pdf") {
        const dataUrl = await htmlToImage.toPng(activePageElement, options);
        const pdf = new jsPDF({
          orientation: activePageElement.clientWidth > activePageElement.clientHeight ? "landscape" : "portrait",
          unit: "px",
          format: [activePageElement.clientWidth * 2, activePageElement.clientHeight * 2]
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, activePageElement.clientWidth * 2, activePageElement.clientHeight * 2);
        output = pdf.output('blob');
      }

      // Limpeza do estilo
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }

      setProgress(90);
      setExportStatus("Disparando download...");

      // 5. Download via Blob + Link Nativo (Salvar Como)
      const url = typeof output === 'string' ? output : URL.createObjectURL(output);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (typeof output !== 'string') URL.revokeObjectURL(url);

      setProgress(100);
      setExportStatus("Concluído!");
      toast.success(`Download de ${format.toUpperCase()} iniciado!`);
      
      setTimeout(() => {
        onOpenChange(false);
        setIsExporting(false);
        setProgress(0);
      }, 500);

    } catch (error: any) {
      console.error("[EXPORT] Falha na exportação:", error);
      toast.error("Erro ao exportar. Verifique o console para mais detalhes.");
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#1A1625] p-0 text-white shadow-[0_0_50px_oklch(0.55_0.28_295/0.3)] sm:max-w-[500px]">
        <div className="relative overflow-hidden p-6">
          {/* Cyberpunk background elements */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--neon-pink)] opacity-10 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[var(--neon-cyan)] opacity-10 blur-[80px]" />
          
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold tracking-tight text-white">
              Exportar Design
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Escolha o formato ideal para o seu projeto
            </DialogDescription>
          </DialogHeader>

          {isExporting ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-6">
                <Loader2 className="h-16 w-16 animate-spin text-[var(--neon-cyan)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{progress}%</span>
                </div>
              </div>
              <p className="text-sm font-medium text-[var(--neon-cyan)] animate-pulse uppercase tracking-widest">
                {exportStatus}
              </p>
              <div className="mt-8 h-1 w-full max-w-[300px] overflow-hidden rounded-full bg-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-cyan)] transition-all duration-300 shadow-[0_0_10px_var(--neon-cyan)]" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <ExportOption 
                icon={Image} 
                label="PNG" 
                sublabel="Alta Qualidade" 
                onClick={() => handleExport("png")} 
              />
              <ExportOption 
                icon={Image} 
                label="JPG" 
                sublabel="Arquivo Leve" 
                onClick={() => handleExport("jpg")} 
              />
              <ExportOption 
                icon={FileText} 
                label="PDF" 
                sublabel="Documento" 
                onClick={() => handleExport("pdf")} 
              />
              <ExportOption 
                icon={FileJson} 
                label="WebP" 
                sublabel="Otimizado Web" 
                onClick={() => handleExport("webp")} 
              />
              <ExportOption 
                icon={Video} 
                label="MP4" 
                sublabel="Vídeo (5s)" 
                experimental
                onClick={() => handleExport("mp4")} 
              />
              <ExportOption 
                icon={Film} 
                label="GIF" 
                sublabel="Animado" 
                experimental
                onClick={() => handleExport("gif")} 
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

function ExportOption({ 
  icon: Icon, 
  label, 
  sublabel, 
  onClick, 
  experimental,
  disabled 
}: { 
  icon: any; 
  label: string; 
  sublabel: string; 
  onClick: () => void;
  experimental?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:border-[var(--neon-cyan)]/50 hover:bg-white/10 disabled:opacity-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] transition-transform group-hover:scale-110 group-hover:shadow-[0_0_15px_oklch(0.65_0.15_180/0.4)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{label}</span>
          {experimental && (
            <span className="rounded-full bg-[var(--neon-pink)]/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--neon-pink)] uppercase tracking-tighter">
              Beta
            </span>
          )}
        </div>
        <p className="truncate text-[10px] text-white/40 uppercase tracking-widest">{sublabel}</p>
      </div>
      <Download className="absolute bottom-4 right-4 h-3 w-3 text-white/20 transition-all group-hover:text-[var(--neon-cyan)]" />
    </button>
  );
}