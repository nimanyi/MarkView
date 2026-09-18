/**
 * i18n 核心：语言包注册、t() 翻译函数、locale 管理、DOM 批量更新。
 *
 * - 语言包为纯 TypeScript 对象（src/locales/*.ts），扁平 key 用点分命名空间；
 * - t(key, params?) 支持 {name} 占位符插值；
 * - locale 持久化于 localStorage（mdviewer.locale），首次启动检测系统语言；
 * - applyDom() 扫描 [data-i18n] / [data-i18n-title] / [data-i18n-placeholder]
 *   / [data-i18n-aria-label] 属性批量更新静态 HTML 文本；
 * - setLocale() 切换语言后触发 applyDom() + onLocaleChange 回调链。
 */

export type LocaleId = string;

export interface LocaleMeta {
  id: LocaleId;
  /** 显示名（用自身语言书写，如「中文」「English」） */
  label: string;
  /** <html lang> 属性值 */
  htmlLang: string;
}

/** 已注册的语言列表（注册顺序即选择器展示顺序） */
const REGISTRY: LocaleMeta[] = [];

/** 语言包数据：{ localeId: { "key": "translation" } } */
const PACKS: Record<string, Record<string, string>> = {};

/** 当前生效 locale */
let currentLocale = "zh-CN";

/** 默认 locale（回退语言） */
const DEFAULT_LOCALE = "zh-CN";

const STORAGE_KEY = "mdviewer.locale";

/* ---------- 语言包注册 ---------- */

/** 注册一个语言包（由 locales/*.ts 在模块加载时调用） */
export function registerLocale(meta: LocaleMeta, pack: Record<string, string>): void {
  REGISTRY.push(meta);
  PACKS[meta.id] = pack;
}

/** 获取所有已注册语言元信息（选择器用） */
export function availableLocales(): LocaleMeta[] {
  return REGISTRY;
}

/* ---------- locale 管理 ---------- */

/** 检测系统语言，映射到已注册的 locale（未匹配回退默认） */
function detectSystemLocale(): string {
  const lang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || "en";
  // 精确匹配
  if (PACKS[lang]) return lang;
  // 前缀匹配（zh → zh-CN, en → en）
  const prefix = lang.split("-")[0];
  const match = REGISTRY.find((m) => m.id.startsWith(prefix));
  return match ? match.id : DEFAULT_LOCALE;
}

/** 获取当前 locale */
export function getLocale(): string {
  return currentLocale;
}

/** 初始化 locale（启动时调用一次）：读取存储 → 检测系统 → 默认 */
export function initLocale(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && PACKS[stored]) {
    currentLocale = stored;
  } else {
    currentLocale = detectSystemLocale();
  }
  applyHtmlLang();
  return currentLocale;
}

/** 切换 locale：持久化 + 更新 <html lang> + 触发回调 */
let localeChangeCallbacks: (() => void)[] = [];
export function onLocaleChange(cb: () => void): void {
  localeChangeCallbacks.push(cb);
}

export function setLocale(locale: string): void {
  if (!PACKS[locale] || locale === currentLocale) return;
  currentLocale = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  applyHtmlLang();
  applyDom();
  for (const cb of localeChangeCallbacks) cb();
}

function applyHtmlLang(): void {
  const meta = REGISTRY.find((m) => m.id === currentLocale);
  if (meta) document.documentElement.lang = meta.htmlLang;
}

/* ---------- 翻译函数 ---------- */

/**
 * 翻译：t("app.title") → "MDViewer"
 * 带插值：t("stat.count", { chars: 100, lines: 10 }) → "100 字符 · 10 行"
 * 未找到 key 时回退到默认语言，再找不到返回 key 本身。
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = PACKS[currentLocale]?.[key] ?? PACKS[DEFAULT_LOCALE]?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}

/* ---------- DOM 批量更新 ---------- */

/**
 * 扫描 DOM 中所有 data-i18n* 属性，更新文本 / title / placeholder / aria-label。
 * 切换语言时自动调用；也可手动调用刷新动态生成的元素。
 */
export function applyDom(root: ParentNode = document): void {
  // data-i18n="key" → textContent
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  // data-i18n-title="key" → title 属性
  root.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (key) el.title = t(key);
  });
  // data-i18n-placeholder="key" → placeholder 属性
  root.querySelectorAll<HTMLElement>("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key) {
      const input = el as HTMLInputElement;
      if (input.placeholder !== undefined) input.placeholder = t(key);
    }
  });
  // data-i18n-aria-label="key" → aria-label 属性
  root.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((el) => {
    const key = el.dataset.i18nAriaLabel;
    if (key) el.setAttribute("aria-label", t(key));
  });
}
