## Objetivo

Implementar a biblioteca de "FORMAS" dentro do painel **Elementos**, começando com o SVG enviado, carregando-o no canvas via `fabric.loadSVGFromURL` como grupo de paths editáveis (fill/stroke individuais).

## Passos

### 1. Salvar o asset SVG
- Copiar `user-uploads://unnamed.svg` para `src/assets/elements/shape-01.svg`.
- Esta pasta passa a ser o diretório oficial da biblioteca de formas.

### 2. Criar registro da biblioteca de formas
- Criar `src/components/canvito/shapes-library.ts` exportando um array tipado:
  ```ts
  export type ShapeAsset = { id: string; name: string; url: string };
  export const SHAPES: ShapeAsset[] = [
    { id: "shape-01", name: "Forma 01", url: shape01Url },
  ];
  ```
- Importar o SVG via `import shape01Url from "@/assets/elements/shape-01.svg?url"` para obter URL bundled (necessária para `loadSVGFromURL`).

### 3. Adicionar `addShapeFromUrl` no `editor-context.tsx`
- Nova função no provider, exposta pelo contexto, com a assinatura `addShapeFromUrl(url: string): Promise<void>`.
- Implementação:
  ```ts
  const { objects, options } = await fabric.loadSVGFromURL(url);
  const group = fabric.util.groupSVGElements(
    objects.filter((o): o is fabric.Object => !!o),
    options,
  );
  ```
  - `groupSVGElements` retorna um `Group` quando há vários paths e um único objeto quando há só um — ambos preservam fill/stroke por path, permitindo edição vetorial (não bitmap).
- Escalar para caber em ~50% do artboard (igual lógica de `addImageFromSource`), centralizar (`originX/originY: "center"`, `left/top` no centro do artboard).
- Aplicar os mesmos tokens visuais de seleção (cornerColor, borderColor neon, `lockUniScaling`, controles visíveis) e o `trashControlRef`.
- `c.add(group)`, `c.setActiveObject(group)`, `c.requestRenderAll()` — fica selecionado para redimensionar imediatamente.
- Tratar erro com `toast.error`.

### 4. Painel "Formas" no `SidePanel.tsx`
- No painel **Elementos**, ao clicar no item "Formas" abrir uma sub-visualização com:
  - Botão "voltar" para a lista de itens de Elementos.
  - Header "Formas" + contador.
  - Grid 3 colunas de miniaturas (mesmo estilo das thumbs de Uploads), cada uma renderizando `<img src={shape.url} />` (SVG inline como preview).
  - Estilo de hover/borda com tokens existentes (`border-white/10`, `hover:border-[var(--electric-blue)]`).
- Estado local `shapesOpen` no `SidePanel` controlando a visualização.
- Clique na miniatura chama `addShapeFromUrl(shape.url)` do contexto.

### 5. Conectar ao item existente
- O `PanelItem` "Formas" (dentro de `activeToolId === "elementos"`) recebe um handler que ativa `shapesOpen`. Outros itens de Elementos permanecem inertes (comportamento atual).

## Detalhes técnicos

- **fabric v6**: `loadSVGFromURL` retorna `Promise<{ objects, elements, allElements, options }>` (não usa callback). `groupSVGElements` continua disponível em `fabric.util`.
- **Editabilidade garantida**: como o SVG é convertido em `Path` objects do fabric agrupados, o usuário pode ungroup e mudar `fill`/`stroke` por path. A barra de estilo existente do Canvito que opera em `activeObject` funcionará no grupo (cor uniforme) e em paths individuais após entrar no grupo.
- **Sem bitmap**: nunca usar `FabricImage.fromURL` para SVGs da biblioteca.
- **Bundling**: `?url` garante que o Vite emita o asset com hash e devolva uma URL absoluta válida tanto em dev quanto build (Cloudflare Worker SSR safe — fetch público).
- **Tokens do design system**: reutilizar variáveis CSS existentes (`--electric-blue`, `--neon-pink`, `--panel`, etc.) e classes utilitárias já usadas em Uploads.

## Arquivos afetados

- `src/assets/elements/shape-01.svg` (novo)
- `src/components/canvito/shapes-library.ts` (novo)
- `src/components/canvito/editor-context.tsx` (adiciona `addShapeFromUrl` ao tipo, provider e value)
- `src/components/canvito/SidePanel.tsx` (sub-view de Formas + handler no PanelItem)

## Fora de escopo

- Adicionar mais formas além da enviada (estrutura fica pronta para expansão).
- Editor de cores por path dedicado (a barra de estilo atual já cobre o caso).