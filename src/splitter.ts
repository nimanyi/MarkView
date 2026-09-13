/**
 * 分栏拖拽：编辑区与预览区之间的分隔条。
 *
 * - editor-host 默认 flex:1；一旦拖动即切为固定百分比宽度（预览区吃掉剩余空间）
 * - 比例相对"侧边栏以外的内容区"计算（侧栏隐藏时自动获得更大范围）
 * - 持久化到 localStorage，重启恢复；双击分隔条复位 50% 并清除记录
 */

const STORAGE_KEY = "mdviewer.split-ratio";

/** 允许的编辑区占比范围 */
const MIN_RATIO = 0.15;
const MAX_RATIO = 0.85;

export interface SplitterElements {
  panes: HTMLElement; // .panes 容器（含侧栏 + 编辑 + 分隔条 + 预览）
  sidebar: HTMLElement; // 侧栏（隐藏时宽度记 0）
  editorHost: HTMLElement; // 编辑区
  divider: HTMLElement; // 分隔条
}

/** 内容区起点与宽度（扣除侧栏；侧栏隐藏时其 rect 宽为 0，天然兼容） */
function contentMetrics(panes: HTMLElement, sidebar: HTMLElement): { left: number; width: number } {
  const paneRect = panes.getBoundingClientRect();
  const sbWidth = sidebar.getBoundingClientRect().width;
  return { left: paneRect.left + sbWidth, width: paneRect.width - sbWidth };
}

function applyRatio(host: HTMLElement, sidebar: HTMLElement, panes: HTMLElement, ratio: number): void {
  host.style.flex = "none";
  const { width } = contentMetrics(panes, sidebar);
  host.style.width = `${Math.round(width * ratio)}px`;
}

/** 读取持久化比例（无记录 / 非法值返回 null，保持 CSS 默认的对半分） */
function savedRatio(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v <= 0 || v >= 1) return null;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, v));
}

/** 安装分隔条拖拽；返回恢复函数（仅测试用，应用内不调用） */
export function initSplitter(el: SplitterElements): () => void {
  const { panes, sidebar, editorHost, divider } = el;

  const restore = savedRatio();
  if (restore !== null) applyRatio(editorHost, sidebar, panes, restore);

  let dragging = false;

  divider.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); // 阻止编辑器抢焦点 / 触发文本选择
    dragging = true;
    divider.classList.add("dragging");
    document.body.classList.add("dragging-panes");
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const { left, width } = contentMetrics(panes, sidebar);
    if (width <= 0) return;
    const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, (e.clientX - left) / width));
    applyRatio(editorHost, sidebar, panes, ratio);
  });

  const stop = (): void => {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove("dragging");
    document.body.classList.remove("dragging-panes");
    /* 结束时才持久化：把像素宽度换算回比例存储 */
    const { width } = contentMetrics(panes, sidebar);
    const px = editorHost.getBoundingClientRect().width;
    if (width > 0) {
      localStorage.setItem(STORAGE_KEY, String(Math.round((px / width) * 1000) / 1000));
    }
  };
  window.addEventListener("mouseup", stop);

  /* 双击复位：清宽度、清记录，回到 flex:1 + flex:1 对半分 */
  divider.addEventListener("dblclick", () => {
    editorHost.style.flex = "";
    editorHost.style.width = "";
    localStorage.removeItem(STORAGE_KEY);
  });

  /* 窗口尺寸变化时按当前比例重排，避免像素宽度脱离屏幕 */
  window.addEventListener("resize", () => {
    if (dragging) return;
    const { width } = contentMetrics(panes, sidebar);
    const px = editorHost.getBoundingClientRect().width;
    if (width > 0 && editorHost.style.width !== "") {
      const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, px / width));
      applyRatio(editorHost, sidebar, panes, ratio);
    }
  });

  return stop;
}
