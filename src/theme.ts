/**
 * 三态主题管理：跟随系统 / 浅色 / 深色。
 * - 应用外观：在 <html data-theme="light|dark"> 上切换（无属性 = 跟随系统）
 * - 编辑器外观：经回调通知（CodeMirror Compartment reconfigure）
 * - 选择持久化于 localStorage，重启恢复
 */

export type ThemeMode = "auto" | "light" | "dark";

const STORAGE_KEY = "mdviewer.theme";
const MODES: ThemeMode[] = ["auto", "light", "dark"];
const LABELS: Record<ThemeMode, string> = {
  auto: "跟随系统",
  light: "浅色",
  dark: "深色",
};

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

/** 当前模式下是否应为深色外观 */
export function isDark(mode: ThemeMode): boolean {
  return mode === "dark" || (mode === "auto" && darkQuery.matches);
}

/** 模式的显示名 */
export function themeLabel(mode: ThemeMode): string {
  return LABELS[mode];
}

function storedMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : "auto";
}

/**
 * 初始化主题：应用已保存的模式并注册系统切换监听。
 * 返回初始生效的深浅色（用于创建编辑器）；
 * onDarkChange 仅在 auto 模式下系统深浅色切换时触发（编辑器主题跟进）。
 */
export function initTheme(onDarkChange: (dark: boolean) => void): boolean {
  const applyAttrs = (mode: ThemeMode) => {
    if (mode === "auto") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = mode;
    }
  };

  const mode = storedMode();
  applyAttrs(mode);

  // auto 模式下跟随系统实时切换；显式模式不受系统影响
  darkQuery.addEventListener("change", () => {
    if (storedMode() === "auto") {
      applyAttrs("auto");
      onDarkChange(isDark("auto"));
    }
  });

  return isDark(mode);
}

/** 当前生效的模式（读取持久化值） */
export function currentMode(): ThemeMode {
  return storedMode();
}

/** 显式设置模式：持久化并应用 <html data-theme>（设置面板 / 循环切换共用） */
export function setThemeMode(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
  if (mode === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = mode;
  }
}

/** 循环切换：跟随系统 → 浅色 → 深色 → 跟随系统。返回新模式。 */
export function cycleTheme(): ThemeMode {
  const next = MODES[(MODES.indexOf(storedMode()) + 1) % MODES.length];
  setThemeMode(next);
  return next;
}
