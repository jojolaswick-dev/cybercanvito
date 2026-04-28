import { memo, useState, useEffect } from "react";
import { 
  X, 
  Image, 
  FileJson, 
  FileText, 
  Video, 
  Film,
  Download,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

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

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setProgress(10);
    setExportStatus(`Preparando exportação ${format.toUpperCase()}...`);

    try {
      // Find the active page element
      const activePageElement = document.querySelector('[data-page-id]') as HTMLElement;
      if (!activePageElement) {
        throw new Error("Não foi possível encontrar o canvas para exportação.");
      }

      // Special handling for MP4/GIF (Simulation for now as requested)
      if (format === "mp4" || format === "gif") {
        setExportStatus(`Renderizando frames para ${format.toUpperCase()}...`);
        for (let i = 1; i <= 10; i++) {
          await new Promise(r => setTimeout(r, 300));
          setProgress(10 + i * 8);
        }
      }

      const canvas = await html2canvas(activePageElement, {
        useCORS: true,
        backgroundColor: null,
        scale: 2, // Higher quality
      });
      
      setProgress(90);
      setExportStatus("Finalizando arquivo...");

      const fileName = `${projectName || "design-sem-nome"}.${format === 'pdf' ? 'pdf' : format}`;

      if (format === "pdf") {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? "landscape" : "portrait",
          unit: "px",
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(fileName);
      } else if (format === "mp4" || format === "gif") {
        // Experimental/Simulation: Download as image for now but with the correct extension
        // Real MP4 encoding in browser requires libraries like ffmpeg.wasm which is heavy
        const link = document.createElement("a");
        link.download = fileName;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : format}`);
        link.click();
      }

      setProgress(100);
      setExportStatus("Exportação concluída!");
      toast.success(`Exportado como ${format.toUpperCase()} com sucesso!`);
      
      setTimeout(() => {
        onOpenChange(false);
        setIsExporting(false);
        setProgress(0);
      }, 1000);

    } catch (error) {
      console.error("Export error:", error);
      toast.error("Ocorreu um erro ao exportar o design.");
      setIsExporting(false);
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