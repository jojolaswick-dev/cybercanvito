import { useState, type ComponentType, type ReactNode } from "react";
import * as fabric from "fabric";
import {
  ArrowLeftRight,
  ArrowUpDown,
  CircleDot,
  Check,
  ChevronDown,
  Cloud,
  CloudUpload,
  Download,
  FileText,
  MessageSquare,
  Printer,
  Redo2,
  RefreshCw,
  Settings,
  Share2,
  Scaling,
  Smartphone,
  Square,
  RectangleVertical,
  RotateCcw,
  RotateCw,
  Sun,
  Trash2,
  Crop,
  Undo2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditor, ARTBOARD_PRESETS, type ArtboardPresetId } from "./editor-context";

const PRESET_ICONS: Record<ArtboardPresetId, ComponentType<{ className?: string }>> = {
  square: Square,
  portrait: RectangleVertical,
  story: Smartphone,
};

type EditFilter = "sepia" | "bandicoot" | "grayscale" | "bw" | "negative";

const CSS_FILTERS: Record<EditFilter, string> = {
  sepia: "sepia(100%)",
  bandicoot: "sepia(50%) saturate(150%) hue-rotate(-30deg)",
  grayscale: "grayscale(100%)",
  bw: "contrast(150%) grayscale(100%)",
  negative: "invert(100%)",
};

export function TopBar() {
  const [name, setName] = useState("Design sem nome");
  const {
    activeCanvas,
    activePageId,
    artboard,
    deleteActiveObject,
    deletePage,
    openImagePicker,
     pages,
    preset,
    setArtboardPreset,
    setIsCropping,
    startCropMode,
    finishCrop,
    cancelCrop,
    isCropping,
  } = useEditor();

  const showSoon = (label: string) => {
    console.log(`${label}: em breve`);
    window.alert(`${label}: Em breve`);
  };

  const showDevelopmentToast = () => {
    toast.info("Funcionalidade em desenvolvimento");
  };

  const getEditableObject = () => {
    const target = activeCanvas?.getActiveObject();
    if (!target || (target as fabric.Object & { isArtboard?: boolean }).isArtboard) {
      toast.info("Selecione uma imagem no canvas");
      return null;
    }
    return target;
  };

  const applyFilter = (filter: EditFilter) => {
    const target = getEditableObject();
    if (!target) return;
    (target as fabric.Object & { cssFilter?: string }).cssFilter = CSS_FILTERS[filter];
    if (target instanceof fabric.FabricImage) {
      const filters = fabric.filters;
      target.filters =
        filter === "sepia" ? [new filters.Sepia()] :
        filter === "bandicoot" ? [new filters.Sepia(), new filters.Saturation({ saturation: 0.5 }), new filters.HueRotation({ rotation: -30 / 180 })] :
        filter === "grayscale" ? [new filters.Grayscale()] :
        filter === "bw" ? [new filters.Contrast({ contrast: 0.5 }), new filters.Grayscale()] :
        [new filters.Invert()];
      target.applyFilters();
    }
    activeCanvas?.requestRenderAll();
  };

  const rotateActiveObject = (delta: number) => {
    const target = getEditableObject();
    if (!target) return;
    target.rotate(((target.angle ?? 0) + delta) % 360);
    target.setCoords();
    activeCanvas?.requestRenderAll();
  };

  const mirrorActiveObject = (axis: "x" | "y") => {
    const target = getEditableObject();
    if (!target) return;
    if (axis === "x") target.set("scaleX", -(target.scaleX || 1));
    else target.set("scaleY", -(target.scaleY || 1));
    target.setCoords();
    activeCanvas?.requestRenderAll();
  };
  
  const startCropping = () => {
    startCropMode();
  };

  const moveToTrash = () => {
    if (activeCanvas?.getActiveObject()) {
      deleteActiveObject();
      return;
    }
    if (activePageId && pages.length > 1) {
      deletePage(activePageId);
      return;
    }
    console.log("Mover para lixeira: nada selecionado");
  };

  return (
    <header className="relative z-30 flex h-14 items-center justify-between border-b border-white/10 bg-cyber-bar px-3 text-white">
      {/* Glow accent line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--neon-pink)] to-transparent opacity-60" />

      {/* Left */}
      <div className="flex items-center gap-1">
        <div className="mr-2 flex items-center gap-1.5 pl-1">
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--neon-pink)] shadow-[0_0_8px_var(--neon-pink)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan)]" />
          <span className="ml-2 font-bold tracking-widest text-white/90">CANVITO</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white">
              Arquivo
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 border-white/10 bg-[var(--panel)] p-1.5 text-white shadow-[0_18px_60px_oklch(0_0_0/0.45)]">
            <FileMenuItem icon={FileText} label="Criar novo design" shortcut="Ctrl+N" onSelect={() => showSoon("Criar novo design")} />
            <FileMenuItem icon={CloudUpload} label="Fazer upload de arquivos" shortcut="Ctrl+U" onSelect={() => openImagePicker()} />
            <FileMenuItem icon={Settings} label="Configurações" shortcut="Ctrl+," onSelect={() => showSoon("Configurações")} />
            <DropdownMenuSeparator className="bg-white/10" />
            <FileMenuItem icon={Download} label="Exportar" shortcut="Ctrl+E" onSelect={() => showSoon("Exportar")} />
            <FileMenuItem icon={Printer} label="Imprimir" shortcut="Ctrl+P" onSelect={() => showSoon("Imprimir")} />
            <DropdownMenuSeparator className="bg-white/10" />
            <FileMenuItem icon={Trash2} label="Mover para lixeira" shortcut="Del" danger onSelect={moveToTrash} />
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Redimensionar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white">
              Redimensionar
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 border-white/10 bg-[var(--panel)] text-white">
            <DropdownMenuLabel className="text-white/60">Formato do papel</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {(Object.keys(ARTBOARD_PRESETS) as ArtboardPresetId[]).map((id) => {
              const p = ARTBOARD_PRESETS[id];
              const Icon = PRESET_ICONS[id];
              const active = preset === id;
              return (
                <DropdownMenuItem
                  key={id}
                  onSelect={() => setArtboardPreset(id)}
                  className="flex cursor-pointer items-center gap-2 focus:bg-white/10 focus:text-white"
                >
                  <Icon className="h-4 w-4 text-[var(--neon-cyan)]" />
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm">{p.label}</span>
                    <span className="text-xs text-white/50">{p.width} × {p.height}</span>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 text-[var(--electric-blue)]" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white">
              Editar
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 border-white/10 bg-[var(--panel)] p-1.5 text-white shadow-[0_18px_60px_oklch(0_0_0/0.45)]">
             <DropdownMenuLabel className="px-2.5 text-xs text-white/50">Recorte</DropdownMenuLabel>
            <EditMenuItem icon={Crop} label="Recortar" shortcut="C" onSelect={startCropping} />
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuLabel className="px-2.5 text-xs text-white/50">Filtros</DropdownMenuLabel>
            <EditMenuItem icon={Sun} label="Sépia" onSelect={() => applyFilter("sepia")} />
            <EditMenuItem icon={Zap} label="Bandicoot" onSelect={() => applyFilter("bandicoot")} />
            <EditMenuItem icon={Cloud} label="Escala de Cinza" onSelect={() => applyFilter("grayscale")} />
            <EditMenuItem icon={CircleDot} label="B&W" onSelect={() => applyFilter("bw")} />
            <EditMenuItem icon={RefreshCw} label="Negativo" onSelect={() => applyFilter("negative")} />
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuLabel className="px-2.5 text-xs text-white/50">Orientação</DropdownMenuLabel>
            <EditMenuItem icon={RotateCw} label="Girar Horário" shortcut="Ctrl+R" onSelect={() => rotateActiveObject(90)} />
            <EditMenuItem icon={RotateCcw} label="Girar Anti-horário" shortcut="Ctrl+L" onSelect={() => rotateActiveObject(-90)} />
            <EditMenuItem icon={ArrowUpDown} label="Espelhar Vertical" onSelect={() => mirrorActiveObject("y")} />
            <EditMenuItem icon={ArrowLeftRight} label="Espelhar Horizontal" onSelect={() => mirrorActiveObject("x")} />
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuLabel className="px-2.5 text-xs text-white/50">Dimensionamento</DropdownMenuLabel>
            <EditMenuItem icon={Scaling} label="Redimensionar" disabled onSelect={showDevelopmentToast} />
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mx-2 h-6 w-px bg-white/15" />

        {/* Quick preset shortcuts */}
        <div className="flex items-center gap-0.5">
          {(Object.keys(ARTBOARD_PRESETS) as ArtboardPresetId[]).map((id) => {
            const Icon = PRESET_ICONS[id];
            const active = preset === id;
            return (
              <button
                key={id}
                onClick={() => setArtboardPreset(id)}
                title={ARTBOARD_PRESETS[id].label}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                  active
                    ? "bg-white/15 text-white shadow-[inset_0_0_0_1px_var(--electric-blue)]"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        <div className="mx-2 h-6 w-px bg-white/15" />
        <IconBtn><Undo2 className="h-4 w-4" /></IconBtn>
        <IconBtn><Redo2 className="h-4 w-4" /></IconBtn>
      </div>

      {/* Center */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md bg-white/5 px-3 py-1 text-sm font-medium text-white outline-none ring-1 ring-transparent transition-all hover:bg-white/10 focus:bg-white/10 focus:ring-[var(--electric-blue)]"
        />
        <span className="text-xs tabular-nums text-white/60">{artboard.width} × {artboard.height} px</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {isCropping ? (
          <div className="flex items-center gap-2">
            <button 
              onClick={cancelCrop}
              className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              Cancelar
            </button>
            <button 
              onClick={() => finishCrop()}
              className="rounded-md bg-[var(--neon-cyan)] px-5 py-2 text-sm font-bold text-black shadow-[0_0_15px_oklch(0.7_0.2_180/0.5)] transition-all hover:scale-[1.02]"
            >
              Concluir Recorte
            </button>
          </div>
        ) : (
          <>
            <IconBtn><MessageSquare className="h-4 w-4" /></IconBtn>
            <IconBtn><Share2 className="h-4 w-4" /></IconBtn>
            <button className="ml-1 inline-flex items-center gap-2 rounded-md bg-white px-5 py-2 text-sm font-bold text-[var(--background)] shadow-[0_0_24px_oklch(1_0_0/0.3)] transition-all hover:shadow-[0_0_32px_oklch(1_0_0/0.5)] hover:scale-[1.02] active:scale-95">
              Exportar
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function NavButton({ label, hasChevron }: { label: string; hasChevron?: boolean }) {
  return (
    <button className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white">
      {label}
      {hasChevron && <ChevronDown className="h-3.5 w-3.5 opacity-70" />}
    </button>
  );
}

function FileMenuItem({
  icon: Icon,
  label,
  shortcut,
  danger,
  onSelect,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  shortcut: string;
  danger?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className={`flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm focus:bg-white/10 focus:text-white ${
        danger ? "text-[var(--destructive)] focus:text-[var(--destructive)]" : "text-white/90"
      }`}
    >
      <Icon className={`h-4 w-4 ${danger ? "text-[var(--destructive)]" : "text-[var(--neon-cyan)]"}`} />
      <span className="flex-1">{label}</span>
      <DropdownMenuShortcut className="ml-4 tracking-normal text-white/45">{shortcut}</DropdownMenuShortcut>
    </DropdownMenuItem>
  );
}

function EditMenuItem({
  icon: Icon,
  label,
  shortcut,
  disabled,
  onSelect,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm text-white/90 focus:bg-white/10 focus:text-white disabled:cursor-not-allowed disabled:text-white/35 disabled:opacity-100"
    >
      <Icon className={`h-4 w-4 ${disabled ? "text-white/35" : "text-[var(--neon-cyan)]"}`} />
      <span className="flex-1">{label}</span>
      {shortcut && <DropdownMenuShortcut className="ml-4 tracking-normal text-white/45">{shortcut}</DropdownMenuShortcut>}
    </DropdownMenuItem>
  );
}

function IconBtn({ children }: { children: ReactNode }) {
  return (
    <button className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}
