import frameSquareUrl from "@/assets/elements/frame-square.svg?url";
import frameCircleUrl from "@/assets/elements/frame-circle.svg?url";
import frameStarUrl from "@/assets/elements/frame-star.svg?url";

export type FrameAsset = {
  id: string;
  name: string;
  url: string;
};

export const FRAMES: FrameAsset[] = [
  { id: "frame-01", name: "Frame Quadrado", url: frameSquareUrl },
  { id: "frame-02", name: "Frame Circular", url: frameCircleUrl },
  { id: "frame-03", name: "Frame Estrela", url: frameStarUrl },
];
