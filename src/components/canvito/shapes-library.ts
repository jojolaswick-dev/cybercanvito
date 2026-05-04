import shape01Url from "@/assets/elements/shape-01.svg?url";

export type ShapeAsset = {
  id: string;
  name: string;
  url: string;
};

export const SHAPES: ShapeAsset[] = [
  { id: "shape-01", name: "Forma 01", url: shape01Url },
];
