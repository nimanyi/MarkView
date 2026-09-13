/**
 * Markdown 排版命令（toggle 语义）：已包裹则取消，未包裹则添加。
 *
 * 导出的命令同时供两处使用：
 *  - editor.ts 挂载的 Prec.highest 键表（编辑器内快捷键）
 *  - toolbar.ts 工具栏按钮（以及选中态高亮谓词）
 *
 * 快捷键（编辑器内生效）：
 *  Ctrl+B          加粗 **…**
 *  Ctrl+I          斜体 *…*
 *  Ctrl+E          行内代码 `…`
 *  Ctrl+Shift+X    删除线 ~~…~~
 *  Ctrl+K          链接 [文本](https://)
 *  Ctrl+1 ~ 6      标题 H1~H6（同键再按取消，异键切换层级）
 */

import { EditorSelection, Prec } from "@codemirror/state";
import { EditorView, keymap, type Command } from "@codemirror/view";

/* ---------- 行内标记 ---------- */

/** 行内标记包裹 / 取消 */
function toggleWrap(marker: string): Command {
  const len = marker.length;
  return (view: EditorView): boolean => {
    const { state } = view;
    const sel = state.selection.main;
    const doc = state.doc;

    /* 选区（或空选区光标点）两侧已是标记 → 取消包裹 */
    const before = doc.sliceString(Math.max(0, sel.from - len), sel.from);
    const after = doc.sliceString(sel.to, Math.min(doc.length, sel.to + len));
    if (before === marker && after === marker) {
      view.dispatch({
        changes: [
          { from: sel.from - len, to: sel.from },
          { from: sel.to, to: sel.to + len },
        ],
        selection: EditorSelection.range(sel.from - len, sel.to - len),
      });
      return true;
    }

    /* 空选区：插入标记对，光标落在中间（便于直接输入内容） */
    if (sel.empty) {
      view.dispatch({
        changes: { from: sel.from, insert: marker + marker },
        selection: EditorSelection.cursor(sel.from + len),
      });
      return true;
    }

    /* 有选区：包裹并保持文本选中（便于连续叠加斜体等） */
    view.dispatch({
      changes: [
        { from: sel.from, insert: marker },
        { from: sel.to, insert: marker },
      ],
      selection: EditorSelection.range(sel.from + len, sel.to + len),
    });
    return true;
  };
}

export const cmdBold = toggleWrap("**");
export const cmdItalic = toggleWrap("*");
export const cmdCode = toggleWrap("`");
export const cmdStrike = toggleWrap("~~");

/** 选中态判断：光标 / 选区两侧是否已是该标记（与 toggleWrap 的取消条件一致） */
export function hasWrap(view: EditorView, marker: string): boolean {
  const { state } = view;
  const sel = state.selection.main;
  const doc = state.doc;
  const len = marker.length;
  const before = doc.sliceString(Math.max(0, sel.from - len), sel.from);
  const after = doc.sliceString(sel.to, Math.min(doc.length, sel.to + len));
  return before === marker && after === marker;
}

/* ---------- 链接 ---------- */

/** 链接：选区作为链接文字；无选区时光标落在方括号内 */
export const cmdLink: Command = (view: EditorView): boolean => {
  const sel = view.state.selection.main;
  if (sel.empty) {
    view.dispatch({
      changes: { from: sel.from, insert: "[](https://)" },
      selection: EditorSelection.cursor(sel.from + 1),
    });
    return true;
  }
  const text = view.state.sliceDoc(sel.from, sel.to);
  const urlStart = sel.from + 1 + text.length + 2; // '[' + 文本 + '](' 之后
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: `[${text}](https://)` },
    selection: EditorSelection.range(urlStart, urlStart + "https://".length), // 选中占位 URL 便于直接粘贴替换
  });
  return true;
};

/* ---------- 标题 ---------- */

/** 标题：设置 / 切换 / 取消当前行（多行选区取首行）的 # 前缀 */
export function toggleHeading(level: number): Command {
  return (view: EditorView): boolean => {
    const { state } = view;
    const sel = state.selection.main;
    const line = state.doc.lineAt(sel.from);
    const matched = /^(#{1,6})(\s+)?/.exec(line.text);
    const current = matched ? matched[1].length : 0;

    let insert: string;
    if (current === level) {
      insert = ""; // 同级再按 → 取消标题
    } else {
      insert = "#".repeat(level) + " ";
    }

    const removed = matched ? matched[0].length : 0;
    /* 光标保持行内相对位置（越界时钳到行尾） */
    const head = Math.min(Math.max(sel.head - removed + insert.length, line.from), line.from + line.text.length - removed + insert.length);
    view.dispatch({
      changes: { from: line.from, to: line.from + removed, insert },
      selection: EditorSelection.cursor(head),
    });
    return true;
  };
}

export const cmdH1 = toggleHeading(1);
export const cmdH2 = toggleHeading(2);
export const cmdH3 = toggleHeading(3);
export const cmdH4 = toggleHeading(4);
export const cmdH5 = toggleHeading(5);
export const cmdH6 = toggleHeading(6);

/** 选中态判断：光标所在行的标题层级（0 = 非标题） */
export function headingLevelAt(view: EditorView): number {
  const m = /^(#{1,6})(\s+)?/.exec(view.state.doc.lineAt(view.state.selection.main.from).text);
  return m ? m[1].length : 0;
}

/* ---------- 块级前缀（引用 / 列表，多行选区逐行处理） ---------- */

const QUOTE_RE = /^>\s?/;
const UL_RE = /^[-*+]\s+/;
const OL_RE = /^\d+\.\s+/;
const ANY_BLOCK_RE = /^(?:>\s?|[-*+]\s+|\d+\.\s+)/;

/** 选区覆盖的行（从首行到末行，空行跳过不修改） */
function selectedLines(view: EditorView) {
  const { state } = view;
  const sel = state.selection.main;
  const first = state.doc.lineAt(sel.from);
  const last = state.doc.lineAt(sel.to);
  const lines: { from: number; to: number; text: string }[] = [];
  for (let n = first.number; n <= last.number; n++) {
    lines.push(state.doc.line(n));
  }
  return lines;
}

type BlockKind = "quote" | "ul" | "ol";

function blockRe(kind: BlockKind): RegExp {
  return kind === "quote" ? QUOTE_RE : kind === "ul" ? UL_RE : OL_RE;
}

/**
 * 块前缀切换：选区内所有非空行都已是目标前缀 → 整体取消；
 * 否则逐行剥掉已有的引用 / 列表前缀后加上目标前缀（有序列表自动编号）。
 */
function toggleBlock(kind: BlockKind): Command {
  return (view: EditorView): boolean => {
    const lines = selectedLines(view);
    const solid = lines.filter((l) => l.text.trim() !== "");
    if (solid.length === 0) return false;

    const re = blockRe(kind);
    const remove = solid.every((l) => re.test(l.text));
    const changes: { from: number; to: number; insert: string }[] = [];
    let seq = 0;
    for (const l of lines) {
      if (l.text.trim() === "") continue; // 空行不动，保持段落间隔
      if (remove) {
        changes.push({ from: l.from, to: l.from + re.exec(l.text)![0].length, insert: "" });
      } else {
        const strip = ANY_BLOCK_RE.exec(l.text);
        const prefix = kind === "quote" ? "> " : kind === "ul" ? "- " : `${++seq}. `;
        changes.push({ from: l.from, to: l.from + (strip ? strip[0].length : 0), insert: prefix });
      }
    }
    /* 不显式指定选区：由 changes 自动映射，行内相对位置保持 */
    view.dispatch({ changes });
    return true;
  };
}

export const cmdQuote = toggleBlock("quote");
export const cmdUl = toggleBlock("ul");
export const cmdOl = toggleBlock("ol");

/** 选中态判断：选区覆盖的非空行是否全部带目标块前缀 */
export function inBlock(view: EditorView, kind: BlockKind): boolean {
  const solid = selectedLines(view).filter((l) => l.text.trim() !== "");
  if (solid.length === 0) return false;
  const re = blockRe(kind);
  return solid.every((l) => re.test(l.text));
}

/* ---------- 插入类（表格 / 分隔线） ---------- */

export const cmdTable: Command = (view: EditorView): boolean => {
  const sel = view.state.selection.main;
  const line = view.state.doc.lineAt(sel.from);
  const lead = line.text.trim() === "" ? "" : "\n\n"; // 行内已有内容则先断行
  const trail = sel.to >= line.to ? "" : "\n"; // 光标在行中时补换行，避免同行粘连
  const table = "| 标题 | 标题 | 标题 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |";
  view.dispatch({ changes: { from: sel.from, to: sel.to, insert: lead + table + trail } });
  return true;
};

export const cmdHr: Command = (view: EditorView): boolean => {
  const sel = view.state.selection.main;
  const line = view.state.doc.lineAt(sel.from);
  const lead = line.text.trim() === "" ? "" : "\n\n";
  view.dispatch({ changes: { from: sel.from, to: sel.to, insert: `${lead}---\n\n` } });
  return true;
};

/* ---------- 键表（供 editor.ts 挂载，Prec.highest 覆盖 lang-markdown 默认行为） ---------- */

export const formatKeymap = Prec.highest(
  keymap.of([
    { key: "Mod-b", run: cmdBold },
    { key: "Mod-i", run: cmdItalic },
    { key: "Mod-e", run: cmdCode },
    { key: "Mod-Shift-x", run: cmdStrike },
    { key: "Mod-k", run: cmdLink },
    { key: "Mod-1", run: cmdH1 },
    { key: "Mod-2", run: cmdH2 },
    { key: "Mod-3", run: cmdH3 },
    { key: "Mod-4", run: cmdH4 },
    { key: "Mod-5", run: cmdH5 },
    { key: "Mod-6", run: cmdH6 },
  ]),
);
