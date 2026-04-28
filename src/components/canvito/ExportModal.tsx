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
  const { activePageId } = useEditor();

  const handleExport = async (format: ExportFormat) => {
    const triggerDownload = (content: Blob | string, fileName: string) => {
      const url = typeof content === 'string' ? content : URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (typeof content !== 'string') URL.revokeObjectURL(url);
      toast.success(`Download iniciado!`);
    };

    try {
      console.log(`Iniciando exportação: ${format}`);
      const _window = window as any;
      setIsExporting(true);
      setProgress(5);
      setExportStatus(`Preparando design para exportação...`);

      const targetSelector = activePageId ? `[data-page-id="${activePageId}"]` : '[data-page-id]';
      const activePageElement = document.querySelector(targetSelector) as HTMLElement;
      
      if (!activePageElement) {
        throw new Error("Não foi possível encontrar o canvas para exportação.");
      }

      const fabricCanvasContainer = activePageElement.querySelector('.canvas-container');
      if (fabricCanvasContainer) {
        const style = document.createElement('style');
        style.innerHTML = `
          ${targetSelector} .canvas-container > canvas:not(:first-child) { opacity: 0 !important; }
          ${targetSelector} .canvas-container > .upper-canvas { opacity: 0 !important; }
        `;
        document.head.appendChild(style);
        
        await new Promise(r => setTimeout(r, 100));
        
        setProgress(20);
        setExportStatus("Capturando área do design (2x HQ)...");

        const options = {
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          width: activePageElement.clientWidth,
          height: activePageElement.clientHeight,
          style: {
            transform: 'none',
            margin: '0',
          }
        };

        const fileName = `${projectName || "Design sem nome"}.${format === 'pdf' ? 'pdf' : format}`;
        
        let blob: Blob | null = null;
        let dataUrl = "";
        
        if (format === "png") {
          blob = await htmlToImage.toBlob(activePageElement, options);
        } else if (format === "jpg") {
          blob = await htmlToImage.toBlob(activePageElement, { ...options, quality: 0.95, type: 'image/jpeg' });
        } else if (format === "webp") {
          blob = await htmlToImage.toBlob(activePageElement, { ...options, type: 'image/webp' });
        } else {
          dataUrl = await htmlToImage.toPng(activePageElement, options);
        }

        document.head.removeChild(style);

        setProgress(80);
        setExportStatus("Finalizando arquivo...");

        if (format === "pdf") {
          const pdf = new jsPDF({
            orientation: activePageElement.clientWidth > activePageElement.clientHeight ? "landscape" : "portrait",
            unit: "px",
            format: [activePageElement.clientWidth * 2, activePageElement.clientHeight * 2]
          });
          pdf.addImage(dataUrl, "PNG", 0, 0, activePageElement.clientWidth * 2, activePageElement.clientHeight * 2);
          blob = pdf.output('blob');
        }

        if (_window.showSaveFilePicker) {
          try {
            const mimeTypes: Record<string, string> = {
              png: 'image/png',
              jpg: 'image/jpeg',
              webp: 'image/webp',
              pdf: 'application/pdf',
              mp4: 'video/mp4',
              gif: 'image/gif'
            };
            
            const handle = await _window.showSaveFilePicker({
              suggestedName: fileName,
              types: [{ 
                description: `${format.toUpperCase()} File`, 
                accept: { [mimeTypes[format] || 'application/octet-stream']: [`.${format}`] } 
              }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob || dataUrl);
            await writable.close();
            toast.success(`Design salvo com sucesso!`);
          } catch (e: any) {
            if (e.name !== 'AbortError') {
              console.error("Save Picker Error:", e);
              triggerDownload(blob || dataUrl, fileName);
            }
          }
        } else {
          triggerDownload(blob || dataUrl, fileName);
        }

        setProgress(100);
        setExportStatus("Concluído!");
        
        setTimeout(() => {
          onOpenChange(false);
          setIsExporting(false);
          setProgress(0);
        }, 1000);
      } else {
        throw new Error("Container do canvas não encontrado.");
      }

    } catch (error) {
      console.error("Export Error:", error);
      setIsExporting(false);
      setProgress(0);
      toast.error("Ocorreu um erro ao exportar o design.");
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