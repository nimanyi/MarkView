/**
 * 设置面板：主题 / 编辑与预览字号 / 同步滚动 / 排版工具栏。
 *
 *  - 所有改动即时生效并持久化（无“确定”按钮，现代即时保存风格）；
 *  - 字号经 CSS 变量（--editor-font-size / --preview-font-size）下发，
 *    编辑器与预览无需重建；
 *  - 主题与工具栏显隐沿用各自模块的存储（theme.ts / toolbar.ts），
 *    这里只做 UI 联动。
 */

import { currentMode, setThemeMode, type ThemeMode } from "./theme";
import { setSyncScrollEnabled } from "./scroll";
import { formatBarVisible, setFormatBarVisible } from "./toolbar";

export interface Settings {
  editorFont: number;
  previewFont: number;
  syncScroll: boolean;
  /** 自动保存：停止输入 2 秒后写回已打开的文件（未命名文档跳过） */
  autoSave: boolean;
}

const STORAGE_KEY = "mdviewer.settings";
const FONT_MIN = 12;
const FONT_MAX = 20;
const DEFAULTS: Settings = { editorFont: 14, previewFont: 14, syncScroll: true, autoSave: true };

function clampFont(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(n)));
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { ...DEFAULTS };
    const v = JSON.parse(raw) as Partial<Settings>;
    return {
      editorFont: clampFont(v.editorFont, DEFAULTS.editorFont),
      previewFont: clampFont(v.previewFont, DEFAULTS.previewFont),
      syncScroll: v.syncScroll === undefined ? DEFAULTS.syncScroll : !!v.syncScroll,
      autoSave: v.autoSave === undefined ? DEFAULTS.autoSave : !!v.autoSave,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/* 当前生效的设置（main.ts 的自动保存逻辑读取；对话框改动即时更新） */
let settings = loadSettings();

export function getSettings(): Settings {
  return settings;
}

function saveSettings(s: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/** 应用到 DOM / 各模块（启动时与每次改动后调用） */
export function applySettings(s: Settings): void {
  document.documentElement.style.setProperty("--editor-font-size", `${s.editorFont}px`);
  document.documentElement.style.setProperty("--preview-font-size", `${s.previewFont}px`);
  setSyncScrollEnabled(s.syncScroll);
}

/* ---------- 对话框装配 ---------- */

/** 主题被设置面板改变后由 main.ts 跟进（编辑器主题 / 按钮文案 / 重渲染） */
export interface SettingsHooks {
  onTheme(mode: ThemeMode): void;
}

let openDialog: (() => void) | null = null;

/** 打开设置对话框（快捷键 Ctrl+, 与顶栏按钮共用） */
export function openSettingsDialog(): void {
  openDialog?.();
}

export function initSettingsDialog(hooks: SettingsHooks): void {
  const dlg = document.querySelector<HTMLDialogElement>("#settings-dialog")!;
  const segBtns = document.querySelectorAll<HTMLButtonElement>("#theme-seg .seg-btn");
  const editorFont = document.querySelector<HTMLInputElement>("#set-editor-font")!;
  const editorFontVal = document.querySelector<HTMLElement>("#editor-font-value")!;
  const previewFont = document.querySelector<HTMLInputElement>("#set-preview-font")!;
  const previewFontVal = document.querySelector<HTMLElement>("#preview-font-value")!;
  const syncScrollEl = document.querySelector<HTMLInputElement>("#set-sync-scroll")!;
  const formatBarEl = document.querySelector<HTMLInputElement>("#set-format-bar")!;
  const autoSaveEl = document.querySelector<HTMLInputElement>("#set-autosave")!;

  /* 打开时把各控件同步为当前状态 */
  const syncUI = (): void => {
    const mode = currentMode();
    for (const b of segBtns) b.classList.toggle("active", b.dataset.mode === mode);
    editorFont.value = String(settings.editorFont);
    editorFontVal.textContent = `${settings.editorFont}px`;
    previewFont.value = String(settings.previewFont);
    previewFontVal.textContent = `${settings.previewFont}px`;
    syncScrollEl.checked = settings.syncScroll;
    formatBarEl.checked = formatBarVisible();
    autoSaveEl.checked = settings.autoSave;
  };

  const commit = (): void => {
    saveSettings(settings);
    applySettings(settings);
  };

  openDialog = (): void => {
    syncUI();
    dlg.showModal();
  };

  /* 主题：持久化与 <html data-theme> 由 theme.ts 处理，编辑器跟进交给回调 */
  for (const b of segBtns) {
    b.addEventListener("click", () => {
      const mode = (b.dataset.mode ?? "auto") as ThemeMode;
      setThemeMode(mode);
      hooks.onTheme(mode);
      syncUI();
    });
  }

  editorFont.addEventListener("input", () => {
    settings.editorFont = clampFont(editorFont.value, settings.editorFont);
    editorFontVal.textContent = `${settings.editorFont}px`;
    commit();
  });

  previewFont.addEventListener("input", () => {
    settings.previewFont = clampFont(previewFont.value, settings.previewFont);
    previewFontVal.textContent = `${settings.previewFont}px`;
    commit();
  });

  syncScrollEl.addEventListener("change", () => {
    settings.syncScroll = syncScrollEl.checked;
    commit();
  });

  /* 自动保存开关：只改设置状态，保存调度由 main.ts 的文档回调驱动 */
  autoSaveEl.addEventListener("change", () => {
    settings.autoSave = autoSaveEl.checked;
    commit();
  });

  /* 工具栏显隐：由 toolbar.ts 自己持久化 */
  formatBarEl.addEventListener("change", () => setFormatBarVisible(formatBarEl.checked));

  /* 关闭：底部按钮或点击遮罩 */
  dlg.querySelector(".dialog-actions")!.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("button")) dlg.close();
  });
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });

  /* 启动即应用已保存设置（字号 / 同步滚动开关） */
  applySettings(settings);
}
