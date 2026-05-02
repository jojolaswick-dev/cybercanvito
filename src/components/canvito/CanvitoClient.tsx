"use client";

import { useCallback, useState } from "react";
import { TopBar } from "./TopBar";
import { Sidebar, type ToolId } from "./Sidebar";
import { SidePanel } from "./SidePanel";
import { Canvas } from "./Canvas";
import { BottomBar } from "./BottomBar";
import { EditorProvider } from "./editor-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function CanvitoClient() {
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
            <Sidebar active={activeTool} onSelect={handleToolSelect} />
          </ErrorBoundary>
          <ErrorBoundary>
            <SidePanel active={activeTool} onClose={handlePanelClose} />
          </ErrorBoundary>
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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