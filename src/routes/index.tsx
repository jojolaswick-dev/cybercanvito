import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { TopBar } from "@/components/canvito/TopBar";
import { Sidebar, type ToolId } from "@/components/canvito/Sidebar";
import { SidePanel } from "@/components/canvito/SidePanel";
import { Canvas } from "@/components/canvito/Canvas";
import { BottomBar } from "@/components/canvito/BottomBar";
import { EditorProvider } from "@/components/canvito/editor-context";

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
  const handleToolSelect = useCallback((id: ToolId) => {
    setActiveTool((cur) => (cur === id ? null : id));
  }, []);
  const handlePanelClose = useCallback(() => setActiveTool(null), []);

  return (
    <EditorProvider>
      <div className="flex min-h-[100dvh] w-full flex-col bg-background overflow-x-hidden">
        <TopBar />
        <main className="flex flex-1 relative min-h-0">
          <Sidebar
            active={activeTool}
            onSelect={handleToolSelect}
          />
          <SidePanel active={activeTool} onClose={handlePanelClose} />
          <div className="flex-1 flex flex-col pb-[120px]">
            <Canvas />
          </div>
        </main>
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomBar />
        </div>
      </div>
    </EditorProvider>
  );
}
