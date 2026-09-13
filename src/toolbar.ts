/**
 * 编辑区顶部排版工具栏。
 *
 *  - 按钮与 format.ts 的排版命令同源（和快捷键行为完全一致）；
 *  - 随光标 / 选区实时高亮当前格式（active 态由 main.ts 的光标回调驱动）；
 *  - 显隐状态持久化：工具栏右侧「收起」按钮、隐藏后右上角的「展开」按钮，
 *    以及 Alt+T 全局切换（Alt 系快捷键不走 shortcut.ts 的 Ctrl 注册表）。
 */

import { EditorView, type Command } from "@codemirror/view";
import {
  cmdBold,
  cmdCode,
  cmdH1,
  cmdH2,
  cmdH3,
  cmdHr,
  cmdItalic,
  cmdLink,
  cmdOl,
  cmdQuote,
  cmdStrike,
  cmdTable,
  cmdUl,
  hasWrap,
  headingLevelAt,
  inBlock,
} from "./format";

const STORAGE_KEY = "mdviewer.format-bar";

/* ---------- 字形（文本样式按钮） ---------- */

const G = {
  bold: `<span class="g-b">B</span>`,
  italic: `<span class="g-i">I</span>`,
  strike: `<span class="g-s">S</span>`,
  code: `<span class="g-code">&lt;/&gt;</span>`,
  quote: `<span class="g-q">&ldquo;</span>`,
  h1: `<span class="g-h">H1</span>`,
  h2: `<span class="g-h">H2</span>`,
  h3: `<span class="g-h">H3</span>`,
};

/* ---------- 图标（线性 SVG，跟随 currentColor） ---------- */

const svg = (inner: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const num = (y: number, t: string): string =>
  `<text x="2" y="${y}" font-size="7.5" font-weight="600" fill="currentColor" stroke="none">${t}</text>`;

const ICONS = {
  link: svg(
    `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>` +
      `<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  ),
  ul: svg(
    `<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>` +
      `<circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none"/>` +
      `<circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>` +
      `<circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none"/>`,
  ),
  ol: svg(
    `<line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/>` +
      num(8.5, "1") + num(14.5, "2") + num(20.5, "3"),
  ),
  table: svg(
    `<rect x="3" y="4" width="18" height="16" rx="2"/>` +
      `<line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="4" x2="12" y2="20"/>`,
  ),
  hr: svg(`<line x1="4" y1="12" x2="20" y2="12"/>`),
  hide: svg(`<polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>`),
};

/* ---------- 按钮声明（顺序即展示顺序） ---------- */

interface Def {
  title: string;
  html: string;
  run: Command;
  active?: (view: EditorView) => boolean;
}

type Item = Def | "sep" | "spacer";

const DEFS: Item[] = [
  { title: "加粗（Ctrl+B）", html: G.bold, run: cmdBold, active: (v) => hasWrap(v, "**") },
  { title: "斜体（Ctrl+I）", html: G.italic, run: cmdItalic, active: (v) => hasWrap(v, "*") },
  { title: "删除线（Ctrl+Shift+X）", html: G.strike, run: cmdStrike, active: (v) => hasWrap(v, "~~") },
  { title: "行内代码（Ctrl+E）", html: G.code, run: cmdCode, active: (v) => hasWrap(v, "`") },
  "sep",
  { title: "链接（Ctrl+K）", html: ICONS.link, run: cmdLink },
  { title: "引用块", html: G.quote, run: cmdQuote, active: (v) => inBlock(v, "quote") },
  { title: "无序列表", html: ICONS.ul, run: cmdUl, active: (v) => inBlock(v, "ul") },
  { title: "有序列表", html: ICONS.ol, run: cmdOl, active: (v) => inBlock(v, "ol") },
  "sep",
  { title: "标题 H1（Ctrl+1）", html: G.h1, run: cmdH1, active: (v) => headingLevelAt(v) === 1 },
  { title: "标题 H2（Ctrl+2）", html: G.h2, run: cmdH2, active: (v) => headingLevelAt(v) === 2 },
  { title: "标题 H3（Ctrl+3）", html: G.h3, run: cmdH3, active: (v) => headingLevelAt(v) === 3 },
  "sep",
  { title: "插入表格", html: ICONS.table, run: cmdTable },
  { title: "插入分隔线", html: ICONS.hr, run: cmdHr },
  "spacer",
];

/* ---------- 高亮刷新（main.ts 的光标 / 文档回调中调用） ---------- */

let activeButtons: { btn: HTMLButtonElement; active: (view: EditorView) => boolean }[] = [];

export function updateFormatBar(view: EditorView): void {
  for (const { btn, active } of activeButtons) {
    btn.classList.toggle("active", active(view));
  }
}

/* ---------- 装配 ---------- */

export interface FormatBarElements {
  view: EditorView;
  bar: HTMLElement;
  editorHost: HTMLElement;
  showBtn: HTMLElement;
}

export function initFormatBar(el: FormatBarElements): void {
  const { view, bar, editorHost, showBtn } = el;

  for (const item of DEFS) {
    if (item === "sep") {
      const sep = document.createElement("span");
      sep.className = "fmt-sep";
      bar.appendChild(sep);
    } else if (item === "spacer") {
      const sp = document.createElement("span");
      sp.className = "fmt-spacer";
      bar.appendChild(sp);
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fmt-btn";
      btn.title = item.title;
      btn.setAttribute("aria-label", item.title);
      btn.innerHTML = item.html;
      /* 阻止按钮抢焦点：点击后光标仍留在编辑器里 */
      btn.addEventListener("mousedown", (e) => e.preventDefault());
      btn.addEventListener("click", () => item.run(view));
      if (item.active) activeButtons.push({ btn, active: item.active });
      bar.appendChild(btn);
    }
  }

  let visible = localStorage.getItem(STORAGE_KEY) !== "0";
  const setVisible = (v: boolean): void => {
    visible = v;
    editorHost.classList.toggle("no-format-bar", !v);
    showBtn.hidden = v;
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  };

  /* 收起按钮（工具栏右端） */
  const hideBtn = document.createElement("button");
  hideBtn.type = "button";
  hideBtn.className = "fmt-btn fmt-hide";
  hideBtn.title = "隐藏工具栏（Alt+T 显示）";
  hideBtn.setAttribute("aria-label", "隐藏工具栏");
  hideBtn.innerHTML = ICONS.hide;
  hideBtn.addEventListener("mousedown", (e) => e.preventDefault());
  hideBtn.addEventListener("click", () => setVisible(false));
  bar.appendChild(hideBtn);

  /* 隐藏后的展开按钮（编辑区右上角） */
  showBtn.addEventListener("mousedown", (e) => e.preventDefault());
  showBtn.addEventListener("click", () => {
    setVisible(true);
    view.focus();
  });

  /* Alt+T：显隐切换（不走 shortcut.ts 的 Ctrl 注册表） */
  window.addEventListener("keydown", (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === "t") {
      e.preventDefault();
      setVisible(!visible);
    }
  });

  setVisible(visible);
  updateFormatBar(view);
}
