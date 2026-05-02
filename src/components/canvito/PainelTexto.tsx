import { Crown, Search, Sparkles, Type } from "lucide-react";
import { memo, useCallback } from "react";
import { toast } from "sonner";

type TextPreset = "caixa" | "titulo" | "subtitulo" | "corpo";

const TEXT_PRESETS: Record<TextPreset, { label: string; log: string; fontSize: number; fontWeight: string }> = {
  caixa: { label: "Adicionar uma caixa de texto", log: "CAIXA DE TEXTO", fontSize: 56, fontWeight: "500" },
  titulo: { label: "Inserir um título", log: "TÍTULO", fontSize: 88, fontWeight: "800" },
  subtitulo: { label: "Inserir um subtítulo", log: "SUBTÍTULO", fontSize: 52, fontWeight: "700" },
  corpo: { label: "Inserir um pouquinho de texto", log: "TEXTO", fontSize: 30, fontWeight: "400" },
};

export const PainelTexto = memo(function PainelTexto() {
  const handleAddTextToCanvas = useCallback((type: TextPreset) => {
    const preset = TEXT_PRESETS[type];
    console.log(`Adicionando ${preset.log} ao Canvas`);
    toast.info("Ferramenta de texto temporariamente desativada");
  }, []);

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Busque fontes e combinações"
          className="h-10 w-full rounded-md border border-border bg-secondary/70 pl-10 pr-3 text-sm text-panel-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <button
        onClick={() => handleAddTextToCanvas("caixa")}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--neon-violet)] px-4 py-3 text-sm font-bold text-primary-foreground shadow-neon transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        <Type className="h-4 w-4" strokeWidth={2.4} />
        Adicionar uma caixa de texto
      </button>

      <button
        onClick={() => toast("Disponível na versão Pro")}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 py-3 text-sm font-semibold text-panel-foreground transition-colors hover:border-[var(--neon-pink)]/70 hover:bg-secondary/70"
      >
        <Sparkles className="h-4 w-4 text-[var(--neon-pink)]" />
        Texto Mágico
        <Crown className="h-4 w-4 text-[var(--neon-pink)]" />
      </button>

      <section className="flex flex-col gap-2 pt-1">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Kit de marca</h3>
        <button className="rounded-md border border-dashed border-border bg-secondary/40 px-3 py-3 text-left text-sm font-semibold text-panel-foreground transition-colors hover:border-accent hover:bg-secondary/70">
          Adicione as fontes da sua marca
        </button>
      </section>

      <section className="flex flex-col gap-2 pt-1">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Estilos padrão</h3>
        <button
          onClick={() => handleAddTextToCanvas("titulo")}
          className="rounded-lg border border-border bg-secondary/50 p-4 text-left text-2xl font-extrabold text-panel-foreground transition-all hover:border-accent hover:bg-secondary/80"
        >
          Inserir um título
        </button>
        <button
          onClick={() => handleAddTextToCanvas("subtitulo")}
          className="rounded-lg border border-border bg-secondary/50 p-4 text-left text-lg font-bold text-panel-foreground transition-all hover:border-accent hover:bg-secondary/80"
        >
          Inserir um subtítulo
        </button>
        <button
          onClick={() => handleAddTextToCanvas("corpo")}
          className="rounded-lg border border-border bg-secondary/50 p-4 text-left text-sm font-normal text-panel-foreground transition-all hover:border-accent hover:bg-secondary/80"
        >
          Inserir um pouquinho de texto
        </button>
      </section>
    </div>
  );
});