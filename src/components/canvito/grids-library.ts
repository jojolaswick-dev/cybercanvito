import grid1Url from "@/assets/elements/frame-square.svg?url"; // Temporary placeholders until we have specific grid svgs or patterns
import grid2Url from "@/assets/elements/frame-square.svg?url";
import grid3Url from "@/assets/elements/frame-square.svg?url";

export type GridAsset = {
  id: string;
  name: string;
  url: string;
};

export const GRIDS: GridAsset[] = [
  { id: "grid-01", name: "Grelha 1x1", url: grid1Url },
  { id: "grid-02", name: "Grelha 2x1", url: grid2Url },
  { id: "grid-03", name: "Grelha 2x2", url: grid3Url },
];
