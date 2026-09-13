import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";
import { EditorView } from "@codemirror/view";
import "katex/dist/katex.min.css";
import {
  applyEditorTheme,
  createEditor,
  cursorLabel,
  getDocText,
  setDocText,
} from "./editor";
import {
  baseName,
  pickOpenPath,
  pickSavePath,
  readTextFile,
  writeTextFile,
} from "./files";
import {
  buildStandaloneHtml,
  exportHtmlFile,
  printStandaloneHtml,
  suggestExportName,
} from "./exporter";
import { createSidebar, type Sidebar } from "./sidebar";
import { bindSyncScroll } from "./scroll";
import { installShortcuts } from "./shortcut";
import { initSplitter } from "./splitter";
import { cycleViewMode, initViewMode, togglePreview } from "./layout";
import { initFormatBar, updateFormatBar } from "./toolbar";
import { initContextMenu } from "./contextmenu";
import {
  activate,
  activeTab,
  activateNext,
  closeActiveTab,
  dirtyLabel,
  dirtyTabs,
  findTab,
  initTabs,
  markActiveText,
  openTab,
  refreshTabs,
  tabLabel,
  type TabState,
} from "./tabs";
import { getSettings, initSettingsDialog, openSettingsDialog } from "./settings";
import { checkForUpdates, updateErrorText } from "./updater";
import { enhancePreview } from "./enhance";
import { extractOutline, gotoOutlineItem } from "./outline";
import {
  currentMode,
  cycleTheme,
  initTheme,
  isDark,
  themeLabel,
  type ThemeMode,
} from "./theme";

const preview = document.querySelector<HTMLElement>("#preview")!;
const editorHost = document.querySelector<HTMLElement>("#editor-host")!;
const cmHost = document.querySelector<HTMLElement>("#cm-host")!;
const formatBarEl = document.querySelector<HTMLElement>("#format-bar")!;
const formatBarShow = document.querySelector<HTMLButtonElement>("#format-bar-show")!;
const fileNameEl = document.querySelector<HTMLElement>("#file-name")!;
const saveHintEl = document.querySelector<HTMLElement>("#save-hint")!;
const statPosEl = document.querySelector<HTMLElement>("#stat-pos")!;
const statCountEl = document.querySelector<HTMLElement>("#stat-count")!;
const sidebarTitleEl = document.querySelector<HTMLElement>("#sidebar-title")!;
const outlineListEl = document.querySelector<HTMLElement>("#outline-list")!;
const outlineEmptyEl = document.querySelector<HTMLElement>("#outline-empty")!;
const searchInputEl = document.querySelector<HTMLInputElement>("#search-input")!;
const searchResultsEl = document.querySelector<HTMLElement>("#search-results")!;
const btnNew = document.querySelector<HTMLButtonElement>("#btn-new")!;
const btnOpen = document.querySelector<HTMLButtonElement>("#btn-open")!;
const btnOpenDir = document.querySelector<HTMLButtonElement>("#btn-open-dir")!;
const btnSave = document.querySelector<HTMLButtonElement>("#btn-save")!;
const btnSaveAs = document.querySelector<HTMLButtonElement>("#btn-save-as")!;
const btnExportHtml = document.querySelector<HTMLButtonElement>("#btn-export-html")!;
const btnExportPdf = document.querySelector<HTMLButtonElement>("#btn-export-pdf")!;
const btnSettings = document.querySelector<HTMLButtonElement>("#btn-settings")!;
const btnHelp = document.querySelector<HTMLButtonElement>("#btn-help")!;
const btnTheme = document.querySelector<HTMLButtonElement>("#btn-theme")!;
const btnToggleSidebar = document.querySelector<HTMLButtonElement>("#btn-toggle-sidebar")!;
const btnRefreshTree = document.querySelector<HTMLButtonElement>("#btn-refresh-tree")!;
const btnUpdate = document.querySelector<HTMLButtonElement>("#btn-update")!;
const appVersionEl = document.querySelector<HTMLElement>("#app-version")!;
const unsavedDlg = document.querySelector<HTMLDialogElement>("#unsaved-dialog")!;
const unsavedText = document.querySelector<HTMLElement>("#unsaved-text")!;
const helpDlg = document.querySelector<HTMLDialogElement>("#help-dialog")!;
const helpVersionEl = document.querySelector<HTMLElement>("#help-version")!;

const win = getCurrentWindow();

/** 欢迎文档：无文件打开时的示例内容 */
const SAMPLE = `# 欢迎使用 MDViewer

> 左侧编辑，右侧实时预览。解析由 **Rust 端 comrak** 完成。

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| Ctrl+N | 新建文档 |
| Ctrl+O | 打开文件 |
| Ctrl+Shift+O | 打开文件夹（文件树） |
| Ctrl+S | 保存 |
| Ctrl+Shift+S | 另存为 |
| Ctrl+W | 关闭标签页 |
| Ctrl+Tab / Ctrl+Shift+Tab | 切换标签 |
| Ctrl+Shift+E | 导出 HTML |
| Ctrl+P | 打印 / 导出 PDF |
| Ctrl+\\ | 切换侧边栏 |
| Ctrl+Shift+V | 切换视图（双栏 / 仅编辑 / 仅预览） |
| Ctrl+Shift+D | 隐藏 / 显示预览（仅编辑 ↔ 双栏） |
| Alt+T | 显示 / 隐藏排版工具栏 |
| Ctrl+, | 设置（主题 / 视图 / 字号 / 同步滚动 / 自动保存） |
| Ctrl+Shift+H | 使用说明 |
| Ctrl+Shift+L | 切换主题 |
| Ctrl+Shift+F | 全文搜索 |
| Ctrl+Shift+U | 检查更新 |

## 编辑排版（光标在编辑器内时）

| 快捷键 | 功能 |
| --- | --- |
| Ctrl+B | 加粗（再按取消） |
| Ctrl+I | 斜体 |
| Ctrl+E | 行内代码 |
| Ctrl+Shift+X | 删除线 |
| Ctrl+K | 插入链接（选区作文字） |
| Ctrl+1 ~ Ctrl+6 | 设为 H1~H6 标题（同键再按取消） |

> 选中文字后按包裹类快捷键直接加标记；未选中则插入标记对，光标落在中间。
> 中缝分隔条可左右拖动调节编辑 / 预览宽度，双击复位。
> 按 \`Ctrl+Shift+V\` 可在双栏 / 仅编辑 / 仅预览之间循环切换（设置面板中同样可选）。
> 右键菜单按位置提供剪切 / 复制 / 粘贴、复制链接等操作；浏览器默认菜单（查看源代码 / 检查等）已屏蔽。
> 从文件打开的文档默认自动保存：停止输入 2 秒后写回原文件，可在设置（Ctrl+,）中关闭。

## 多标签

可同时打开多份文档：点击标签切换，Ctrl+Tab / Ctrl+Shift+Tab 循环切换，
Ctrl+W 或中键点击关闭当前标签。标签左端圆点亮起表示该文档有未保存修改；
右键标签可批量关闭：关闭左侧 / 右侧 / 其他 / 所有（含未保存修改时统一确认一次）；
打开新文件不会打断当前编辑——旧文档连同修改一起留在后台标签。

## 排版工具栏

编辑区顶部有一排排版按钮（加粗、斜体、引用、列表、标题、表格、分隔线等），
与上表快捷键完全同源，并随光标位置高亮当前格式。点击工具栏右侧的收起按钮
或按 \`Alt+T\` 可隐藏；隐藏后点编辑区右上角的 ▾ 或再按 \`Alt+T\` 展开。

## GFM 特性

- [x] 表格
- [x] 任务列表
- [x] 删除线（~~这样~~）
- [x] 自动链接：https://tauri.app
- [x] 数学公式与图表（见下方示例）

## 数学公式

行内公式 $E = mc^2$，块级公式：

$$
\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}
$$

## 流程图（Mermaid）

\`\`\`mermaid
flowchart LR
    A[编辑] --> B{Rust comrak 解析}
    B --> C[预览渲染]
    B --> D[导出 HTML / PDF]
\`\`\`

\`\`\`rust
#[tauri::command]
fn parse_markdown(source: String) -> String {
    comrak::markdown_to_html(&source, &options)
}
\`\`\`

按 \`Ctrl+O\` 打开你的第一份 Markdown 文档吧。
`;

/* ---------- 文档状态（多标签：路径与磁盘快照都存在标签里） ---------- */

function currentContent(): string {
  return getDocText(view);
}

function isDirty(): boolean {
  const tab = activeTab();
  return tab !== null && currentContent() !== tab.diskText;
}

function docName(): string {
  const tab = activeTab();
  return tab ? tabLabel(tab) : "未命名";
}

/** 同步窗口标题 / 顶栏文件名 / 状态提示 */
function syncChrome(): void {
  const name = docName();
  const dirty = isDirty();
  fileNameEl.textContent = name;
  fileNameEl.classList.toggle("dirty", dirty);
  saveHintEl.textContent = dirty ? "未保存" : "已保存";
  const title = `${dirty ? "* " : ""}${name} — MDViewer`;
  document.title = title;
  void win.setTitle(title).catch(() => {
    /* 标题权限缺失时静默降级（仅页面标题生效） */
  });
}

/* ---------- 预览渲染（150ms 防抖） ---------- */

let renderTimer: number | undefined;

function scheduleRender(): void {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => void renderPreview(), 150);
}

async function renderPreview(): Promise<void> {
  const html = await invoke<string>("parse_markdown", {
    source: currentContent(),
  });
  preview.innerHTML = html;
  await enhancePreview(preview); // 公式（KaTeX）与图表（Mermaid 懒加载）
  syncOutline();
}

/** 刷新大纲面板（预览渲染后调用，标题行号来自源码） */
function syncOutline(): void {
  const items = extractOutline(currentContent());
  outlineEmptyEl.hidden = items.length > 0;
  const frag = document.createDocumentFragment();
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "outline-item";
    row.dataset.level = String(item.level);
    row.textContent = item.text;
    row.title = item.text;
    row.addEventListener("click", () => gotoOutlineItem(view, preview, item));
    frag.appendChild(row);
  }
  outlineListEl.replaceChildren(frag);
}

/* ---------- 状态栏 ---------- */

function syncStats(view: EditorView): void {
  statPosEl.textContent = cursorLabel(view);
  const text = currentContent();
  statCountEl.textContent = `${text.length} 字符 · ${text.split("\n").length} 行`;
}

/* ---------- 未保存确认（三态） ---------- */

/** 未保存确认（三态）；displayName 由调用方带引号，兼容单个标签与「等 N 个文档」 */
function confirmUnsaved(displayName: string): Promise<"save" | "discard" | "cancel"> {
  return new Promise((resolve) => {
    unsavedText.textContent = `是否保存对${displayName}的更改？`;
    const done = (value: "save" | "discard" | "cancel") => {
      unsavedDlg.close(value);
    };
    const handler = (e: Event) => {
      const btn = (e.target as HTMLElement).closest("button");
      if (btn?.value) done(btn.value as "save" | "discard" | "cancel");
    };
    unsavedDlg.querySelector(".dialog-actions")!.addEventListener("click", handler, { once: true });
    unsavedDlg.addEventListener(
      "close",
      () => {
        resolve(unsavedDlg.returnValue as "save" | "discard" | "cancel" || "cancel");
      },
      { once: true },
    );
    unsavedDlg.showModal();
  });
}

/* ---------- 打开 / 新建 / 保存 ---------- */

/**
 * 打开指定路径的文件（文件树 / 对话框 / 搜索结果共用）：
 * 已有同路径标签则直接激活，否则新建标签——多标签下旧文档连同
 * 未保存修改留在后台，不再打断确认。
 */
async function openPath(path: string, gotoLine = 0): Promise<void> {
  try {
    const existing = findTab(path);
    if (existing) {
      if (existing.id === activeTab()?.id) return;
      activate(existing.id);
    } else {
      const content = await readTextFile(path);
      openTab(path, content);
    }
    if (gotoLine > 0) {
      const line = view.state.doc.line(Math.min(gotoLine, view.state.doc.lines));
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
      view.focus();
    }
  } catch (err) {
    saveHintEl.textContent = String(err);
  }
}

async function doOpen(): Promise<void> {
  const path = await pickOpenPath();
  if (path) await openPath(path);
}

/** 新建未命名标签（旧文档留在后台，无需确认） */
function doNew(): void {
  openTab(null, "");
}

/** 保存指定标签（可能是后台脏标签）：有路径直写，无路径走另存为 */
async function saveTab(tab: TabState): Promise<boolean> {
  const isActive = tab.id === activeTab()?.id;
  const text = isActive ? currentContent() : tab.text;
  if (tab.path) {
    try {
      tab.diskText = text;
      await writeTextFile(tab.path, text);
      refreshTabs();
      if (isActive) syncChrome();
      return true;
    } catch (err) {
      saveHintEl.textContent = String(err);
      return false;
    }
  }
  /* 未命名：走另存为 */
  const path = await pickSavePath(tabLabel(tab));
  if (!path) return false;
  try {
    tab.diskText = text;
    await writeTextFile(path, text);
    tab.path = path;
    refreshTabs();
    if (isActive) {
      syncChrome();
      sidebar.setCurrentPath(path);
    }
    void sidebar.refresh(); // 保存到树内的新位置后刷新文件树
    return true;
  } catch (err) {
    saveHintEl.textContent = String(err);
    return false;
  }
}

/** 保存当前标签：有路径直接写，无路径走另存为。返回是否成功。 */
async function doSave(): Promise<boolean> {
  const tab = activeTab();
  return tab ? saveTab(tab) : false;
}

async function doSaveAs(): Promise<boolean> {
  const tab = activeTab();
  if (!tab) return false;
  const path = await pickSavePath(tab.path ?? tabLabel(tab));
  if (!path) return false;
  try {
    const text = currentContent();
    tab.diskText = text;
    await writeTextFile(path, text);
    tab.path = path;
    refreshTabs();
    syncChrome();
    sidebar.setCurrentPath(path);
    void sidebar.refresh(); // 保存到树内的新位置后刷新文件树
    return true;
  } catch (err) {
    saveHintEl.textContent = String(err);
    return false;
  }
}

/* ---------- 自动保存（停止输入 2 秒后写回已打开的文件；设置可关） ---------- */

const AUTO_SAVE_DELAY = 2000;
let autoSaveTimer: number | undefined;

/** 取消待执行的自动保存（手动保存 / 切换文件 / 新建时调用） */
function cancelAutoSave(): void {
  window.clearTimeout(autoSaveTimer);
  autoSaveTimer = undefined;
}

/** 每次文档改动后重排：持续输入只会在停顿 2 秒后保存一次 */
function scheduleAutoSave(): void {
  cancelAutoSave();
  if (!getSettings().autoSave) return;
  if (activeTab()?.path == null || !isDirty()) return; // 未命名文档无处可写
  autoSaveTimer = window.setTimeout(() => void autoSaveNow(), AUTO_SAVE_DELAY);
}

async function autoSaveNow(): Promise<void> {
  if (activeTab()?.path == null || !isDirty()) return; // 等待期间可能已手动保存
  if (await doSave()) {
    saveHintEl.textContent = "已自动保存"; // 覆盖 syncChrome 的“已保存”，下次改动会刷新
  }
}

/* ---------- 导出（HTML / PDF） ---------- */

/** 导出为自包含 HTML：内嵌样式，正文与预览同源（comrak 渲染）。 */
async function doExportHtml(): Promise<void> {
  try {
    const ok = await exportHtmlFile(
      currentContent(),
      docName(),
      suggestExportName(docName(), ".html"),
    );
    if (ok) saveHintEl.textContent = "已导出 HTML";
  } catch (err) {
    saveHintEl.textContent = String(err);
  }
}

/**
 * 导出 PDF：经隐藏 iframe 调起 WebView 打印通道，
 * 在系统打印对话框中选择“另存为 PDF”。
 */
async function doExportPdf(): Promise<void> {
  try {
    const html = await buildStandaloneHtml(currentContent(), docName());
    printStandaloneHtml(html);
  } catch (err) {
    saveHintEl.textContent = String(err);
  }
}

/* ---------- 应用更新（下载完成后自动重启） ---------- */

let updateBusy = false;

async function doCheckUpdate(): Promise<void> {
  if (updateBusy) return;
  updateBusy = true;
  try {
    await checkForUpdates((text) => {
      saveHintEl.textContent = text;
    });
  } catch (err) {
    // 网络不可达 / 无更新服务器 / 签名不匹配等：降级为状态栏提示
    saveHintEl.textContent = updateErrorText(err);
    updateBusy = false;
  }
}

/* ---------- 主题（三态：跟随系统 / 浅色 / 深色） ---------- */

function updateThemeLabel(mode: ThemeMode): void {
  btnTheme.textContent = `主题：${themeLabel(mode)}`;
}

function doCycleTheme(): void {
  const mode = cycleTheme();
  updateThemeLabel(mode);
  applyEditorTheme(view, isDark(mode));
  scheduleRender(); // Mermaid 主题跟随：切换后重渲染预览
}

/* ---------- 侧边栏 ---------- */

function toggleSidebar(): void {
  document.body.classList.toggle("sidebar-hidden");
}

/** 切换侧边栏标签页（文件 / 大纲 / 搜索） */
function switchSidebarTab(name: string): void {
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".tab-btn")) {
    btn.classList.toggle("active", btn.dataset.tab === name);
  }
  for (const pane of document.querySelectorAll<HTMLElement>(".sidebar-pane")) {
    pane.hidden = pane.dataset.pane !== name;
  }
}

/** 打开文件夹并更新侧边栏标题为根目录名 */
async function doOpenFolder(): Promise<void> {
  await sidebar.openFolder();
  const root = sidebar.root();
  sidebarTitleEl.textContent = root ? baseName(root) : "文件";
}

const sidebar: Sidebar = createSidebar(
  document.querySelector<HTMLElement>("#file-tree")!,
  document.querySelector<HTMLElement>("#sidebar-empty")!,
  {
    onOpenFile: (path) => void openPath(path),
  },
);

/* ---------- 全文搜索（Rust 端递归扫描，结果点击跳行打开） ---------- */

interface SearchHit {
  path: string;
  line_no: number;
  line_text: string;
}

const SEARCH_LIMIT = 500;

/** 搜索面板空态 / 状态提示 */
function searchHint(text: string): void {
  const div = document.createElement("div");
  div.className = "sidebar-empty";
  div.textContent = text;
  searchResultsEl.replaceChildren(div);
}

/** 大小写不敏感高亮：匹配段包进 <mark>（大小写保持原文） */
function appendHighlighted(parent: HTMLElement, text: string, lower: string): void {
  let start = 0;
  for (;;) {
    const idx = text.toLowerCase().indexOf(lower, start);
    if (idx < 0) break;
    if (idx > start) {
      parent.appendChild(document.createTextNode(text.slice(start, idx)));
    }
    const mark = document.createElement("mark");
    mark.textContent = text.slice(idx, idx + lower.length);
    parent.appendChild(mark);
    start = idx + lower.length;
  }
  if (start < text.length) {
    parent.appendChild(document.createTextNode(text.slice(start)));
  }
}

async function runSearch(): Promise<void> {
  const root = sidebar.root();
  const pattern = searchInputEl.value.trim();
  if (!root) {
    searchHint("先打开文件夹（Ctrl+Shift+O）再搜索");
    return;
  }
  if (!pattern) {
    searchHint("输入关键词后回车搜索");
    return;
  }
  searchHint("搜索中…");
  try {
    const hits = await invoke<SearchHit[]>("search_in_dir", { root, pattern });
    if (hits.length === 0) {
      searchHint("没有匹配结果");
      return;
    }
    const lower = pattern.toLowerCase();
    const frag = document.createDocumentFragment();
    let groupPath: string | null = null;
    for (const hit of hits) {
      if (hit.path !== groupPath) {
        groupPath = hit.path;
        const title = document.createElement("div");
        title.className = "search-group-title";
        title.textContent = baseName(hit.path);
        title.title = hit.path;
        frag.appendChild(title);
      }
      const row = document.createElement("button");
      row.type = "button";
      row.className = "search-hit";
      const lineNo = document.createElement("span");
      lineNo.className = "hit-line";
      lineNo.textContent = `L${hit.line_no}`;
      row.appendChild(lineNo);
      appendHighlighted(row, hit.line_text, lower);
      row.addEventListener("click", () => void openPath(hit.path, hit.line_no));
      frag.appendChild(row);
    }
    if (hits.length >= SEARCH_LIMIT) {
      const cap = document.createElement("div");
      cap.className = "sidebar-empty";
      cap.textContent = `结果已达 ${SEARCH_LIMIT} 条上限，已截断`;
      frag.appendChild(cap);
    }
    searchResultsEl.replaceChildren(frag);
  } catch (err) {
    searchHint(String(err));
  }
}

/** Ctrl+Shift+F：确保侧栏可见并聚焦搜索框 */
function focusSearch(): void {
  document.body.classList.remove("sidebar-hidden");
  switchSidebarTab("search");
  searchInputEl.focus();
  searchInputEl.select();
}

/* ---------- 编辑器装配 ---------- */

// 主题先于编辑器初始化：setDark 回调在 view 创建后才会真正生效
let view!: EditorView;
const initialDark = initTheme((dark) => {
  applyEditorTheme(view, dark);
  scheduleRender(); // 系统主题切换：Mermaid 图表跟随明暗重渲染
});

view = createEditor(
  cmHost,
  "", // 初始为空：内容由第一个标签装载（见下方 openTab）
  {
    onDocChange(v) {
      markActiveText(getDocText(v)); // 实时快照到当前标签（dirty 圆点联动）
      scheduleRender();
      syncStats(v);
      syncChrome();
      scheduleAutoSave(); // 停止输入 2 秒后自动写回（设置可关）
    },
    onCursorMove(v) {
      statPosEl.textContent = cursorLabel(v);
      updateFormatBar(v); // 工具栏按钮高亮跟随光标 / 选区
    },
  },
  initialDark,
);

/* 多标签装配：快照 / 装载 / 保存 / 确认全部回调到主装配；
   欢迎文档作为第一个未命名标签装入 */
initTabs(document.querySelector<HTMLElement>("#tab-bar")!, {
  snapshot() {
    return {
      text: currentContent(),
      anchor: view.state.selection.main.anchor,
      head: view.state.selection.main.head,
      scrollTop: view.scrollDOM.scrollTop,
    };
  },
  load(tab) {
    cancelAutoSave(); // 旧标签的定时器不再属于新文档
    setDocText(view, tab.text); // 触发 onDocChange：预览 / 状态栏 / dirty 联动
    const clamp = (pos: number) => Math.min(Math.max(pos, 0), view.state.doc.length);
    view.dispatch({ selection: { anchor: clamp(tab.anchor), head: clamp(tab.head) } });
    requestAnimationFrame(() => {
      view.scrollDOM.scrollTop = tab.scrollTop; // 视口测量完成后再恢复滚动
    });
    sidebar.setCurrentPath(tab.path);
    syncChrome();
    view.focus();
  },
  save: (tab) => saveTab(tab),
  confirm: (tab) => confirmUnsaved(`“${tabLabel(tab)}”`),
  confirmMany: (label) => confirmUnsaved(label),
});
openTab(null, SAMPLE);

/* 编辑排版工具栏：按钮与快捷键同源（format.ts），显隐持久化，Alt+T 切换 */
initFormatBar({
  view,
  bar: formatBarEl,
  editorHost,
  showBtn: formatBarShow,
});

/* 右键菜单：屏蔽 WebView 默认菜单（查看源代码 / 检查 / 属性等），
   换成按位置的剪切 / 复制 / 粘贴 / 全选 / 复制链接 */
initContextMenu(view);

/* 设置面板：字号 / 同步滚动即时生效；主题改动联动编辑器与预览（同 doCycleTheme） */
initSettingsDialog({
  onTheme(mode) {
    applyEditorTheme(view, isDark(mode));
    updateThemeLabel(mode);
    scheduleRender(); // Mermaid 主题跟随：切换后重渲染预览
  },
});

/* 使用说明对话框：底部按钮或点击遮罩关闭 */
btnHelp.addEventListener("click", () => helpDlg.showModal());
helpDlg.querySelector(".dialog-actions")!.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("button")) helpDlg.close();
});
helpDlg.addEventListener("click", (e) => {
  if (e.target === helpDlg) helpDlg.close();
});

/* 同步滚动：编辑器与预览按比例双向联动 */
bindSyncScroll(view.scrollDOM, preview);

/* 分栏分隔条：拖动调节编辑 / 预览宽度（比例持久化，双击复位） */
initSplitter({
  panes: document.querySelector<HTMLElement>(".panes")!,
  sidebar: document.querySelector<HTMLElement>("#sidebar")!,
  editorHost,
  divider: document.querySelector<HTMLElement>("#pane-divider")!,
});

/* 视图模式：双栏 / 仅编辑 / 仅预览（Ctrl+Shift+V 循环，设置面板可选）；
   需在 splitter 之后初始化：切回双栏时由其恢复分栏比例 */
initViewMode({
  panes: document.querySelector<HTMLElement>(".panes")!,
  editorHost,
});

/* ---------- 按钮 ---------- */

btnNew.addEventListener("click", () => void doNew());
btnOpen.addEventListener("click", () => void doOpen());
btnOpenDir.addEventListener("click", () => void doOpenFolder());
btnSave.addEventListener("click", () => void doSave());
btnSaveAs.addEventListener("click", () => void doSaveAs());
btnExportHtml.addEventListener("click", () => void doExportHtml());
btnExportPdf.addEventListener("click", () => void doExportPdf());
btnSettings.addEventListener("click", () => openSettingsDialog());
btnTheme.addEventListener("click", doCycleTheme);
btnToggleSidebar.addEventListener("click", toggleSidebar);
btnRefreshTree.addEventListener("click", () => void sidebar.refresh());
searchInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") void runSearch();
});
for (const btn of document.querySelectorAll<HTMLButtonElement>(".tab-btn")) {
  btn.addEventListener("click", () => switchSidebarTab(btn.dataset.tab ?? ""));
}

/* ---------- 快捷键（表驱动，集中查阅） ---------- */

installShortcuts([
  { key: "n", label: "新建文档", run: () => void doNew() },
  { key: "o", label: "打开文件", run: () => void doOpen() },
  { key: "o", shift: true, label: "打开文件夹", run: () => void doOpenFolder() },
  { key: "s", label: "保存", run: () => void doSave() },
  { key: "s", shift: true, label: "另存为", run: () => doSaveAs() },
  { key: "w", label: "关闭标签页", run: closeActiveTab },
  { key: "tab", label: "下一个标签", run: () => activateNext(1) },
  { key: "tab", shift: true, label: "上一个标签", run: () => activateNext(-1) },
  { key: "e", shift: true, label: "导出 HTML", run: () => void doExportHtml() },
  { key: "p", label: "打印 / 导出 PDF", run: () => void doExportPdf() },
  { key: ",", label: "设置", run: () => openSettingsDialog() },
  { key: "h", shift: true, label: "使用说明", run: () => helpDlg.showModal() },
  { key: "\\", label: "切换侧边栏", run: toggleSidebar },
  { key: "v", shift: true, label: "切换视图（双栏 / 仅编辑 / 仅预览）", run: () => cycleViewMode() },
  { key: "d", shift: true, label: "隐藏 / 显示预览", run: togglePreview },
  { key: "l", shift: true, label: "切换主题", run: doCycleTheme },
  { key: "f", shift: true, label: "全文搜索", run: focusSearch },
  { key: "u", shift: true, label: "检查更新", run: () => void doCheckUpdate() },
]);

/* ---------- 关闭拦截：多个脏标签时批量确认 ---------- */

void win.onCloseRequested(async (event) => {
  const dirty = dirtyTabs();
  if (dirty.length === 0) return;
  event.preventDefault();
  const choice = await confirmUnsaved(dirtyLabel(dirty));
  if (choice === "cancel") return;
  if (choice === "save") {
    for (const tab of dirty) {
      if (!(await saveTab(tab))) return; // 保存失败（含取消另存为）则中止关窗
    }
  }
  await win.destroy();
  /* cancel：什么都不做，窗口保持打开 */
});

/* ---------- 初始化 ---------- */

void renderPreview();
syncChrome();
syncStats(view);
updateThemeLabel(currentMode());
btnUpdate.addEventListener("click", () => void doCheckUpdate());
/* 状态栏显示当前版本（getVersion 来自 tauri.conf.json），说明页同步展示 */
void getVersion()
  .then((v) => {
    appVersionEl.textContent = `v${v}`;
    helpVersionEl.textContent = `v${v}`;
  })
  .catch(() => {
    appVersionEl.textContent = "";
  });
