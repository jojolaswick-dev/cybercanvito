import graphicBarUrl from "@/assets/elements/graphic-bar.svg?url";
import graphicPieUrl from "@/assets/elements/graphic-pie.svg?url";
import graphicLineUrl from "@/assets/elements/graphic-line.svg?url";

export type GraphicAsset = {
  id: string;
  name: string;
  url: string;
};

export const GRAPHICS: GraphicAsset[] = [
  { id: "graphic-bar", name: "Barras", url: graphicBarUrl },
  { id: "graphic-pie", name: "Pizza", url: graphicPieUrl },
  { id: "graphic-line", name: "Linha", url: graphicLineUrl },
];
