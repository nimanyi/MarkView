/**
 * 多标签页：每个标签对应一份独立文档
 * （路径 + 磁盘内容快照 + 编辑器内容 / 选区 / 滚动位置）。
 *
 * - 编辑器保持单实例：切换标签时先快照旧文档，再全量装载新文档并恢复现场；
 * - dirty 判定用编辑器内容与磁盘快照的内存比较（text !== diskText）；
 * - 打开新文件 / 新建不再打断确认——旧文档连同未保存修改留在后台标签；
 * - 关闭脏标签（点 ×、中键、Ctrl+W）时经 hooks.confirm 三态确认；
 * - 全部标签关闭后自动补一个未命名空标签，编辑器永不为空。
 */

import { baseName } from "./files";

export interface TabState {
  id: number;
  path: string | null; // null = 未命名
  diskText: string; // 打开 / 保存时的磁盘内容（判 dirty）
  text: string; // 编辑器内容（onDocChange 实时快照）
  anchor: number; // 选区（切走时快照）
  head: number;
  scrollTop: number;
}

export function tabLabel(tab: TabState): string {
  return tab.path ? baseName(tab.path) : "未命名";
}

export interface TabsHooks {
  /** 读取当前编辑器状态（切换前快照旧标签用） */
  snapshot(): { text: string; anchor: number; head: number; scrollTop: number };
  /** 把标签装载进编辑器（内容 + 选区 + 滚动，并联动预览 / 状态栏 / 文件树） */
  load(tab: TabState): void;
  /** 保存指定标签（可能是后台脏标签）：有路径直写，无路径走另存为 */
  save(tab: TabState): Promise<boolean>;
  /** 关闭脏标签前的三态确认（复用未保存对话框） */
  confirm(tab: TabState): Promise<"save" | "discard" | "cancel">;
}

let bar: HTMLElement | null = null;
let hooks: TabsHooks | null = null;
const tabs: TabState[] = [];
let activeId = 0;
let nextId = 1;

export function activeTab(): TabState | null {
  return tabs.find((t) => t.id === activeId) ?? null;
}

export function findTab(path: string): TabState | null {
  return tabs.find((t) => t.path === path) ?? null;
}

/** 有未保存修改的标签（窗口关闭确认用） */
export function dirtyTabs(): TabState[] {
  return tabs.filter((t) => t.text !== t.diskText);
}

/** 文档改动后实时更新当前标签内容快照（dirty 圆点随之刷新） */
export function markActiveText(text: string): void {
  const tab = activeTab();
  if (!tab) return;
  const wasDirty = tab.text !== tab.diskText;
  tab.text = text;
  if (wasDirty !== (text !== tab.diskText)) renderTabs(); // dirty 翻转才重绘
}

/** 保存 / 另存为后重绘标签条（路径与 dirty 点可能变化） */
export function refreshTabs(): void {
  renderTabs();
}

function renderTabs(): void {
  if (!bar) return;
  const frag = document.createDocumentFragment();
  for (const tab of tabs) {
    const el = document.createElement("div");
    el.className = "tab" + (tab.id === activeId ? " active" : "");
    el.role = "tab";
    el.title = tab.path ?? "未命名";
    if (tab.text !== tab.diskText) el.classList.add("dirty");

    const dot = document.createElement("span");
    dot.className = "tab-dot";
    el.appendChild(dot);

    const name = document.createElement("span");
    name.className = "tab-name";
    name.textContent = tabLabel(tab);
    el.appendChild(name);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "tab-close";
    close.title = "关闭标签页";
    close.textContent = "×";
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      void closeTab(tab.id);
    });
    el.appendChild(close);

    el.addEventListener("click", () => activate(tab.id));
    el.addEventListener("auxclick", (e) => {
      if (e.button === 1) {
        e.preventDefault(); // 中键：关闭
        void closeTab(tab.id);
      }
    });
    frag.appendChild(el);
  }
  bar.replaceChildren(frag);
}

/** 切换激活：先快照旧标签，再装载新标签 */
export function activate(id: number): void {
  if (!hooks) return;
  if (id === activeId) return;
  const old = activeTab();
  if (old) Object.assign(old, hooks.snapshot());
  activeId = id;
  const tab = tabs.find((t) => t.id === id);
  if (!tab) return;
  renderTabs();
  hooks.load(tab);
}

/** 新建标签并激活（path 传 null 为未命名文档） */
export function openTab(path: string | null, diskText: string): TabState {
  const tab: TabState = {
    id: nextId++,
    path,
    diskText,
    text: diskText,
    anchor: 0,
    head: 0,
    scrollTop: 0,
  };
  tabs.push(tab);
  activate(tab.id);
  return tab;
}

/** 关闭标签：脏标签先确认；关闭的是当前标签则激活相邻（优先右侧）；
 *  全部关闭后自动补一个未命名空标签 */
export async function closeTab(id: number): Promise<void> {
  if (!hooks) return;
  const idx = tabs.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const tab = tabs[idx];
  if (tab.text !== tab.diskText) {
    const choice = await hooks.confirm(tab);
    if (choice === "cancel") return;
    if (choice === "save" && !(await hooks.save(tab))) return;
  }
  tabs.splice(idx, 1);
  if (tabs.length === 0) {
    openTab(null, "");
    return;
  }
  if (tab.id === activeId) {
    const next = tabs[Math.min(idx, tabs.length - 1)];
    activate(next.id);
  } else {
    renderTabs();
  }
}

/** Ctrl+W：关闭当前标签 */
export function closeActiveTab(): void {
  void closeTab(activeId);
}

/** Ctrl+Tab / Ctrl+Shift+Tab：循环切换标签 */
export function activateNext(dir: 1 | -1): void {
  if (tabs.length < 2) return;
  const idx = tabs.findIndex((t) => t.id === activeId);
  const next = tabs[(idx + dir + tabs.length) % tabs.length];
  activate(next.id);
}

export function initTabs(barEl: HTMLElement, h: TabsHooks): void {
  bar = barEl;
  hooks = h;
}
