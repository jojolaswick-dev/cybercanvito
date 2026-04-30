import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ChevronDown, ListPlus, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import type * as fabric from "fabric";
import { useEditor } from "./editor-context";

const FONT_FAMILIES = ["Arial", "Verdana", "Helvetica", "Times New Roman", "Georgia", "Courier New", "Trebuchet MS", "Impact"];
const TEXT_TYPES = new Set(["text", "i-text", "textbox"]);

type TextObject = fabric.Object & {
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fill?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  underline?: boolean;
  textAlign?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  initDimensions?: () => void;
};

type TextSnapshot = {
  fontFamily: string;
  fontSize: number;
  fill: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isUppercase: boolean;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
};

export const ContextualTextToolbar = memo(function ContextualTextToolbar() {
  const { activeCanvas } = useEditor();
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedText, setSelectedText] = useState<TextObject | null>(null);
  const [snapshot, setSnapshot] = useState<TextSnapshot | null>(null);

  const readSelectedText = useCallback(() => {
    const target = activeCanvas?.getActiveObject() as TextObject | undefined;
    if (!target || !TEXT_TYPES.has(target.type ?? "")) {
      setSelectedText(null);
      setSnapshot(null);
      return;
    }

    setSelectedText(target);
    setSnapshot({
      fontFamily: target.fontFamily || "Arial",
      fontSize: Math.round(target.fontSize || 32),
      fill: typeof target.fill === "string" ? target.fill : "#111111",
      isBold: target.fontWeight === "bold" || Number(target.fontWeight) >= 700,
      isItalic: target.fontStyle === "italic",
      isUnderline: Boolean(target.underline),
      isUppercase: Boolean(target.text && target.text === target.text.toUpperCase()),
      textAlign: target.textAlign === "center" || target.textAlign === "right" ? target.textAlign : "left",
      lineHeight: Number(target.lineHeight || 1.16),
    });
  }, [activeCanvas]);

  useEffect(() => {
    if (!activeCanvas) {
      setSelectedText(null);
      setSnapshot(null);
      return;
    }

    readSelectedText();
    activeCanvas.on("selection:created", readSelectedText);
    activeCanvas.on("selection:updated", readSelectedText);
    activeCanvas.on("selection:cleared", readSelectedText);
    activeCanvas.on("object:modified", readSelectedText);

    return () => {
      activeCanvas.off("selection:created", readSelectedText);
      activeCanvas.off("selection:updated", readSelectedText);
      activeCanvas.off("selection:cleared", readSelectedText);
      activeCanvas.off("object:modified", readSelectedText);
    };
  }, [activeCanvas, readSelectedText]);

  const commitTextChange = useCallback((changes: Partial<TextObject>) => {
    if (!activeCanvas || !selectedText) return;
    selectedText.set(changes);
    selectedText.initDimensions?.();
    selectedText.setCoords();
    activeCanvas.requestRenderAll();
    activeCanvas.fire("object:modified", { target: selectedText });
    readSelectedText();
  }, [activeCanvas, readSelectedText, selectedText]);

  const updateFontSize = useCallback((nextSize: number) => {
    const safeSize = Math.min(400, Math.max(1, Math.round(nextSize || 1)));
    commitTextChange({ fontSize: safeSize });
  }, [commitTextChange]);

  const toggleCase = useCallback(() => {
    if (!selectedText?.text) return;
    const nextText = snapshot?.isUppercase ? selectedText.text.toLocaleLowerCase("pt-BR") : selectedText.text.toLocaleUpperCase("pt-BR");
    commitTextChange({ text: nextText });
  }, [commitTextChange, selectedText, snapshot?.isUppercase]);

  const cycleLineHeight = useCallback(() => {
    const current = snapshot?.lineHeight ?? 1.16;
    const next = current < 1.2 ? 1.35 : current < 1.5 ? 1.65 : 1.05;
    commitTextChange({ lineHeight: next });
  }, [commitTextChange, snapshot?.lineHeight]);

  const developmentToast = useCallback(() => {
    toast.info("Recurso em desenvolvimento. Chegando nas próximas atualizações!");
  }, []);

  const alignmentButtons = useMemo(() => ([
    { value: "left" as const, icon: AlignLeft, label: "Alinhar à esquerda" },
    { value: "center" as const, icon: AlignCenter, label: "Centralizar" },
    { value: "right" as const, icon: AlignRight, label: "Alinhar à direita" },
  ]), []);

  if (!selectedText || !snapshot) return null;

  return (
    <div className="relative z-30 flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-white/10 bg-[var(--panel)] px-3 text-white shadow-[0_10px_28px_oklch(0.1_0.04_280/0.28)]">
      <div className="relative flex h-8 min-w-40 items-center rounded-md border border-white/10 bg-white/5 px-2">
        <select
          value={snapshot.fontFamily}
          onChange={(event) => commitTextChange({ fontFamily: event.target.value })}
          className="h-full w-full appearance-none bg-transparent pr-6 text-xs font-semibold text-white outline-none [&_option]:bg-[var(--panel)]"
          aria-label="Fonte"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-white/50" />
      </div>

      <ToolbarDivider />

      <div className="flex h-8 items-center rounded-md border border-white/10 bg-white/5">
        <ToolbarIconButton label="Diminuir tamanho" onClick={() => updateFontSize(snapshot.fontSize - 1)}>
          <Minus className="h-3.5 w-3.5" />
        </ToolbarIconButton>
        <input
          type="number"
          min={1}
          max={400}
          value={snapshot.fontSize}
          onChange={(event) => updateFontSize(Number(event.target.value))}
          className="h-full w-14 border-x border-white/10 bg-transparent text-center text-xs font-bold text-white outline-none"
          aria-label="Tamanho da fonte"
        />
        <ToolbarIconButton label="Aumentar tamanho" onClick={() => updateFontSize(snapshot.fontSize + 1)}>
          <Plus className="h-3.5 w-3.5" />
        </ToolbarIconButton>
      </div>

      <ToolbarDivider />

      <button
        onClick={() => colorInputRef.current?.click()}
        className="flex h-8 w-9 flex-col items-center justify-center rounded-md border border-white/10 bg-white/5 text-sm font-black transition-all hover:bg-white/10"
        aria-label="Cor do texto"
      >
        A
        <span className="mt-0.5 h-0.5 w-5 rounded-full" style={{ backgroundColor: snapshot.fill }} />
      </button>
      <input
        ref={colorInputRef}
        type="color"
        value={snapshot.fill.startsWith("#") ? snapshot.fill : "#111111"}
        onChange={(event) => commitTextChange({ fill: event.target.value })}
        className="sr-only"
        aria-label="Selecionar cor do texto"
      />

      <ToolbarDivider />

      <div className="flex items-center gap-1">
        <ToggleButton active={snapshot.isBold} label="Negrito" onClick={() => commitTextChange({ fontWeight: snapshot.isBold ? "normal" : "bold" })}>B</ToggleButton>
        <ToggleButton active={snapshot.isItalic} label="Itálico" onClick={() => commitTextChange({ fontStyle: snapshot.isItalic ? "normal" : "italic" })}><span className="italic">I</span></ToggleButton>
        <ToggleButton active={snapshot.isUnderline} label="Sublinhado" onClick={() => commitTextChange({ underline: !snapshot.isUnderline })}><span className="underline">U</span></ToggleButton>
        <ToggleButton active={snapshot.isUppercase} label="Maiúscula e minúscula" onClick={toggleCase}>aA</ToggleButton>
      </div>

      <ToolbarDivider />

      <div className="flex items-center gap-1">
        {alignmentButtons.map(({ value, icon: Icon, label }) => (
          <ToolbarIconButton key={value} active={snapshot.textAlign === value} label={label} onClick={() => commitTextChange({ textAlign: value })}>
            <Icon className="h-4 w-4" />
          </ToolbarIconButton>
        ))}
        <ToolbarIconButton active={snapshot.lineHeight > 1.2} label="Espaçamento" onClick={cycleLineHeight}>
          <ListPlus className="h-4 w-4" />
        </ToolbarIconButton>
      </div>

      <ToolbarDivider />

      <div className="flex items-center gap-1">
        <ToolbarTextButton onClick={developmentToast}>Efeitos</ToolbarTextButton>
        <ToolbarTextButton onClick={developmentToast}>Animar</ToolbarTextButton>
      </div>
    </div>
  );
});

function ToolbarDivider() {
  return <div className="h-6 w-px shrink-0 bg-white/10" />;
}

function ToolbarIconButton({ active, label, onClick, children }: { active?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md border border-white/10 px-2 text-xs font-bold transition-all ${
        active ? "bg-[var(--neon-violet)] text-white shadow-[0_0_14px_oklch(0.55_0.28_295/0.35)]" : "bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
      }`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function ToggleButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <ToolbarIconButton active={active} label={label} onClick={onClick}>{children}</ToolbarIconButton>;
}

function ToolbarTextButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 items-center rounded-md border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/80 transition-all hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}