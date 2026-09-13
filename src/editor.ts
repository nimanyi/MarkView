import { basicSetup } from "codemirror";
import { EditorView, keymap, type ViewUpdate } from "@codemirror/view";
import { Compartment } from "@codemirror/state";
import { indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";

import { formatKeymap } from "./format";

export type { EditorView } from "@codemirror/view";

/** 编辑器事件回调 */
export interface EditorHooks {
  /** 文档内容变化（输入、删除、粘贴等） */
  onDocChange(view: EditorView): void;
  /** 光标 / 选区变化 */
  onCursorMove(view: EditorView): void;
}

/** 主题舱室：系统深浅色切换时 reconfigure，无需重建编辑器 */
const themeComp = new Compartment();

/** 基础外观：跟随应用的字体与行高设定（深浅色通用；字号经 CSS 变量由设置面板调节） */
const baseTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "var(--editor-font-size, 14px)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily:
      "'JetBrains Mono', 'Cascadia Code', Consolas, 'PingFang SC', monospace",
    lineHeight: "1.7",
  },
  ".cm-content": { padding: "10px 4px 30vh" },
  ".cm-gutters": { border: "none", userSelect: "none" },
});

function preferDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * 在给定容器内创建 CodeMirror 6 Markdown 编辑器。
 * initialDark 指定初始深浅色（由 theme.ts 决定），后续经 applyEditorTheme 切换。
 */
export function createEditor(
  parent: HTMLElement,
  initialDoc: string,
  hooks: EditorHooks,
  initialDark = preferDark(),
): EditorView {
  const view = new EditorView({
    doc: initialDoc,
    parent,
    extensions: [
      basicSetup,
      keymap.of([indentWithTab]),
      /* Markdown 格式快捷键：toggle 语义（加粗/标题/链接等，见 format.ts），
         内部用 Prec.highest 覆盖 lang-markdown 自带的“仅插入”keymap */
      formatKeymap,
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
        addKeymap: true,
      }),
      EditorView.lineWrapping,
      baseTheme,
      themeComp.of(initialDark ? oneDark : []),
      EditorView.updateListener.of((u: ViewUpdate) => {
        if (u.docChanged) hooks.onDocChange(u.view);
        if (u.selectionSet || u.docChanged) hooks.onCursorMove(u.view);
      }),
    ],
  });

  return view;
}

/** 运行时切换编辑器深浅色主题（theme.ts 调用，Compartment 重配无需重建） */
export function applyEditorTheme(view: EditorView, dark: boolean): void {
  view.dispatch({
    effects: themeComp.reconfigure(dark ? oneDark : []),
  });
}

/** 整体替换编辑器内容（打开文件 / 恢复文档） */
export function setDocText(view: EditorView, text: string): void {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
  });
}

/** 当前文档全文 */
export function getDocText(view: EditorView): string {
  return view.state.doc.toString();
}

/** 光标位置描述："行 N，列 M" */
export function cursorLabel(view: EditorView): string {
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  return `行 ${line.number}，列 ${head - line.from + 1}`;
}
