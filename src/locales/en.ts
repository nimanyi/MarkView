/**
 * English language pack
 * Mirrors all keys from zh-CN.ts with English translations.
 */
import { registerLocale } from "../i18n";

const pack: Record<string, string> = {
  /* ---------- Boot ---------- */
  "boot.title": "MDViewer",
  "boot.loading": "Starting…",
  "boot.aria": "Starting MDViewer",

  /* ---------- Toolbar buttons ---------- */
  "toolbar.new": "New",
  "toolbar.open": "Open",
  "toolbar.openDir": "Open Folder",
  "toolbar.save": "Save",
  "toolbar.saveAs": "Save As",
  "toolbar.exportHtml": "Export HTML",
  "toolbar.exportPdf": "Export PDF",
  "toolbar.settings": "Settings",
  "toolbar.help": "Help",
  "toolbar.theme": "Theme",
  "toolbar.sidebar": "Sidebar",

  "toolbar.new.title": "New document (Ctrl+N)",
  "toolbar.open.title": "Open file (Ctrl+O)",
  "toolbar.openDir.title": "Open folder (Ctrl+Shift+O)",
  "toolbar.save.title": "Save (Ctrl+S)",
  "toolbar.saveAs.title": "Save As (Ctrl+Shift+S)",
  "toolbar.exportHtml.title": "Export as standalone HTML (Ctrl+Shift+E)",
  "toolbar.exportPdf.title": "Print / Save as PDF (Ctrl+P)",
  "toolbar.settings.title": "Settings (Ctrl+,)",
  "toolbar.help.title": "Help (Ctrl+Shift+H)",
  "toolbar.theme.title": "Switch theme (Ctrl+Shift+L)",
  "toolbar.sidebar.title": "Toggle sidebar (Ctrl+\\)",

  /* ---------- File names / status ---------- */
  "file.untitled": "Untitled",
  "file.untitledMd": "Untitled.md",
  "save.saved": "Saved",
  "save.unsaved": "Unsaved",
  "save.autoSaved": "Auto-saved",
  "save.exportedHtml": "HTML exported",
  "save.copied": "Copied",

  /* ---------- Drag & Drop ---------- */
  "drop.hint": "Drop files or folders to open",
  "drop.formats": "Supports .md .markdown .mdx .txt files / folders",
  "drop.unsupported": "Unsupported file type",
  "copy": "Copy",

  /* ---------- Window title ---------- */
  "window.titleSuffix": " — MDViewer",
  "app.name": "MDViewer",

  /* ---------- Status bar ---------- */
  "stat.pos": "Line {line}, Col {col}",
  "stat.count": "{chars} chars · {lines} lines",
  "stat.checkUpdate": "Check for updates",
  "stat.checkUpdate.title": "Check for updates (Ctrl+Shift+U)",
  "stat.comrakGfm": "comrak · GFM",

  /* ---------- Sidebar ---------- */
  "sidebar.files": "Files",
  "sidebar.outline": "Outline",
  "sidebar.search": "Search",
  "sidebar.aria": "Sidebar",
  "sidebar.ariaTablist": "Open documents",
  "sidebar.refresh": "Refresh",
  "sidebar.refresh.title": "Refresh file tree",
  "sidebar.empty": "No folder opened",
  "sidebar.outlineEmpty": "No headings in document",
  "sidebar.searchPlaceholder": "Search in opened folder…",
  "sidebar.searchHint": "Press Ctrl+Shift+F to focus search",

  /* ---------- Search panel ---------- */
  "search.noFolder": "Open a folder first (Ctrl+Shift+O) to search",
  "search.empty": "Type keywords and press Enter to search",
  "search.searching": "Searching…",
  "search.noResults": "No results found",
  "search.capped": "Results capped at {limit}, truncated",

  /* ---------- Editor ---------- */
  "editor.aria": "Markdown editor",
  "editor.cursorLabel": "Line {line}, Col {col}",

  /* ---------- Format toolbar ---------- */
  "formatBar.aria": "Markdown format toolbar",
  "formatBar.show.title": "Show format toolbar (Alt+T)",
  "formatBar.show.aria": "Show format toolbar",
  "formatBar.hide.title": "Hide toolbar (Alt+T to show)",
  "formatBar.hide.aria": "Hide toolbar",

  "fmt.bold.title": "Bold (Ctrl+B)",
  "fmt.italic.title": "Italic (Ctrl+I)",
  "fmt.strike.title": "Strikethrough (Ctrl+Shift+X)",
  "fmt.code.title": "Inline code (Ctrl+E)",
  "fmt.link.title": "Link (Ctrl+K)",
  "fmt.quote.title": "Blockquote",
  "fmt.ul.title": "Unordered list",
  "fmt.ol.title": "Ordered list",
  "fmt.h1.title": "Heading H1 (Ctrl+1)",
  "fmt.h2.title": "Heading H2 (Ctrl+2)",
  "fmt.h3.title": "Heading H3 (Ctrl+3)",
  "fmt.table.title": "Insert table",
  "fmt.hr.title": "Insert horizontal rule",

  "fmt.tableTemplate": "| Header | Header | Header |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |",

  /* ---------- Divider ---------- */
  "divider.aria": "Drag to resize editor and preview panes (double-click to reset)",

  /* ---------- Preview ---------- */
  "preview.aria": "Rendered preview",

  /* ---------- Welcome page ---------- */
  "welcome.aria": "Welcome page",
  "welcome.title": "MDViewer",
  "welcome.subtitle": "Markdown editing · Live preview · Export & share",
  "welcome.new": "New Document",
  "welcome.open": "Open File",
  "welcome.openDir": "Open Folder",
  "welcome.help": "Help",
  "welcome.feat1": "Rust comrak parser: GFM tables, task lists, strikethrough, autolinks",
  "welcome.feat2": "Multi-tab editing with right-click batch close",
  "welcome.feat3": "KaTeX math formulas and Mermaid diagrams rendered live",
  "welcome.feat4": "One-click self-contained HTML export, or print to PDF",
  "welcome.feat5": "File tree, outline navigation, full-text search, auto-save",

  /* ---------- Settings panel ---------- */
  "settings.title": "Settings",
  "settings.tab.look": "Appearance",
  "settings.tab.font": "Font Size",
  "settings.tab.edit": "Editor",
  "settings.ariaTabs": "Settings groups",
  "settings.close": "Close",

  /* Settings - Appearance */
  "settings.theme": "Theme",
  "settings.theme.auto": "System",
  "settings.theme.light": "Light",
  "settings.theme.dark": "Dark",
  "settings.themeAria": "Theme",
  "settings.palette": "Color scheme",
  "settings.paletteDefault": "Default (follow theme)",
  "settings.paletteCustom": "Custom…",
  "settings.paletteEdit": "Edit current",
  "settings.paletteImport": "Import…",
  "settings.paletteExport": "Export",
  "settings.paletteImport.title": "Import scheme from JSON file",
  "settings.paletteExport.title": "Export custom scheme as JSON (shareable)",
  "settings.palette.name": "Name",
  "settings.paletteNamePlaceholder": "My scheme",
  "settings.palette.base": "Base",
  "settings.palette.baseLight": "Light base",
  "settings.palette.baseDark": "Dark base",
  "settings.palette.baseAria": "Base",
  "settings.palette.save": "Save scheme",
  "settings.palette.cancel": "Cancel",
  "settings.palette.delete": "Delete this scheme",

  /* Color field labels */
  "color.bg": "Window background",
  "color.bgEditor": "Editor background",
  "color.fg": "Text",
  "color.fgMuted": "Secondary text",
  "color.border": "Border",
  "color.accent": "Accent",
  "color.codeBg": "Code background",

  /* Settings - Font size */
  "settings.uiFont": "UI font size",
  "settings.editorFont": "Editor font size",
  "settings.previewFont": "Preview font size",

  /* Settings - Editor */
  "settings.view": "View",
  "settings.view.split": "Split",
  "settings.view.editor": "Editor only",
  "settings.view.preview": "Preview only",
  "settings.viewAria": "View mode",
  "settings.syncScroll": "Sync scroll between editor and preview",
  "settings.formatBar": "Show format toolbar (Alt+T)",
  "settings.autoSave": "Auto-save (writes back to file 2s after typing stops)",

  /* Settings - Language */
  "settings.language": "Language",

  /* Palette messages */
  "palette.saved": "Saved scheme \"{name}\". Use \"Export\" to share it.",
  "palette.deleted": "Scheme deleted",
  "palette.importEmpty": "No valid color scheme found in file",
  "palette.imported": "Imported {count} schemes",
  "palette.importFailed": "Import failed: {err}",
  "palette.exportEmpty": "No custom schemes yet. Click \"Custom…\" to create one.",
  "palette.exported": "Exported {count} schemes to {file}",
  "palette.exportFailed": "Export failed: {err}",
  "palette.defaultName": "My scheme",
  "palette.unnamed": "Unnamed scheme",

  /* ---------- Unsaved dialog ---------- */
  "unsaved.title": "Save changes?",
  "unsaved.confirm": "Save changes to {name}?",
  "unsaved.save": "Save",
  "unsaved.discard": "Don't save",
  "unsaved.cancel": "Cancel",

  /* ---------- Tabs ---------- */
  "tab.welcome": "Welcome",
  "tab.close": "Close tab",
  "tab.close.title": "Close tab",
  "tab.new": "New tab (Ctrl+N)",
  "tab.new.aria": "New tab",
  "tab.closeLeft": "Close to left ({count})",
  "tab.closeRight": "Close to right ({count})",
  "tab.closeOthers": "Close others ({count})",
  "tab.closeAll": "Close all ({count})",
  "tab.dirtyMany": "{first} and {count} others",

  /* ---------- Context menu ---------- */
  "ctx.cut": "Cut",
  "ctx.copy": "Copy",
  "ctx.paste": "Paste",
  "ctx.selectAll": "Select all",
  "ctx.copyLink": "Copy link address",

  /* ---------- Theme names ---------- */
  "theme.auto": "System",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.paper": "Paper Ink",
  "theme.green": "Eye-care Green",
  "theme.ocean": "Ocean Blue",
  "theme.violet": "Dusk Violet",

  /* ---------- View mode ---------- */
  "view.split": "Split",
  "view.editor": "Editor only",
  "view.preview": "Preview only",

  /* ---------- Update ---------- */
  "update.checking": "Checking for updates…",
  "update.latest": "Already up to date",
  "update.found": "New version {version} found, downloading…",
  "update.progress": "Downloading update {percent}%",
  "update.bytes": "Downloading update {bytes} B",
  "update.done": "Download complete, restarting after install…",
  "update.failed": "Update check failed: {err}",
  "update.err.network": "Network connection failed, please check your connection and retry",
  "update.err.notfound": "Unable to reach update server (all endpoints unavailable), please try again later",
  "update.err.signature": "Update signature verification failed, file may have been tampered with",

  /* ---------- Export ---------- */
  "export.htmlFilter": "HTML page",
  "export.mdFilter": "Markdown",
  "export.paletteFilter": "Color scheme JSON",

  /* ---------- Errors (Rust) ---------- */
  "err.readDir": "Failed to read directory: {err}",
  "err.readFile": "Failed to read: {err}",
  "err.writeFile": "Failed to write: {err}",

  /* ---------- Mermaid ---------- */
  "mermaid.error": "Diagram rendering failed: {err}",

  /* ---------- About ---------- */
  "about.repoCopy": "Copy",
  "about.repoTitle": "Open in browser",
  "about.repoCopyTitle": "Copy repository URL",

  /* ---------- Theme button display ---------- */
  "toolbar.themeDisplay": "Theme: {mode}",

  /* ---------- Quote format ---------- */
  "format.quote": "\"{name}\"",

  /* ---------- Shortcut labels ---------- */
  "sc.new": "New document",
  "sc.open": "Open file",
  "sc.openDir": "Open folder",
  "sc.save": "Save",
  "sc.saveAs": "Save As",
  "sc.closeTab": "Close tab",
  "sc.nextTab": "Next tab",
  "sc.prevTab": "Previous tab",
  "sc.exportHtml": "Export HTML",
  "sc.exportPdf": "Print / Export PDF",
  "sc.settings": "Settings",
  "sc.help": "Help",
  "sc.toggleSidebar": "Toggle sidebar",
  "sc.toggleView": "Toggle view (split / editor only / preview only)",
  "sc.togglePreview": "Hide / show preview",
  "sc.toggleTheme": "Toggle theme",
  "sc.search": "Full-text search",
  "sc.checkUpdate": "Check for updates",

  /* ---------- Help dialog ---------- */
  "help.title": "MDViewer Help",
  "help.intro": "Introduction",
  "help.intro.p1": "MDViewer is a cross-platform Markdown editing and preview application: edit on the left, live preview on the right. Parsing is handled by Rust comrak (full GFM support), with built-in KaTeX math formulas and Mermaid diagram rendering. It supports standalone HTML and PDF export, file tree management, outline navigation, full-text search, and auto-update.",
  "help.ui": "Interface",
  "help.ui.sidebar": "Sidebar (Ctrl+\\): file tree / document outline / full-text search tabs",
  "help.ui.view": "View mode (Ctrl+Shift+V): split / editor only / preview only, also available in settings",
  "help.ui.context": "Context menu: cut / copy / paste, copy link, etc. by location (browser default menu is disabled)",
  "help.ui.editor": "Editor: format toolbar at top highlights current format at cursor, can be collapsed with Alt+T",
  "help.ui.divider": "Pane divider: drag to resize editor / preview width, double-click to reset",
  "help.ui.settings": "Settings (Ctrl+,): theme modes, color schemes (built-in / custom 7-color palette with live preview; import / export JSON to share — the distribution format for scheme marketplace), UI / editor / preview font sizes",
  "help.ui.autosave": "Auto-save: open files are automatically written back 2 seconds after typing stops (can be disabled in settings)",
  "help.ui.tabs": "Multi-tab: open multiple documents simultaneously, click tabs or Ctrl+Tab to switch, Ctrl+W / middle-click to close; right-click tab to batch close left / right / others / all; the dot indicator lights up for unsaved changes, opening a new file won't interrupt current editing",
  "help.ui.welcome": "Welcome page: shown on startup or when all tabs are closed, provides quick actions for new / open file / open folder / help",
  "help.ui.dragDrop": "Drag & Drop: drop .md / .markdown / .mdx / .txt files or folders directly into the window to open them; dropping a folder opens it in the sidebar file tree",
  "help.shortcuts": "Global Shortcuts",
  "help.sc.new": "New document",
  "help.sc.open": "Open file / Open folder",
  "help.sc.save": "Save / Save As",
  "help.sc.close": "Close tab",
  "help.sc.tab": "Next / Previous tab",
  "help.sc.export": "Export HTML / Print・PDF",
  "help.sc.sidebar": "Toggle sidebar",
  "help.sc.view": "Toggle view (split / editor only / preview only)",
  "help.sc.preview": "Hide / show preview (editor only ↔ split)",
  "help.sc.formatBar": "Show / hide format toolbar",
  "help.sc.theme": "Cycle theme",
  "help.sc.search": "Full-text search",
  "help.sc.settings": "Settings / This help",
  "help.sc.update": "Check for updates",
  "help.editorShortcuts": "Editor formatting shortcuts (cursor in editor)",
  "help.es.bold": "Bold / Italic",
  "help.es.code": "Inline code / Strikethrough",
  "help.es.link": "Insert link (selection as link text)",
  "help.es.heading": "Set as H1~H6 heading (press again to unset)",
  "help.hint": "All of the above use toggle semantics: pressing once more removes the formatting; toolbar buttons behave identically to shortcuts.",
  "help.about": "About",
  "help.about.versionLabel": "Version ",
  "help.about.versionRest": " · Tauri 2 + CodeMirror 6 + comrak · Preferences (theme, font size, split ratio, etc.) are saved locally and adjustable in Settings; app updates can be triggered manually from the status bar \"Check for updates\".",
  "help.about.repo": "Repository: ",
  "help.about.copyright": "© 2026 MDViewer · All rights reserved",
  "help.about.license": "This software is released under the MIT license and built upon the following open-source components:",
  "help.about.thanks": "Thanks to the contributors of these open-source communities.",
};

registerLocale(
  { id: "en", label: "English", htmlLang: "en" },
  pack,
);
