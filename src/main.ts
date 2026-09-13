import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  applyEditorTheme,
  createEditor,
  cursorLabel,
  getDocText,
  setDocText,
  type EditorView,
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
const fileNameEl = document.querySelector<HTMLElement>("#file-name")!;
const saveHintEl = document.querySelector<HTMLElement>("#save-hint")!;
const statPosEl = document.querySelector<HTMLElement>("#stat-pos")!;
const statCountEl = document.querySelector<HTMLElement>("#stat-count")!;
const sidebarTitleEl = document.querySelector<HTMLElement>("#sidebar-title")!;
const btnNew = document.querySelector<HTMLButtonElement>("#btn-new")!;
const btnOpen = document.querySelector<HTMLButtonElement>("#btn-open")!;
const btnOpenDir = document.querySelector<HTMLButtonElement>("#btn-open-dir")!;
const btnSave = document.querySelector<HTMLButtonElement>("#btn-save")!;
const btnSaveAs = document.querySelector<HTMLButtonElement>("#btn-save-as")!;
const btnExportHtml = document.querySelector<HTMLButtonElement>("#btn-export-html")!;
const btnExportPdf = document.querySelector<HTMLButtonElement>("#btn-export-pdf")!;
const btnTheme = document.querySelector<HTMLButtonElement>("#btn-theme")!;
const btnToggleSidebar = document.querySelector<HTMLButtonElement>("#btn-toggle-sidebar")!;
const btnRefreshTree = document.querySelector<HTMLButtonElement>("#btn-refresh-tree")!;
const unsavedDlg = document.querySelector<HTMLDialogElement>("#unsaved-dialog")!;
const unsavedText = document.querySelector<HTMLElement>("#unsaved-text")!;

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
| Ctrl+Shift+E | 导出 HTML |
| Ctrl+P | 打印 / 导出 PDF |
| Ctrl+\\ | 切换侧边栏 |
| Ctrl+Shift+L | 切换主题 |

## GFM 特性

- [x] 表格
- [x] 任务列表
- [x] 删除线（~~这样~~）
- [x] 自动链接：https://tauri.app

\`\`\`rust
#[tauri::command]
fn parse_markdown(source: String) -> String {
    comrak::markdown_to_html(&source, &options)
}
\`\`\`

按 \`Ctrl+O\` 打开你的第一份 Markdown 文档吧。
`;

/* ---------- 文档状态 ---------- */

let currentPath: string | null = null;
let savedContent = SAMPLE;

function currentContent(): string {
  return getDocText(view);
}

function isDirty(): boolean {
  return currentContent() !== savedContent;
}

function docName(): string {
  return currentPath ? baseName(currentPath) : "未命名.md";
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
}

/* ---------- 状态栏 ---------- */

function syncStats(view: EditorView): void {
  statPosEl.textContent = cursorLabel(view);
  const text = currentContent();
  statCountEl.textContent = `${text.length} 字符 · ${text.split("\n").length} 行`;
}

/* ---------- 未保存确认（三态） ---------- */

function confirmUnsaved(): Promise<"save" | "discard" | "cancel"> {
  return new Promise((resolve) => {
    unsavedText.textContent = `是否保存对“${docName()}”的更改？`;
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

/** 打开指定路径的文件（文件树点击与打开对话框共用，含未保存确认） */
async function openPath(path: string): Promise<void> {
  if (isDirty()) {
    const choice = await confirmUnsaved();
    if (choice === "cancel") return;
    if (choice === "save" && !(await doSave())) return;
  }
  try {
    const content = await readTextFile(path);
    currentPath = path;
    savedContent = content;
    setDocText(view, content);
    await renderPreview();
    syncChrome();
    syncStats(view);
    sidebar.setCurrentPath(path);
  } catch (err) {
    saveHintEl.textContent = String(err);
  }
}

async function doOpen(): Promise<void> {
  const path = await pickOpenPath();
  if (path) await openPath(path);
}

async function doNew(): Promise<void> {
  if (isDirty()) {
    const choice = await confirmUnsaved();
    if (choice === "cancel") return;
    if (choice === "save" && !(await doSave())) return;
  }
  currentPath = null;
  savedContent = "";
  setDocText(view, "");
  await renderPreview();
  syncChrome();
  syncStats(view);
  sidebar.setCurrentPath(null);
}

/** 保存：有路径直接写，无路径走另存为。返回是否成功。 */
async function doSave(): Promise<boolean> {
  if (currentPath) {
    try {
      savedContent = currentContent();
      await writeTextFile(currentPath, savedContent);
      syncChrome();
      return true;
    } catch (err) {
      saveHintEl.textContent = String(err);
      return false;
    }
  }
  return doSaveAs();
}

async function doSaveAs(): Promise<boolean> {
  const path = await pickSavePath(currentPath ?? docName());
  if (!path) return false;
  try {
    savedContent = currentContent();
    await writeTextFile(path, savedContent);
    currentPath = path;
    syncChrome();
    sidebar.setCurrentPath(path);
    void sidebar.refresh(); // 保存到树内的新位置后刷新文件树
    return true;
  } catch (err) {
    saveHintEl.textContent = String(err);
    return false;
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

/* ---------- 主题（三态：跟随系统 / 浅色 / 深色） ---------- */

function updateThemeLabel(mode: ThemeMode): void {
  btnTheme.textContent = `主题：${themeLabel(mode)}`;
}

function doCycleTheme(): void {
  const mode = cycleTheme();
  updateThemeLabel(mode);
  applyEditorTheme(view, isDark(mode));
}

/* ---------- 侧边栏 ---------- */

function toggleSidebar(): void {
  document.body.classList.toggle("sidebar-hidden");
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

/* ---------- 编辑器装配 ---------- */

// 主题先于编辑器初始化：setDark 回调在 view 创建后才会真正生效
let view!: EditorView;
const initialDark = initTheme((dark) => applyEditorTheme(view, dark));

view = createEditor(
  editorHost,
  SAMPLE,
  {
    onDocChange(v) {
      scheduleRender();
      syncStats(v);
      syncChrome();
    },
    onCursorMove(v) {
      statPosEl.textContent = cursorLabel(v);
    },
  },
  initialDark,
);

/* 同步滚动：编辑器与预览按比例双向联动 */
bindSyncScroll(view.scrollDOM, preview);

/* ---------- 按钮 ---------- */

btnNew.addEventListener("click", () => void doNew());
btnOpen.addEventListener("click", () => void doOpen());
btnOpenDir.addEventListener("click", () => void doOpenFolder());
btnSave.addEventListener("click", () => void doSave());
btnSaveAs.addEventListener("click", () => void doSaveAs());
btnExportHtml.addEventListener("click", () => void doExportHtml());
btnExportPdf.addEventListener("click", () => void doExportPdf());
btnTheme.addEventListener("click", doCycleTheme);
btnToggleSidebar.addEventListener("click", toggleSidebar);
btnRefreshTree.addEventListener("click", () => void sidebar.refresh());

/* ---------- 快捷键（表驱动，集中查阅） ---------- */

installShortcuts([
  { key: "n", label: "新建文档", run: () => void doNew() },
  { key: "o", label: "打开文件", run: () => void doOpen() },
  { key: "o", shift: true, label: "打开文件夹", run: () => void doOpenFolder() },
  { key: "s", label: "保存", run: () => void doSave() },
  { key: "s", shift: true, label: "另存为", run: () => void doSaveAs() },
  { key: "e", shift: true, label: "导出 HTML", run: () => void doExportHtml() },
  { key: "p", label: "打印 / 导出 PDF", run: () => void doExportPdf() },
  { key: "\\", label: "切换侧边栏", run: toggleSidebar },
  { key: "l", shift: true, label: "切换主题", run: doCycleTheme },
]);

/* ---------- 关闭拦截：未保存时确认 ---------- */

void win.onCloseRequested(async (event) => {
  if (!isDirty()) return;
  event.preventDefault();
  const choice = await confirmUnsaved();
  if (choice === "save" && (await doSave())) {
    await win.destroy();
  } else if (choice === "discard") {
    await win.destroy();
  }
  /* cancel：什么都不做，窗口保持打开 */
});

/* ---------- 初始化 ---------- */

void renderPreview();
syncChrome();
syncStats(view);
updateThemeLabel(currentMode());
