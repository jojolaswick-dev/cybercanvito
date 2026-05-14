import table1Url from "@/assets/elements/frame-square.svg?url"; // Temporary placeholders
import table2Url from "@/assets/elements/frame-square.svg?url";

export type TableAsset = {
  id: string;
  name: string;
  url: string;
};

export const TABLES: TableAsset[] = [
  { id: "table-01", name: "Tabela Simples", url: table1Url },
  { id: "table-02", name: "Tabela Listrada", url: table2Url },
];
