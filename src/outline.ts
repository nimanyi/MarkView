import { EditorView } from "@codemirror/view";

/** 大纲条目：标题级别 / 文本 / 源码行号（1 起） */
export interface OutlineItem {
  level: number;
  text: string;
  line: number;
}

/**
 * 从 Markdown 源码提取大纲（ATX 标题：# ~ ######）。
 * 围栏代码块（``` / ~~~）内的 # 不视为标题。
 */
export function extractOutline(source: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  let fence: string | null = null; // 当前围栏标记（``` 或 ~~~）
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s{0,3}(```|~~~)/);
    if (fenceMatch) {
      if (fence === null) {
        fence = fenceMatch[1];
      } else if (line.trimStart().startsWith(fence)) {
        fence = null;
      }
      continue;
    }
    if (fence !== null) continue;
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      items.push({
        level: heading[1].length,
        text: heading[2],
        line: i + 1,
      });
    }
  }
  return items;
}

/**
 * 大纲跳转：编辑器定位到标题行（居中），预览侧经 data-sourcepos
 * 找到对应标题元素滚动（同步滚动随后接管双向联动）。
 */
export function gotoOutlineItem(
  view: EditorView,
  preview: HTMLElement,
  item: OutlineItem,
): void {
  const total = view.state.doc.lines;
  const line = view.state.doc.line(Math.min(item.line, total));
  view.dispatch({
    selection: { anchor: line.from },
    effects: EditorView.scrollIntoView(line.from, { y: "center" }),
  });

  const target = findHeadingByLine(preview, item.line);
  target?.scrollIntoView({ block: "start" });
}

/** 在预览中找起始行等于 line 的 h1-h6（data-sourcepos="line:col-…"） */
function findHeadingByLine(preview: HTMLElement, line: number): HTMLElement | null {
  const headings = preview.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6");
  for (const h of headings) {
    const pos = h.dataset.sourcepos ?? "";
    const start = Number.parseInt(pos, 10);
    if (start === line) return h;
  }
  return null;
}
