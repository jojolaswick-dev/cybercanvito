import { useState } from "react";
import { ChevronDown, MessageSquare, Share2, Undo2, Redo2 } from "lucide-react";

export function TopBar() {
  const [name, setName] = useState("Design sem nome");

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

        <NavButton label="Arquivo" hasChevron />
        <NavButton label="Redimensionar" />
        <NavButton label="Editar" hasChevron />

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
        <span className="text-xs text-white/60">1080 × 1080 px</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <IconBtn><MessageSquare className="h-4 w-4" /></IconBtn>
        <IconBtn><Share2 className="h-4 w-4" /></IconBtn>
        <button className="ml-1 inline-flex items-center gap-2 rounded-md bg-white px-5 py-2 text-sm font-bold text-[var(--background)] shadow-[0_0_24px_oklch(1_0_0/0.3)] transition-all hover:shadow-[0_0_32px_oklch(1_0_0/0.5)] hover:scale-[1.02] active:scale-95">
          Exportar
        </button>
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

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}
