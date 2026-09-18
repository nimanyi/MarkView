/**
 * 多标签页：每个标签对应一份独立文档
 * （路径 + 磁盘内容快照 + 编辑器内容 / 选区 / 滚动位置）。
 *
 * - 编辑器保持单实例：切换标签时先快照旧文档，再全量装载新文档并恢复现场；
 * - dirty 判定用编辑器内容与磁盘快照的内存比较（text !== diskText）；
 * - 打开新文件 / 新建不再打断确认——旧文档连同未保存修改留在后台标签；
 * - 关闭脏标签（点 ×、中键、Ctrl+W）时经 hooks.confirm 三态确认；
 * - 全部标签关闭后自动补一个未命名空标签，编辑器永不为空。
 * - 标签条单行不换行：拥挤时各标签自动收缩（见 styles.css）；
 *   末尾常驻「+」新建按钮，空白处双击亦可新建，滚轮可横滚标签条。
 */

import { baseName } from "./files";
import { showContextMenu, type CtxMenuEntry } from "./contextmenu";
import { t } from "./i18n";

export interface TabState {
  id: number;
  /** doc = 普通文档；welcome = 引导页（只展示，不装载编辑器、永不脏） */
  kind?: "doc" | "welcome";
  path: string | null; // null = 未命名
  diskText: string; // 打开 / 保存时的磁盘内容（判 dirty）
  text: string; // 编辑器内容（onDocChange 实时快照）
  anchor: number; // 选区（切走时快照）
  head: number;
  scrollTop: number;
}

export function tabLabel(tab: TabState): string {
  if (tab.kind === "welcome") return t("tab.welcome");
  return tab.path ? baseName(tab.path) : t("file.untitled");
}

/** 确认对话框用的文档名：单个直接名称，多个为「“首个”等 N 个文档」 */
export function dirtyLabel(dirty: TabState[]): string {
  if (dirty.length === 1) return t("format.quote", { name: tabLabel(dirty[0]) });
  return t("tab.dirtyMany", { first: t("format.quote", { name: tabLabel(dirty[0]) }), count: dirty.length });
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
  /** 批量关闭多个脏标签前的统一确认（一次问清，避免逐个弹窗） */
  confirmMany(label: string): Promise<"save" | "discard" | "cancel">;
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
    el.title = tab.path ?? t("file.untitled");
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
    close.title = t("tab.close.title");
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
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation(); // 不落入全局右键处理（复制等通用项）
      showTabMenu(tab, e.clientX, e.clientY);
    });
    frag.appendChild(el);
  }
  /* 末尾常驻「+」：新建未命名标签（与 Ctrl+N 等价）；样式上 sticky
   * 固定在标签条右缘，标签溢出滚动时也始终可见可点 */
  const add = document.createElement("button");
  add.type = "button";
  add.className = "tab-new";
  add.title = t("tab.new");
  add.setAttribute("aria-label", t("tab.new.aria"));
  add.textContent = "+";
  add.addEventListener("click", () => openTab(null, ""));
  frag.appendChild(add);
  bar.replaceChildren(frag);
  keepActiveVisible();
}

/** 标签多到溢出时的兜底：把激活标签滚入视野。
 *  右侧多预留「+」按钮的宽度，避免刚激活的标签被固定在右缘的按钮遮住。 */
function keepActiveVisible(): void {
  if (!bar) return;
  const el = bar.querySelector<HTMLElement>(".tab.active");
  if (!el) return;
  const plus = 40; // 「+」按钮连同留白的占位宽度
  const barRect = bar.getBoundingClientRect();
  const tabRect = el.getBoundingClientRect();
  if (tabRect.right + plus > barRect.right) {
    bar.scrollLeft += tabRect.right + plus - barRect.right;
  } else if (tabRect.left < barRect.left) {
    bar.scrollLeft -= barRect.left - tabRect.left;
  }
}

/** 切换激活：先快照旧标签（引导页不进编辑器，跳过快照），再装载新标签 */
export function activate(id: number): void {
  if (!hooks) return;
  if (id === activeId) return;
  const old = activeTab();
  if (old && old.kind !== "welcome") Object.assign(old, hooks.snapshot());
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

/** 打开引导页标签（启动 / 关闭全部标签时）：不可编辑、永不脏 */
export function openWelcome(): TabState {
  const tab: TabState = {
    id: nextId++,
    kind: "welcome",
    path: null,
    diskText: "",
    text: "",
    anchor: 0,
    head: 0,
    scrollTop: 0,
  };
  tabs.push(tab);
  activate(tab.id);
  return tab;
}

/** 关闭标签：脏标签先确认；关闭的是当前标签则激活相邻（优先右侧）；
 *  全部关闭后自动回到引导页 */
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
    openWelcome();
    return;
  }
  if (tab.id === activeId) {
    const next = tabs[Math.min(idx, tabs.length - 1)];
    activate(next.id);
  } else {
    renderTabs();
  }
}

/** 右键标签菜单：单个关闭 + 批量关闭（左侧 / 右侧 / 其他 / 所有），
 *  按位置可用性禁用，项后带数量提示 */
function showTabMenu(tab: TabState, x: number, y: number): void {
  const idx = tabs.indexOf(tab);
  const left = tabs.slice(0, idx);
  const right = tabs.slice(idx + 1);
  const others = [...left, ...right];
  const items: CtxMenuEntry[] = [
    { label: t("tab.close"), run: () => void closeTab(tab.id) },
    "sep",
    {
      label: t("tab.closeLeft", { count: left.length }),
      disabled: left.length === 0,
      run: () => void closeTabs(left.map((t) => t.id)),
    },
    {
      label: t("tab.closeRight", { count: right.length }),
      disabled: right.length === 0,
      run: () => void closeTabs(right.map((t) => t.id)),
    },
    {
      label: t("tab.closeOthers", { count: others.length }),
      disabled: others.length === 0,
      run: () => void closeTabs(others.map((t) => t.id)),
    },
    {
      label: t("tab.closeAll", { count: tabs.length }),
      run: () => void closeTabs(tabs.map((t) => t.id)),
    },
  ];
  showContextMenu(items, x, y);
}

/** 批量关闭：范围内有脏标签时统一确认一次；
 *  选保存则逐个写盘，任一失败（含取消另存为）即中止。
 *  当前标签被一并关闭时优先激活其右侧第一个幸存标签（浏览器习惯）。 */
export async function closeTabs(ids: number[]): Promise<void> {
  if (!hooks) return;
  const targets = tabs.filter((t) => ids.includes(t.id));
  if (targets.length === 0) return;
  const dirty = targets.filter((t) => t.text !== t.diskText);
  if (dirty.length > 0) {
    const choice = await hooks.confirmMany(dirtyLabel(dirty));
    if (choice === "cancel") return;
    if (choice === "save") {
      for (const tab of dirty) {
        if (!(await hooks.save(tab))) return; // 保存失败则中止，保留未处理的标签
      }
    }
  }
  const activeIdx = tabs.findIndex((t) => t.id === activeId);
  const survivors = tabs.filter((t) => !ids.includes(t.id));
  const origIndex = new Map(tabs.map((t, i) => [t.id, i] as const));
  for (const t of targets) {
    const i = tabs.indexOf(t);
    if (i >= 0) tabs.splice(i, 1);
  }
  if (tabs.length === 0) {
    openWelcome();
    return;
  }
  if (tabs.some((t) => t.id === activeId)) {
    renderTabs(); // 当前标签不在关闭范围内：仅重绘
    return;
  }
  const next =
    survivors.find((t) => (origIndex.get(t.id) ?? 0) > activeIdx) ??
    survivors[survivors.length - 1];
  if (next) activate(next.id);
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
  /* 纵向滚轮悬停在标签条上时转为横向滚动（仅当标签溢出时） */
  barEl.addEventListener(
    "wheel",
    (e) => {
      if (e.deltaY !== 0 && barEl.scrollWidth > barEl.clientWidth) {
        barEl.scrollLeft += e.deltaY;
      }
    },
    { passive: true },
  );
  /* 双击标签条空白处：新建标签（点在滚动条上不算） */
  barEl.addEventListener("dblclick", (e) => {
    if (e.target !== barEl || e.offsetX >= barEl.clientWidth) return;
    openTab(null, "");
  });
}
