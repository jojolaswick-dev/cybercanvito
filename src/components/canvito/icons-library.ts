import iconHeartUrl from "@/assets/elements/icon-heart.svg?url";
import iconStarUrl from "@/assets/elements/icon-star.svg?url";
import iconSmileUrl from "@/assets/elements/icon-smile.svg?url";

export type IconAsset = {
  id: string;
  name: string;
  url: string;
};

export const ICONS: IconAsset[] = [
  { id: "icon-heart", name: "Coração", url: iconHeartUrl },
  { id: "icon-star", name: "Estrela", url: iconStarUrl },
  { id: "icon-smile", name: "Sorriso", url: iconSmileUrl },
];
