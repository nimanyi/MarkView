/**
 * 自定义右键菜单：屏蔽 WebView 自带的默认菜单
 * （含「查看网页源代码 / 检查 / 属性」等开发项，不给最终用户看到），
 * 按点击位置换成应用自己的轻量菜单：
 *
 *   - 编辑器内：剪切 / 复制 / 粘贴 / 全选（操作 CodeMirror 文档）
 *   - 输入框（如侧栏搜索框）：剪切 / 复制 / 粘贴 / 全选
 *   - 链接上：复制链接地址（同屏选中文本时附「复制」）
 *   - 其他位置选中文本：复制
 *
 * 发布构建另拦截 Ctrl+U（查看源代码）与 Ctrl+R / F5（整页刷新会丢编辑状态）。
 */

import type { EditorView } from "@codemirror/view";

/** 菜单项（导出供标签条等处复用） */
export interface CtxMenuItem {
  label: string;
  disabled?: boolean;
  run(): void;
}

export type CtxMenuEntry = CtxMenuItem | "sep";

type Entry = CtxMenuEntry;

/* ---------- 菜单单例 ---------- */

let menuEl: HTMLDivElement | null = null;

function hideMenu(): void {
  if (menuEl) menuEl.hidden = true;
}

function ensureMenu(): HTMLDivElement {
  if (menuEl) return menuEl;
  const menu = document.createElement("div");
  menu.className = "ctx-menu";
  menu.role = "menu";
  document.body.appendChild(menu);
  menuEl = menu;

  /* 关闭时机：点菜单外（capture，先于菜单项处理）/ Esc / 任意滚动 / 失焦 / 缩放 */
  window.addEventListener(
    "mousedown",
    (e) => {
      if (e.target instanceof Node && !menu.contains(e.target)) hideMenu();
    },
    true,
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") hideMenu();
    },
    true,
  );
  window.addEventListener("scroll", hideMenu, true);
  window.addEventListener("blur", hideMenu);
  window.addEventListener("resize", hideMenu);
  return menu;
}

/** 显示菜单（单例复用），自动防视口溢出。供本模块与标签条右键菜单共用。 */
export function showContextMenu(items: CtxMenuEntry[], x: number, y: number): void {
  const menu = ensureMenu();
  const frag = document.createDocumentFragment();
  for (const entry of items) {
    if (entry === "sep") {
      const sep = document.createElement("div");
      sep.className = "ctx-sep";
      frag.appendChild(sep);
      continue;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ctx-item";
    btn.textContent = entry.label;
    btn.disabled = !!entry.disabled;
    btn.addEventListener("mousedown", (e) => e.preventDefault()); // 不抢编辑器焦点
    btn.addEventListener("click", () => {
      hideMenu();
      entry.run();
    });
    frag.appendChild(btn);
  }
  menu.replaceChildren(frag);
  menu.hidden = false;

  /* 防溢出：贴近视口右 / 下缘时往回收 */
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(4, Math.min(x, window.innerWidth - rect.width - 8))}px`;
  menu.style.top = `${Math.max(4, Math.min(y, window.innerHeight - rect.height - 8))}px`;
}

/* ---------- 剪贴板 ---------- */

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    document.execCommand("copy"); // 兜底：复制当前 DOM 选区
  }
}

/** 读剪贴板；权限被拒时返回 null（用户仍可用 Ctrl+V） */
async function readClipboard(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

/* ---------- 各位置的菜单内容 ---------- */

function editorItems(view: EditorView): Entry[] {
  const sel = view.state.selection.main;
  const hasSel = !sel.empty;
  return [
    {
      label: "剪切",
      disabled: !hasSel,
      run: () => {
        void copyText(view.state.sliceDoc(sel.from, sel.to));
        view.dispatch({ changes: { from: sel.from, to: sel.to } });
      },
    },
    {
      label: "复制",
      disabled: !hasSel,
      run: () => void copyText(view.state.sliceDoc(sel.from, sel.to)),
    },
    {
      label: "粘贴",
      run: () => {
        void readClipboard().then((text) => {
          if (text === null) return;
          view.focus();
          view.dispatch(view.state.replaceSelection(text));
        });
      },
    },
    "sep",
    {
      label: "全选",
      run: () => {
        view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
        view.focus();
      },
    },
  ];
}

function fieldItems(field: HTMLInputElement): Entry[] {
  const start = field.selectionStart ?? 0;
  const end = field.selectionEnd ?? 0;
  const hasSel = start !== end;
  const changed = (): void => {
    field.dispatchEvent(new Event("input", { bubbles: true }));
  };
  return [
    {
      label: "剪切",
      disabled: !hasSel,
      run: () => {
        void copyText(field.value.slice(start, end));
        field.setRangeText("", start, end, "end");
        changed();
      },
    },
    {
      label: "复制",
      disabled: !hasSel,
      run: () => void copyText(field.value.slice(start, end)),
    },
    {
      label: "粘贴",
      run: () => {
        void readClipboard().then((text) => {
          if (text === null) return;
          field.focus();
          field.setRangeText(text, start, end, "end");
          changed();
        });
      },
    },
    "sep",
    {
      label: "全选",
      run: () => {
        field.focus();
        field.select();
      },
    },
  ];
}

/** 预览等区域：选中文本给「复制」，链接给「复制链接地址」 */
function plainItems(target: HTMLElement): Entry[] {
  const items: Entry[] = [];
  const selText = window.getSelection()?.toString() ?? "";
  if (selText) {
    items.push({ label: "复制", run: () => void copyText(selText) });
  }
  const link = target.closest("a");
  if (link && link.href) {
    if (items.length > 0) items.push("sep");
    items.push({ label: "复制链接地址", run: () => void copyText(link.href) });
  }
  return items;
}

/* ---------- 发布构建：拦浏览器加速键 ---------- */

function blockBrowserAccelerators(): void {
  if (import.meta.env.DEV) return; // 开发构建保留浏览器行为，便于调试
  window.addEventListener("keydown", (e) => {
    /* Ctrl+U 查看源代码；Ctrl+R / Ctrl+Shift+R / F5 整页刷新（丢编辑状态） */
    const ctrl = e.ctrlKey && !e.altKey && !e.metaKey;
    const key = e.key.toLowerCase();
    if ((ctrl && (key === "u" || key === "r")) || e.key === "F5") e.preventDefault();
  });
}

/* ---------- 装配 ---------- */

export function initContextMenu(view: EditorView): void {
  window.addEventListener("contextmenu", (e) => {
    e.preventDefault(); // 永远屏蔽 WebView 默认菜单（源代码 / 检查 / 属性等）

    const target = e.target instanceof HTMLElement ? e.target : null;
    if (!target) return;
    /* 原生对话框在 top-layer，会盖住自绘菜单：屏蔽默认菜单后不再弹 */
    if (target.closest("dialog[open]")) return;

    let items: Entry[];
    if (target.closest(".cm-content")) {
      items = editorItems(view);
    } else {
      const field = target.closest<HTMLInputElement>("input");
      items = field ? fieldItems(field) : plainItems(target);
    }
    if (items.length > 0) showContextMenu(items, e.clientX, e.clientY);
  });

  blockBrowserAccelerators();
}
