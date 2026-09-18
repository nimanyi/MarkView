/**
 * 设置面板：主题 / 颜色风格 / 视图模式 / 界面・编辑・预览字号 /
 * 同步滚动 / 排版工具栏 / 自动保存。
 *
 *  - 所有改动即时生效并持久化（无“确定”按钮，现代即时保存风格）；
 *  - 字号经 CSS 变量（--ui-font-size / --editor-font-size / --preview-font-size）
 *    下发，各区域无需重建；
 *  - 颜色风格：内置 + 用户自定义（7 色调色板），自定义编辑实时预览；
 *    支持导入 / 导出 JSON —— 风格市场的分发格式即此 JSON；
 *  - 主题、视图与工具栏显隐沿用各自模块的存储（theme.ts / layout.ts /
 *    toolbar.ts），这里只做 UI 联动。
 */

import {
  currentMode,
  setThemeMode,
  type ThemeMode,
  type Palette,
  type PaletteBase,
  type PaletteColors,
  DEFAULT_PALETTE_ID,
  BUILTIN_PALETTES,
  DEFAULT_LIGHT_COLORS,
  DEFAULT_DARK_COLORS,
  applyPaletteById,
  currentPaletteId,
  effectiveDark,
  findPalette,
  loadUserPalettes,
  saveUserPalettes,
  previewPaletteDraft,
  validatePalette,
} from "./theme";
import { setSyncScrollEnabled } from "./scroll";
import { formatBarVisible, setFormatBarVisible } from "./toolbar";
import { currentViewMode, setViewMode, type ViewMode } from "./layout";
import { baseName, pickOpenPathWith, pickSavePath, readTextFile, writeTextFile } from "./files";
import { t } from "./i18n";

export interface Settings {
  uiFont: number;
  editorFont: number;
  previewFont: number;
  syncScroll: boolean;
  /** 自动保存：停止输入 2 秒后写回已打开的文件（未命名文档跳过） */
  autoSave: boolean;
}

const STORAGE_KEY = "mdviewer.settings";
const TAB_KEY = "mdviewer.settings.tab";
const FONT_MIN = 12;
const FONT_MAX = 20;
const DEFAULTS: Settings = {
  uiFont: 14,
  editorFont: 14,
  previewFont: 14,
  syncScroll: true,
  autoSave: true,
};

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
      uiFont: clampFont(v.uiFont, DEFAULTS.uiFont),
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
  document.documentElement.style.setProperty("--ui-font-size", `${s.uiFont}px`);
  document.documentElement.style.setProperty("--editor-font-size", `${s.editorFont}px`);
  document.documentElement.style.setProperty("--preview-font-size", `${s.previewFont}px`);
  setSyncScrollEnabled(s.syncScroll);
}

/* ---------- 对话框装配 ---------- */

/** 主题被设置面板改变后由 main.ts 跟进（编辑器主题 / 按钮文案 / 重渲染） */
export interface SettingsHooks {
  onTheme(mode: ThemeMode): void;
  /** 颜色风格变化（含自定义实时预览）时跟进编辑器深浅与 Mermaid 重渲染 */
  onPalette(dark: boolean): void;
}

let openDialog: (() => void) | null = null;

/** 打开设置对话框（快捷键 Ctrl+, 与顶栏按钮共用） */
export function openSettingsDialog(): void {
  openDialog?.();
}

/** 调色板颜色键 → 设置面板里的标签（i18n 键） */
const COLOR_FIELDS: { key: keyof PaletteColors; label: string }[] = [
  { key: "bg", label: "color.bg" },
  { key: "bgEditor", label: "color.bgEditor" },
  { key: "fg", label: "color.fg" },
  { key: "fgMuted", label: "color.fgMuted" },
  { key: "border", label: "color.border" },
  { key: "accent", label: "color.accent" },
  { key: "codeBg", label: "color.codeBg" },
];

/** rgba()/任意颜色 → #rrggbb（颜色选择器只认 hex；丢失透明度可接受） */
function toHex(color: string, base: PaletteBase): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const m = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    return (
      "#" +
      [1, 2, 3]
        .map((i) => Math.min(255, Number(m[i])).toString(16).padStart(2, "0"))
        .join("")
    );
  }
  return base === "dark" ? "#3a3a42" : "#c8c8cd";
}

/** 正在编辑的自定义风格草稿（null = 编辑器关闭） */
interface Draft {
  id: string | null; // null = 新建；非 null = 修改已有的用户风格
  name: string;
  base: PaletteBase;
  colors: PaletteColors;
}

export function initSettingsDialog(hooks: SettingsHooks): void {
  const dlg = document.querySelector<HTMLDialogElement>("#settings-dialog")!;

  /* ---------- 标签页：设置项分组展示，免长滚动；记住上次所在页 ---------- */
  const tabBtns = [...dlg.querySelectorAll<HTMLButtonElement>(".set-tab")];
  const tabPages = [...dlg.querySelectorAll<HTMLElement>(".set-page")];

  function showTab(name: string): void {
    for (const t of tabBtns) {
      const on = t.dataset.tab === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    }
    for (const p of tabPages) p.hidden = p.dataset.page !== name;
  }

  for (const t of tabBtns) {
    t.addEventListener("click", () => {
      const name = t.dataset.tab ?? "look";
      localStorage.setItem(TAB_KEY, name);
      showTab(name);
    });
  }
  const savedTab = localStorage.getItem(TAB_KEY);
  showTab(tabBtns.some((t) => t.dataset.tab === savedTab) ? savedTab! : "look");

  const segBtns = document.querySelectorAll<HTMLButtonElement>("#theme-seg .seg-btn");
  const viewSegBtns = document.querySelectorAll<HTMLButtonElement>("#view-seg .seg-btn");
  const uiFont = document.querySelector<HTMLInputElement>("#set-ui-font")!;
  const uiFontVal = document.querySelector<HTMLElement>("#ui-font-value")!;
  const editorFont = document.querySelector<HTMLInputElement>("#set-editor-font")!;
  const editorFontVal = document.querySelector<HTMLElement>("#editor-font-value")!;
  const previewFont = document.querySelector<HTMLInputElement>("#set-preview-font")!;
  const previewFontVal = document.querySelector<HTMLElement>("#preview-font-value")!;
  const syncScrollEl = document.querySelector<HTMLInputElement>("#set-sync-scroll")!;
  const formatBarEl = document.querySelector<HTMLInputElement>("#set-format-bar")!;
  const autoSaveEl = document.querySelector<HTMLInputElement>("#set-autosave")!;

  /* 颜色风格相关元素 */
  const paletteList = document.querySelector<HTMLElement>("#palette-list")!;
  const paletteCustomBtn = document.querySelector<HTMLButtonElement>("#palette-custom")!;
  const paletteEditBtn = document.querySelector<HTMLButtonElement>("#palette-edit")!;
  const paletteImportBtn = document.querySelector<HTMLButtonElement>("#palette-import")!;
  const paletteExportBtn = document.querySelector<HTMLButtonElement>("#palette-export")!;
  const paletteHintEl = document.querySelector<HTMLElement>("#palette-hint")!;
  const editorBox = document.querySelector<HTMLElement>("#palette-editor")!;
  const nameInput = document.querySelector<HTMLInputElement>("#palette-name")!;
  const baseSegBtns = document.querySelectorAll<HTMLButtonElement>("#palette-base-seg .seg-btn");
  const colorsBox = document.querySelector<HTMLElement>("#palette-colors")!;
  const saveBtn = document.querySelector<HTMLButtonElement>("#palette-save")!;
  const cancelBtn = document.querySelector<HTMLButtonElement>("#palette-cancel")!;
  const deleteBtn = document.querySelector<HTMLButtonElement>("#palette-delete")!;

  let draft: Draft | null = null;
  let hintTimer = 0;

  const hint = (text: string): void => {
    paletteHintEl.textContent = text;
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => {
      paletteHintEl.textContent = "";
    }, 8000);
  };

  /* ---------- 风格芯片列表 ---------- */

  /** 一个风格芯片：名称 + 三色快照（背景 / 强调 / 文字） */
  function makeChip(id: string, name: string, colors: PaletteColors): HTMLButtonElement {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "palette-chip" + (id === currentPaletteId() ? " active" : "");
    chip.dataset.id = id;
    const label = document.createElement("span");
    label.className = "pc-name";
    label.textContent = name;
    chip.appendChild(label);
    const dots = document.createElement("span");
    dots.className = "pc-dots";
    for (const c of [colors.bg, colors.accent, colors.fg]) {
      const dot = document.createElement("span");
      dot.className = "pc-dot";
      dot.style.background = c;
      dots.appendChild(dot);
    }
    chip.appendChild(dots);
    chip.addEventListener("click", () => {
      cancelDraft(false); // 编辑中的草稿直接丢弃，选中的风格即最终外观
      hooks.onPalette(applyPaletteById(id));
      syncUI();
    });
    return chip;
  }

  function renderPaletteChips(): void {
    const frag = document.createDocumentFragment();
    const defaultDark = effectiveDark();
    frag.appendChild(
      makeChip(
        DEFAULT_PALETTE_ID,
        t("settings.paletteDefault"),
        defaultDark ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS,
      ),
    );
    for (const p of BUILTIN_PALETTES) frag.appendChild(makeChip(p.id, t(p.name), p.colors));
    for (const p of loadUserPalettes()) frag.appendChild(makeChip(p.id, t(p.name), p.colors));
    paletteList.replaceChildren(frag);
  }

  /* ---------- 自定义风格编辑器 ---------- */

  /** 草稿上色预览（编辑器 / 预览区立即跟随） */
  function paintDraft(): void {
    if (!draft) return;
    hooks.onPalette(previewPaletteDraft(draft.colors, draft.base));
  }

  function syncDraftUI(): void {
    if (!draft) return;
    nameInput.value = draft.name;
    for (const b of baseSegBtns) {
      b.classList.toggle("active", b.dataset.base === draft!.base);
    }
    for (const f of COLOR_FIELDS) {
      const input = colorsBox.querySelector<HTMLInputElement>(`[data-key="${f.key}"]`);
      if (input) input.value = toHex(draft.colors[f.key], draft.base);
    }
  }

  /** 打开编辑器：src = null 新建（以当前外观为起点），否则修改已有用户风格 */
  function startDraft(src: Palette | null): void {
    const curId = currentPaletteId();
    const cur = curId !== DEFAULT_PALETTE_ID ? findPalette(curId) : null;
    const base = src?.base ?? cur?.base ?? (effectiveDark() ? "dark" : "light");
    const colors = src?.colors ?? cur?.colors ?? (base === "dark" ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS);
    draft = { id: src?.id ?? null, name: src?.name ?? "", base, colors: { ...colors } };
    deleteBtn.hidden = draft.id === null;
    editorBox.hidden = false;
    syncDraftUI();
    paintDraft();
  }

  /** 关闭编辑器；restore = 还原为当前已保存的风格（预览草稿作废） */
  function cancelDraft(restore: boolean): void {
    if (!draft) return;
    draft = null;
    editorBox.hidden = true;
    if (restore) hooks.onPalette(applyPaletteById(currentPaletteId()));
    syncUI();
  }

  saveBtn.addEventListener("click", () => {
    if (!draft) return;
    const name = draft.name.trim() || t("palette.defaultName");
    const id = draft.id ?? `user-${Date.now()}`;
    const palette: Palette = { id, name, base: draft.base, colors: { ...draft.colors } };
    const list = loadUserPalettes().filter((p) => p.id !== id);
    list.push(palette);
    saveUserPalettes(list);
    draft = null;
    editorBox.hidden = true;
    hooks.onPalette(applyPaletteById(id));
    syncUI();
    hint(t("palette.saved", { name }));
  });

  cancelBtn.addEventListener("click", () => cancelDraft(true));

  deleteBtn.addEventListener("click", () => {
    if (!draft?.id) return;
    saveUserPalettes(loadUserPalettes().filter((p) => p.id !== draft!.id));
    draft = null;
    editorBox.hidden = true;
    hooks.onPalette(applyPaletteById(DEFAULT_PALETTE_ID));
    syncUI();
    hint(t("palette.deleted"));
  });

  paletteCustomBtn.addEventListener("click", () => startDraft(null));

  paletteEditBtn.addEventListener("click", () => {
    const id = currentPaletteId();
    const p = id !== DEFAULT_PALETTE_ID ? findPalette(id) : null;
    if (p && !BUILTIN_PALETTES.some((b) => b.id === p.id)) startDraft(p);
  });

  nameInput.addEventListener("input", () => {
    if (draft) draft.name = nameInput.value;
  });

  for (const b of baseSegBtns) {
    b.addEventListener("click", () => {
      if (!draft) return;
      draft.base = (b.dataset.base ?? "light") as PaletteBase;
      for (const x of baseSegBtns) x.classList.toggle("active", x === b);
      paintDraft();
    });
  }

  /* 颜色选择器行（一次性生成，data-key 对应 PaletteColors 键） */
  for (const f of COLOR_FIELDS) {
    const row = document.createElement("label");
    row.className = "palette-color";
    const input = document.createElement("input");
    input.type = "color";
    input.dataset.key = f.key;
    input.addEventListener("input", () => {
      if (!draft) return;
      draft.colors[f.key] = input.value;
      paintDraft();
    });
    row.appendChild(input);
    const label = document.createElement("span");
    label.textContent = t(f.label);
    row.appendChild(label);
    colorsBox.appendChild(row);
  }

  /* ---------- 风格导入 / 导出（风格市场分发格式） ---------- */

  paletteImportBtn.addEventListener("click", () => {
    void (async () => {
      const path = await pickOpenPathWith([{ name: t("export.paletteFilter"), extensions: ["json"] }]);
      if (!path) return;
      try {
        const data: unknown = JSON.parse(await readTextFile(path));
        const arr = Array.isArray(data) ? data : [data];
        const valid = arr.map(validatePalette).filter((p): p is Palette => p !== null);
        if (valid.length === 0) {
          hint(t("palette.importEmpty"));
          return;
        }
        const taken = new Set([...BUILTIN_PALETTES, ...loadUserPalettes()].map((p) => p.id));
        const list = loadUserPalettes();
        for (let p of valid) {
          if (taken.has(p.id)) {
            // id 冲突：换新 id 保留为副本
            p = { ...p, id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
          }
          taken.add(p.id);
          list.push(p);
        }
        saveUserPalettes(list);
        syncUI();
        hint(t("palette.imported", { count: valid.length }));
      } catch (err) {
        hint(t("palette.importFailed", { err: String(err) }));
      }
    })();
  });

  paletteExportBtn.addEventListener("click", () => {
    void (async () => {
      const list = loadUserPalettes();
      if (list.length === 0) {
        hint(t("palette.exportEmpty"));
        return;
      }
      const path = await pickSavePath("mdviewer-styles.json", [
        { name: "JSON", extensions: ["json"] },
      ]);
      if (!path) return;
      try {
        await writeTextFile(path, JSON.stringify(list, null, 2));
        hint(t("palette.exported", { count: list.length, file: baseName(path) }));
      } catch (err) {
        hint(t("palette.exportFailed", { err: String(err) }));
      }
    })();
  });

  /* ---------- 常规控件 ---------- */

  /* 打开时把各控件同步为当前状态 */
  const syncUI = (): void => {
    const mode = currentMode();
    for (const b of segBtns) b.classList.toggle("active", b.dataset.mode === mode);
    for (const b of viewSegBtns) b.classList.toggle("active", b.dataset.mode === currentViewMode());
    uiFont.value = String(settings.uiFont);
    uiFontVal.textContent = `${settings.uiFont}px`;
    editorFont.value = String(settings.editorFont);
    editorFontVal.textContent = `${settings.editorFont}px`;
    previewFont.value = String(settings.previewFont);
    previewFontVal.textContent = `${settings.previewFont}px`;
    syncScrollEl.checked = settings.syncScroll;
    formatBarEl.checked = formatBarVisible();
    autoSaveEl.checked = settings.autoSave;

    renderPaletteChips();
    /* 「编辑当前」仅在生效风格为用户自定义时出现 */
    const id = currentPaletteId();
    const isUser = id !== DEFAULT_PALETTE_ID && !BUILTIN_PALETTES.some((b) => b.id === id);
    paletteEditBtn.hidden = !isUser;
    if (isUser && draft?.id === id) {
      cancelDraft(false); // 正在编辑的就是当前风格时刷新为选中态即可
    }
  };

  const commit = (): void => {
    saveSettings(settings);
    applySettings(settings);
  };

  openDialog = (): void => {
    cancelDraft(false); // 上次未收尾的草稿预览还原为已保存外观
    syncUI();
    dlg.showModal();
  };

  /* 主题：持久化与 <html data-theme> 由 theme.ts 处理，编辑器跟进交给回调。
     显式选择三态 = 退出颜色风格（回默认配色），保证所见即所得。 */
  for (const b of segBtns) {
    b.addEventListener("click", () => {
      if (currentPaletteId() !== DEFAULT_PALETTE_ID) {
        hooks.onPalette(applyPaletteById(DEFAULT_PALETTE_ID));
      }
      const mode = (b.dataset.mode ?? "auto") as ThemeMode;
      setThemeMode(mode);
      hooks.onTheme(mode);
      syncUI();
    });
  }

  /* 视图模式：三态切换由 layout.ts 处理（含分栏比例恢复与持久化） */
  for (const b of viewSegBtns) {
    b.addEventListener("click", () => {
      setViewMode((b.dataset.mode ?? "split") as ViewMode);
      syncUI();
    });
  }

  uiFont.addEventListener("input", () => {
    settings.uiFont = clampFont(uiFont.value, settings.uiFont);
    uiFontVal.textContent = `${settings.uiFont}px`;
    commit();
  });

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
  dlg.addEventListener("close", () => cancelDraft(true)); // 关面板时丢弃未保存草稿

  /* 启动即应用已保存设置（字号 / 同步滚动开关） */
  applySettings(settings);
}
