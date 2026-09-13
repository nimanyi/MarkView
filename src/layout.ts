/**
 * 视图模式：双栏（默认）/ 仅编辑 / 仅预览。
 *
 * - .panes 上切 data-mode，显隐交给 CSS（含中缝分隔条）；
 * - 切到单栏时清掉编辑区的固定像素宽度（splitter 拖动留下的），
 *   否则「仅编辑」时编辑区仍只占原来的半屏；
 * - 切回双栏时按持久化比例重排（splitter.reapplyRatio，无记录则对半分）；
 * - 同步滚动无需干预：scroll.ts 对滚动范围 <= 0 的一侧本就自动跳过；
 * - 模式持久化到 localStorage，重启恢复。
 */

import { reapplyRatio } from "./splitter";

export type ViewMode = "split" | "editor" | "preview";

const STORAGE_KEY = "mdviewer.view-mode";

export function viewModeLabel(mode: ViewMode): string {
  return mode === "split" ? "双栏" : mode === "editor" ? "仅编辑" : "仅预览";
}

let panes: HTMLElement | null = null;
let editorHost: HTMLElement | null = null;
let mode: ViewMode = "split";

export function currentViewMode(): ViewMode {
  return mode;
}

export function setViewMode(next: ViewMode): void {
  mode = next;
  if (panes) panes.dataset.mode = next;
  if (editorHost && next !== "split") {
    /* 单栏时编辑区占满：清掉 splitter 的 flex:none + 固定宽度 */
    editorHost.style.flex = "";
    editorHost.style.width = "";
  }
  if (next === "split") reapplyRatio(); // 恢复用户上次的分栏比例
  localStorage.setItem(STORAGE_KEY, next);
}

/** Ctrl+Shift+V 循环切换：双栏 → 仅编辑 → 仅预览 → 双栏 */
export function cycleViewMode(): ViewMode {
  const order: ViewMode[] = ["split", "editor", "preview"];
  const next = order[(order.indexOf(mode) + 1) % order.length];
  setViewMode(next);
  return next;
}

export interface LayoutElements {
  panes: HTMLElement; // .panes 容器（编辑 + 分隔条 + 预览）
  editorHost: HTMLElement; // 编辑区（清内联宽度用）
}

export function initViewMode(el: LayoutElements): void {
  panes = el.panes;
  editorHost = el.editorHost;
  const raw = localStorage.getItem(STORAGE_KEY);
  setViewMode(raw === "editor" || raw === "preview" ? raw : "split");
}
