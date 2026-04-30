import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { TopBar } from "@/components/canvito/TopBar";
import { Sidebar, type ToolId } from "@/components/canvito/Sidebar";
import { SidePanel } from "@/components/canvito/SidePanel";
import { Canvas } from "@/components/canvito/Canvas";
import { BottomBar } from "@/components/canvito/BottomBar";
import { EditorProvider } from "@/components/canvito/editor-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ContextualTextToolbar } from "@/components/canvito/ContextualTextToolbar";

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
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        <ErrorBoundary>
          <TopBar />
        </ErrorBoundary>
        <main className="relative flex min-h-0 flex-1 overflow-hidden">
          <ErrorBoundary>
            <Sidebar
              active={activeTool}
              onSelect={handleToolSelect}
            />
          </ErrorBoundary>
          <ErrorBoundary>
            <SidePanel active={activeTool} onClose={handlePanelClose} />
          </ErrorBoundary>
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <ErrorBoundary>
              <ContextualTextToolbar />
            </ErrorBoundary>
            <ErrorBoundary>
              <Canvas />
            </ErrorBoundary>
          </div>
        </main>
        <ErrorBoundary>
          <BottomBar />
        </ErrorBoundary>
      </div>
    </EditorProvider>
  );
}
