/**
 * 外观主题：三态深浅（跟随系统 / 浅色 / 深色）+ 颜色风格（Palette）。
 *
 * - 深浅态：在 <html data-theme="light|dark"> 上切换（无属性 = 跟随系统）；
 * - 颜色风格：一组覆盖 7 个主题变量的调色板。Palette 是可 JSON 序列化的
 *   纯数据（内置 4 款 + 用户自定义存 localStorage，支持导入 / 导出 JSON ——
 *   未来的「风格市场」只需分发同样的 JSON 文件）；
 * - 选中具体风格时：data-theme 固定为其 base（决定 color-scheme / 滚动条 /
 *   编辑器深浅），7 个变量以内联样式覆盖样式表默认值；选「默认」则清除
 *   覆盖，交回三态主题；
 * - 编辑器外观经回调通知（CodeMirror Compartment reconfigure）；
 * - 选择持久化于 localStorage，重启恢复。
 */

export type ThemeMode = "auto" | "light" | "dark";
export type PaletteBase = "light" | "dark";

import { t } from "./i18n";

/** 7 个可定制的主题颜色（键名与 CSS 变量一一对应） */
export interface PaletteColors {
  bg: string; // 窗口背景
  bgEditor: string; // 编辑区背景
  fg: string; // 文字
  fgMuted: string; // 次要文字
  border: string; // 边框
  accent: string; // 强调色
  codeBg: string; // 代码背景
}

export interface Palette {
  id: string;
  name: string;
  base: PaletteBase;
  colors: PaletteColors;
}

const STORAGE_KEY = "mdviewer.theme";
const PALETTE_KEY = "mdviewer.palette";
const PALETTES_KEY = "mdviewer.palettes";

/** 「默认」= 不覆盖变量，外观完全跟随三态主题 */
export const DEFAULT_PALETTE_ID = "default";

const MODES: ThemeMode[] = ["auto", "light", "dark"];

/** 调色板颜色键 → CSS 变量名 */
const VAR_OF: Record<keyof PaletteColors, string> = {
  bg: "--bg",
  bgEditor: "--bg-editor",
  fg: "--fg",
  fgMuted: "--fg-muted",
  border: "--border",
  accent: "--accent",
  codeBg: "--code-bg",
};
const COLOR_KEYS = Object.keys(VAR_OF) as (keyof PaletteColors)[];

/** 三态主题的默认配色（自定义风格的起点 / 「默认」芯片的色板） */
export const DEFAULT_LIGHT_COLORS: PaletteColors = {
  bg: "#f7f7f8",
  bgEditor: "#ffffff",
  fg: "#171717",
  fgMuted: "#52525b",
  border: "rgba(23, 23, 23, 0.12)",
  accent: "#4b3fe3",
  codeBg: "#eceef3",
};

export const DEFAULT_DARK_COLORS: PaletteColors = {
  bg: "#171717",
  bgEditor: "#1e1e20",
  fg: "#e5e5e5",
  fgMuted: "#a1a1aa",
  border: "rgba(229, 229, 229, 0.14)",
  accent: "#8b83f5",
  codeBg: "#26262a",
};

/** 内置颜色风格（默认外观即三态主题本身，不单列） */
export const BUILTIN_PALETTES: Palette[] = [
  {
    id: "paper",
    name: "theme.paper",
    base: "light",
    colors: {
      bg: "#f6f0e3",
      bgEditor: "#fdfaf2",
      fg: "#43392c",
      fgMuted: "#8a7c66",
      border: "rgba(67, 57, 44, 0.18)",
      accent: "#b26a1b",
      codeBg: "#eee4cf",
    },
  },
  {
    id: "green",
    name: "theme.green",
    base: "light",
    colors: {
      bg: "#e4edda",
      bgEditor: "#f2f8ec",
      fg: "#2c3a27",
      fgMuted: "#6e8163",
      border: "rgba(44, 58, 39, 0.18)",
      accent: "#3d7d46",
      codeBg: "#d8e6c9",
    },
  },
  {
    id: "ocean",
    name: "theme.ocean",
    base: "dark",
    colors: {
      bg: "#0f172a",
      bgEditor: "#1b2742",
      fg: "#e2e8f0",
      fgMuted: "#93a3bd",
      border: "rgba(226, 232, 240, 0.16)",
      accent: "#60a5fa",
      codeBg: "#243356",
    },
  },
  {
    id: "violet",
    name: "theme.violet",
    base: "dark",
    colors: {
      bg: "#1b1626",
      bgEditor: "#241e33",
      fg: "#e9e5f2",
      fgMuted: "#a79ec2",
      border: "rgba(233, 229, 242, 0.15)",
      accent: "#a78bfa",
      codeBg: "#2d2644",
    },
  },
];

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

/** 当前模式下是否应为深色外观（不考虑颜色风格覆盖） */
export function isDark(mode: ThemeMode): boolean {
  return mode === "dark" || (mode === "auto" && darkQuery.matches);
}

/** 实际生效的深浅色：颜色风格优先（其 base 固定），其次三态主题 */
export function effectiveDark(): boolean {
  const id = currentPaletteId();
  if (id !== DEFAULT_PALETTE_ID) {
    const p = findPalette(id);
    if (p) return p.base === "dark";
  }
  return isDark(currentMode());
}

/** 模式的显示名 */
export function themeLabel(mode: ThemeMode): string {
  return t("theme." + mode);
}

/** 顶栏主题按钮文案：颜色风格生效时显示风格名，否则显示三态模式名 */
export function lookLabel(): string {
  const id = currentPaletteId();
  if (id === DEFAULT_PALETTE_ID) return themeLabel(currentMode());
  const p = findPalette(id);
  return p ? t(p.name) : themeLabel(currentMode());
}

function storedMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : "auto";
}

function applyModeAttrs(mode: ThemeMode): void {
  if (mode === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = mode;
  }
}

/* ---------- 颜色风格：存取与校验 ---------- */

/** 校验并规范化一份风格数据（导入 / 读取持久化时用），非法返回 null */
export function validatePalette(v: unknown): Palette | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.trim() === "") return null;
  const c = o.colors;
  if (typeof c !== "object" || c === null) return null;
  const colors = {} as PaletteColors;
  for (const k of COLOR_KEYS) {
    const val = (c as Record<string, unknown>)[k];
    if (typeof val !== "string" || val.trim() === "") return null;
    colors[k] = val.trim();
  }
  return {
    id: o.id.trim(),
    name: typeof o.name === "string" && o.name.trim() !== "" ? o.name.trim() : t("palette.unnamed"),
    base: o.base === "dark" ? "dark" : "light",
    colors,
  };
}

export function loadUserPalettes(): Palette[] {
  try {
    const arr = JSON.parse(localStorage.getItem(PALETTES_KEY) ?? "[]");
    if (!Array.isArray(arr)) return [];
    return arr.map(validatePalette).filter((p): p is Palette => p !== null);
  } catch {
    return [];
  }
}

export function saveUserPalettes(list: Palette[]): void {
  localStorage.setItem(PALETTES_KEY, JSON.stringify(list));
}

export function findPalette(id: string): Palette | null {
  return (
    BUILTIN_PALETTES.find((p) => p.id === id) ??
    loadUserPalettes().find((p) => p.id === id) ??
    null
  );
}

/** 当前生效的风格 id（存储值无效时按默认处理） */
export function currentPaletteId(): string {
  const id = localStorage.getItem(PALETTE_KEY);
  return id !== null && id !== DEFAULT_PALETTE_ID && findPalette(id) ? id : DEFAULT_PALETTE_ID;
}

/** 把风格画到 DOM 上（不持久化），返回生效深浅色 */
function paintPalette(id: string): boolean {
  const root = document.documentElement;
  if (id === DEFAULT_PALETTE_ID) {
    for (const v of Object.values(VAR_OF)) root.style.removeProperty(v);
    applyModeAttrs(currentMode()); // 交回三态主题
    return isDark(currentMode());
  }
  const p = findPalette(id);
  if (!p) return paintPalette(DEFAULT_PALETTE_ID);
  root.dataset.theme = p.base; // color-scheme / 滚动条 / 编辑器深浅跟随
  for (const k of COLOR_KEYS) root.style.setProperty(VAR_OF[k], p.colors[k]);
  return p.base === "dark";
}

/** 选择颜色风格：持久化并应用。返回生效深浅色（调用方切换编辑器主题）。 */
export function applyPaletteById(id: string): boolean {
  localStorage.setItem(PALETTE_KEY, id);
  return paintPalette(id);
}

/** 自定义编辑时的实时预览：直接上色，不持久化。返回生效深浅色。 */
export function previewPaletteDraft(colors: PaletteColors, base: PaletteBase): boolean {
  const root = document.documentElement;
  root.dataset.theme = base;
  for (const k of COLOR_KEYS) root.style.setProperty(VAR_OF[k], colors[k]);
  return base === "dark";
}

/* ---------- 三态主题 ---------- */

/**
 * 初始化主题：应用已保存的模式与颜色风格，注册系统切换监听。
 * 返回初始生效的深浅色（用于创建编辑器）；
 * onDarkChange 仅在 auto 模式下系统深浅色切换时触发（编辑器主题跟进）。
 */
export function initTheme(onDarkChange: (dark: boolean) => void): boolean {
  applyModeAttrs(storedMode());

  // auto 模式下跟随系统实时切换；显式模式不受系统影响。
  // 颜色风格生效时变量保持覆盖，effectiveDark 稳定 → 编辑器不动。
  darkQuery.addEventListener("change", () => {
    if (storedMode() === "auto") {
      paintPalette(currentPaletteId());
      onDarkChange(effectiveDark());
    }
  });

  return paintPalette(currentPaletteId());
}

/** 当前生效的模式（读取持久化值） */
export function currentMode(): ThemeMode {
  return storedMode();
}

/** 显式设置模式：持久化并应用 <html data-theme>（设置面板 / 循环切换共用） */
export function setThemeMode(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
  applyModeAttrs(mode);
}

/** 循环切换：跟随系统 → 浅色 → 深色 → 跟随系统。返回新模式。
 *  颜色风格生效时先回到默认配色，保证切换有可见效果。 */
export function cycleTheme(): ThemeMode {
  if (currentPaletteId() !== DEFAULT_PALETTE_ID) {
    applyPaletteById(DEFAULT_PALETTE_ID);
  }
  const next = MODES[(MODES.indexOf(storedMode()) + 1) % MODES.length];
  setThemeMode(next);
  return next;
}
