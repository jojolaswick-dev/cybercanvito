import stickerSaleUrl from "@/assets/elements/sticker-sale.svg?url";
import stickerSparkleUrl from "@/assets/elements/sticker-sparkle.svg?url";
import stickerCheckUrl from "@/assets/elements/sticker-check.svg?url";

export type StickerAsset = {
  id: string;
  name: string;
  url: string;
};

export const STICKERS: StickerAsset[] = [
  { id: "sticker-sale", name: "Promoção", url: stickerSaleUrl },
  { id: "sticker-sparkle", name: "Brilho", url: stickerSparkleUrl },
  { id: "sticker-check", name: "Check", url: stickerCheckUrl },
];
