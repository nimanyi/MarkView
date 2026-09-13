import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
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

const preview = document.querySelector<HTMLElement>("#preview")!;
const editorHost = document.querySelector<HTMLElement>("#editor-host")!;
const fileNameEl = document.querySelector<HTMLElement>("#file-name")!;
const saveHintEl = document.querySelector<HTMLElement>("#save-hint")!;
const statPosEl = document.querySelector<HTMLElement>("#stat-pos")!;
const statCountEl = document.querySelector<HTMLElement>("#stat-count")!;
const btnOpen = document.querySelector<HTMLButtonElement>("#btn-open")!;
const btnSave = document.querySelector<HTMLButtonElement>("#btn-save")!;
const btnSaveAs = document.querySelector<HTMLButtonElement>("#btn-save-as")!;
const unsavedDlg = document.querySelector<HTMLDialogElement>("#unsaved-dialog")!;
const unsavedText = document.querySelector<HTMLElement>("#unsaved-text")!;

const win = getCurrentWindow();

/** 欢迎文档：无文件打开时的示例内容 */
const SAMPLE = `# 欢迎使用 MDViewer

> 左侧编辑，右侧实时预览。解析由 **Rust 端 comrak** 完成。

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| Ctrl+O | 打开文件 |
| Ctrl+S | 保存 |
| Ctrl+Shift+S | 另存为 |

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

/* ---------- 打开 / 保存 ---------- */

async function doOpen(): Promise<void> {
  if (isDirty()) {
    const choice = await confirmUnsaved();
    if (choice === "cancel") return;
    if (choice === "save" && !(await doSave())) return;
  }
  const path = await pickOpenPath();
  if (!path) return;
  try {
    const content = await readTextFile(path);
    currentPath = path;
    savedContent = content;
    setDocText(view, content);
    await renderPreview();
    syncChrome();
    syncStats(view);
  } catch (err) {
    saveHintEl.textContent = String(err);
  }
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
    return true;
  } catch (err) {
    saveHintEl.textContent = String(err);
    return false;
  }
}

/* ---------- 编辑器装配 ---------- */

const view = createEditor(editorHost, SAMPLE, {
  onDocChange(v) {
    scheduleRender();
    syncStats(v);
    syncChrome();
  },
  onCursorMove(v) {
    statPosEl.textContent = cursorLabel(v);
  },
});

btnOpen.addEventListener("click", () => void doOpen());
btnSave.addEventListener("click", () => void doSave());
btnSaveAs.addEventListener("click", () => void doSaveAs());

window.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  const key = e.key.toLowerCase();
  if (key === "o") {
    e.preventDefault();
    void doOpen();
  } else if (key === "s") {
    e.preventDefault();
    void (e.shiftKey ? doSaveAs() : doSave());
  }
});

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
