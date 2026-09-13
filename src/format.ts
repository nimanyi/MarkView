/**
 * Markdown 格式化快捷键（编辑器内生效，CodeMirror keymap）。
 *
 * 与 @codemirror/lang-markdown 自带 keymap（只插入标记）不同，
 * 这里用 Prec.highest 覆盖为 toggle 语义：已包裹则取消，未包裹则添加。
 *
 *  Ctrl+B          加粗 **…**
 *  Ctrl+I          斜体 *…*
 *  Ctrl+E          行内代码 `…`
 *  Ctrl+Shift+X    删除线 ~~…~~
 *  Ctrl+K          链接 [文本](https://)
 *  Ctrl+1 ~ 6      标题 H1~H6（同键再按取消，异键切换层级）
 */

import { EditorSelection, Prec } from "@codemirror/state";
import { EditorView, keymap, type Command } from "@codemirror/view";

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

/** 链接：选区作为链接文字；无选区时光标落在方括号内 */
const insertLink: Command = (view: EditorView): boolean => {
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

/** 标题：设置 / 切换 / 取消当前行（多行选区取首行）的 # 前缀 */
function toggleHeading(level: number): Command {
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

/** 供 editor.ts 挂载的高优先级键表（覆盖 lang-markdown 默认行为） */
export const formatKeymap = Prec.highest(
  keymap.of([
    { key: "Mod-b", run: toggleWrap("**") },
    { key: "Mod-i", run: toggleWrap("*") },
    { key: "Mod-e", run: toggleWrap("`") },
    { key: "Mod-Shift-x", run: toggleWrap("~~") },
    { key: "Mod-k", run: insertLink },
    { key: "Mod-1", run: toggleHeading(1) },
    { key: "Mod-2", run: toggleHeading(2) },
    { key: "Mod-3", run: toggleHeading(3) },
    { key: "Mod-4", run: toggleHeading(4) },
    { key: "Mod-5", run: toggleHeading(5) },
    { key: "Mod-6", run: toggleHeading(6) },
  ]),
);
