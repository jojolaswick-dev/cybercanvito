import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/canvito/TopBar";
import { Sidebar, type ToolId } from "@/components/canvito/Sidebar";
import { SidePanel } from "@/components/canvito/SidePanel";
import { Canvas } from "@/components/canvito/Canvas";
import { BottomBar } from "@/components/canvito/BottomBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Canvito — Editor gráfico cyberpunk" },
      {
        name: "description",
        content: "Canvito: editor gráfico com estética cyberpunk neon. Crie, edite e exporte designs com IA mágica.",
      },
    ],
  }),
  component: CanvitoApp,
});

function CanvitoApp() {
  const [activeTool, setActiveTool] = useState<ToolId | null>("elementos");
  const [zoom, setZoom] = useState(40);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          active={activeTool}
          onSelect={(id) => setActiveTool((cur) => (cur === id ? null : id))}
        />
        <SidePanel active={activeTool} onClose={() => setActiveTool(null)} />
        <Canvas zoom={zoom} />
      </div>
      <BottomBar zoom={zoom} setZoom={setZoom} />
    </div>
  );
}
