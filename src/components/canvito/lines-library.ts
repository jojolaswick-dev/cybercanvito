import line01Url from "@/assets/elements/line-01.svg?url";
import line02Url from "@/assets/elements/line-02.svg?url";
import line03Url from "@/assets/elements/line-03.svg?url";

export type LineAsset = {
  id: string;
  name: string;
  url: string;
};

export const LINES: LineAsset[] = [
  { id: "line-01", name: "Linha Reta", url: line01Url },
  { id: "line-02", name: "Linha Tracejada", url: line02Url },
  { id: "line-03", name: "Seta", url: line03Url },
];
