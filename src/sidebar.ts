import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

/** Rust 端 list_dir 返回的目录条目 */
interface Entry {
  name: string;
  path: string;
  is_dir: boolean;
}

/** 可在编辑器中打开的扩展名（与打开对话框过滤器一致） */
const OPENABLE = /\.(md|markdown|mdx|txt)$/i;

/** 侧边栏回调：点击可打开文件时交由主装配处理（含未保存确认） */
export interface SidebarCallbacks {
  onOpenFile(path: string): void;
}

/** 文件树侧边栏：懒加载展开、当前文件高亮、可整体刷新 */
export interface Sidebar {
  /** 弹出对话框选择根目录并渲染 */
  openFolder(): Promise<void>;
  /** 直接打开指定路径的文件夹（拖放目录时使用，无需对话框） */
  openFolderAt(path: string): Promise<void>;
  /** 重新加载（保留展开状态），目录内容变化后调用 */
  refresh(): Promise<void>;
  /** 更新当前文件高亮（文件未在树中时仅清除高亮） */
  setCurrentPath(path: string | null): void;
  /** 当前根目录 */
  root(): string | null;
}

/** 创建文件树侧边栏。emptyEl 为无根目录时的占位提示元素。 */
export function createSidebar(
  treeEl: HTMLElement,
  emptyEl: HTMLElement,
  callbacks: SidebarCallbacks,
): Sidebar {
  let rootPath: string | null = null;
  const expanded = new Set<string>();
  let currentPath: string | null = null;
  let renderSeq = 0; // 防止并发渲染竞态（旧结果覆盖新结果）

  /** 目录条目渲染：行 + 子容器（目录展开时填充） */
  async function buildDir(
    dirPath: string,
    depth: number,
    seq: number,
  ): Promise<HTMLElement> {
    const holder = document.createElement("div");
    holder.className = "tree-children";
    if (!expanded.has(dirPath)) return holder;

    const entries = await listEntries(dirPath);
    if (seq !== renderSeq) return holder; // 已被更新一轮渲染取代
    for (const entry of entries) {
      holder.appendChild(await buildRow(entry, depth + 1, seq));
    }
    return holder;
  }

  async function buildRow(entry: Entry, depth: number, seq: number): Promise<HTMLElement> {
    const row = document.createElement("div");
    row.className =
      "tree-row" + (entry.is_dir ? " dir" : OPENABLE.test(entry.name) ? " file" : " dim");
    row.dataset.path = entry.path;
    row.dataset.name = entry.name;
    row.style.setProperty("--depth", String(depth));

    const twist = document.createElement("span");
    twist.className = "twist";
    twist.textContent = entry.is_dir ? (expanded.has(entry.path) ? "▾" : "▸") : "";
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = entry.name;
    row.append(twist, label);

    if (entry.is_dir) {
      row.addEventListener("click", async () => {
        if (expanded.has(entry.path)) {
          expanded.delete(entry.path);
        } else {
          expanded.add(entry.path);
        }
        await render();
      });
      const children = await buildDir(entry.path, depth, seq);
      const wrap = document.createElement("div");
      wrap.append(row, children);
      return wrap;
    }

    if (OPENABLE.test(entry.name)) {
      if (entry.path === currentPath) row.classList.add("active");
      row.addEventListener("click", () => callbacks.onOpenFile(entry.path));
    }
    return row;
  }

  async function render(): Promise<void> {
    const seq = ++renderSeq;
    if (!rootPath) {
      treeEl.replaceChildren();
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    const entries = await listEntries(rootPath);
    if (seq !== renderSeq) return;
    const frag = document.createDocumentFragment();
    for (const entry of entries) {
      frag.appendChild(await buildRow(entry, 0, seq));
    }
    treeEl.replaceChildren(frag);
  }

  async function openFolder(): Promise<void> {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected !== "string") return;
    rootPath = selected;
    expanded.clear();
    await render();
  }

  /** 直接设置根目录并渲染（拖放目录时使用） */
  async function openFolderAt(path: string): Promise<void> {
    rootPath = path;
    expanded.clear();
    await render();
  }

  return {
    openFolder,
    openFolderAt,
    refresh: render,
    setCurrentPath(path) {
      currentPath = path;
      treeEl
        .querySelectorAll(".tree-row.active")
        .forEach((el) => el.classList.remove("active"));
      if (path) {
        treeEl
          .querySelector(`.tree-row[data-path="${cssEscape(path)}"]`)
          ?.classList.add("active");
      }
    },
    root: () => rootPath,
  };
}

/** 调用 Rust 端 list_dir（失败时返回空列表，保持树可用） */
async function listEntries(path: string): Promise<Entry[]> {
  try {
    return await invoke<Entry[]>("list_dir", { path });
  } catch {
    return [];
  }
}

/** CSS 选择器转义（路径可能含 [ ] 等字符） */
function cssEscape(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}
