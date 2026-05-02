import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";

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
  const [ClientApp, setClientApp] = useState<ComponentType | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@/components/canvito/CanvitoClient").then((module) => {
      if (mounted) setClientApp(() => module.CanvitoClient);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ClientApp) {
    return <div className="flex h-screen w-full items-center justify-center bg-background text-foreground" />;
  }

  return <ClientApp />;
}
