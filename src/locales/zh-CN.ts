/**
 * 中文（简体）语言包
 * 从项目各源文件提取的全部用户可见中文字符串。
 */
import { registerLocale } from "../i18n";

const pack: Record<string, string> = {
  /* ---------- 启动占位 ---------- */
  "boot.title": "MDViewer",
  "boot.loading": "正在启动…",
  "boot.aria": "正在启动 MDViewer",

  /* ---------- 顶栏工具栏按钮 ---------- */
  "toolbar.new": "新建",
  "toolbar.open": "打开",
  "toolbar.openDir": "打开文件夹",
  "toolbar.save": "保存",
  "toolbar.saveAs": "另存为",
  "toolbar.exportHtml": "导出 HTML",
  "toolbar.exportPdf": "导出 PDF",
  "toolbar.settings": "设置",
  "toolbar.help": "说明",
  "toolbar.theme": "主题",
  "toolbar.sidebar": "侧栏",

  "toolbar.new.title": "新建文档（Ctrl+N）",
  "toolbar.open.title": "打开文件（Ctrl+O）",
  "toolbar.openDir.title": "打开文件夹（Ctrl+Shift+O）",
  "toolbar.save.title": "保存（Ctrl+S）",
  "toolbar.saveAs.title": "另存为（Ctrl+Shift+S）",
  "toolbar.exportHtml.title": "导出为独立 HTML 文件（Ctrl+Shift+E）",
  "toolbar.exportPdf.title": "打印 / 另存为 PDF（Ctrl+P）",
  "toolbar.settings.title": "设置（Ctrl+,）",
  "toolbar.help.title": "使用说明（Ctrl+Shift+H）",
  "toolbar.theme.title": "切换主题（Ctrl+Shift+L）",
  "toolbar.sidebar.title": "切换侧边栏（Ctrl+\\）",

  /* ---------- 文件名 / 状态提示 ---------- */
  "file.untitled": "未命名",
  "file.untitledMd": "未命名.md",
  "save.saved": "已保存",
  "save.unsaved": "未保存",
  "save.autoSaved": "已自动保存",
  "save.exportedHtml": "已导出 HTML",
  "save.copied": "已复制",

  /* ---------- 拖放打开 ---------- */
  "drop.hint": "拖放文件或文件夹以打开",
  "drop.formats": "支持 .md .markdown .mdx .txt 文件 / 文件夹",
  "drop.unsupported": "不支持的文件类型",
  "copy": "复制",

  /* ---------- 窗口标题 ---------- */
  "window.titleSuffix": " — MDViewer",
  "app.name": "MDViewer",

  /* ---------- 状态栏 ---------- */
  "stat.pos": "行 {line}，列 {col}",
  "stat.count": "{chars} 字符 · {lines} 行",
  "stat.checkUpdate": "检查更新",
  "stat.checkUpdate.title": "检查更新（Ctrl+Shift+U）",
  "stat.comrakGfm": "comrak · GFM",

  /* ---------- 侧边栏 ---------- */
  "sidebar.files": "文件",
  "sidebar.outline": "大纲",
  "sidebar.search": "搜索",
  "sidebar.aria": "侧边栏",
  "sidebar.ariaTablist": "打开的文档",
  "sidebar.refresh": "刷新",
  "sidebar.refresh.title": "刷新文件树",
  "sidebar.empty": "尚未打开文件夹",
  "sidebar.outlineEmpty": "文档中暂无标题",
  "sidebar.searchPlaceholder": "在打开的文件夹中搜索…",
  "sidebar.searchHint": "按 Ctrl+Shift+F 聚焦搜索",

  /* ---------- 搜索面板 ---------- */
  "search.noFolder": "先打开文件夹（Ctrl+Shift+O）再搜索",
  "search.empty": "输入关键词后回车搜索",
  "search.searching": "搜索中…",
  "search.noResults": "没有匹配结果",
  "search.capped": "结果已达 {limit} 条上限，已截断",

  /* ---------- 编辑器 ---------- */
  "editor.aria": "Markdown 编辑器",
  "editor.cursorLabel": "行 {line}，列 {col}",

  /* ---------- 排版工具栏 ---------- */
  "formatBar.aria": "Markdown 排版工具栏",
  "formatBar.show.title": "显示排版工具栏（Alt+T）",
  "formatBar.show.aria": "显示排版工具栏",
  "formatBar.hide.title": "隐藏工具栏（Alt+T 显示）",
  "formatBar.hide.aria": "隐藏工具栏",

  "fmt.bold.title": "加粗（Ctrl+B）",
  "fmt.italic.title": "斜体（Ctrl+I）",
  "fmt.strike.title": "删除线（Ctrl+Shift+X）",
  "fmt.code.title": "行内代码（Ctrl+E）",
  "fmt.link.title": "链接（Ctrl+K）",
  "fmt.quote.title": "引用块",
  "fmt.ul.title": "无序列表",
  "fmt.ol.title": "有序列表",
  "fmt.h1.title": "标题 H1（Ctrl+1）",
  "fmt.h2.title": "标题 H2（Ctrl+2）",
  "fmt.h3.title": "标题 H3（Ctrl+3）",
  "fmt.table.title": "插入表格",
  "fmt.hr.title": "插入分隔线",

  "fmt.tableTemplate": "| 标题 | 标题 | 标题 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |",

  /* ---------- 分隔条 ---------- */
  "divider.aria": "拖动调节编辑区与预览区宽度（双击复位）",

  /* ---------- 预览区 ---------- */
  "preview.aria": "渲染预览",

  /* ---------- 引导页 ---------- */
  "welcome.aria": "引导页",
  "welcome.title": "MDViewer",
  "welcome.subtitle": "Markdown 编辑 · 实时预览 · 导出分享",
  "welcome.new": "新建文档",
  "welcome.open": "打开文件",
  "welcome.openDir": "打开文件夹",
  "welcome.help": "使用说明",
  "welcome.feat1": "Rust comrak 解析：GFM 表格、任务列表、删除线、自动链接",
  "welcome.feat2": "多标签同时编辑多份文档，右键标签批量关闭",
  "welcome.feat3": "KaTeX 数学公式与 Mermaid 图表实时渲染",
  "welcome.feat4": "一键导出自包含 HTML，或打印为 PDF",
  "welcome.feat5": "文件树、大纲导航、全文搜索、自动保存",

  /* ---------- 设置面板 ---------- */
  "settings.title": "设置",
  "settings.tab.look": "外观",
  "settings.tab.font": "字号",
  "settings.tab.edit": "编辑",
  "settings.ariaTabs": "设置分组",
  "settings.close": "关闭",

  /* 设置 - 外观 */
  "settings.theme": "主题",
  "settings.theme.auto": "跟随系统",
  "settings.theme.light": "浅色",
  "settings.theme.dark": "深色",
  "settings.themeAria": "主题",
  "settings.palette": "颜色风格",
  "settings.paletteDefault": "默认（跟随主题）",
  "settings.paletteCustom": "自定义…",
  "settings.paletteEdit": "编辑当前",
  "settings.paletteImport": "导入…",
  "settings.paletteExport": "导出",
  "settings.paletteImport.title": "从 JSON 文件导入风格",
  "settings.paletteExport.title": "导出自定义风格为 JSON（可分享 / 上架风格市场）",
  "settings.palette.name": "名称",
  "settings.paletteNamePlaceholder": "我的风格",
  "settings.palette.base": "底色",
  "settings.palette.baseLight": "浅色底",
  "settings.palette.baseDark": "深色底",
  "settings.palette.baseAria": "底色",
  "settings.palette.save": "保存风格",
  "settings.palette.cancel": "取消",
  "settings.palette.delete": "删除此风格",

  /* 颜色字段标签 */
  "color.bg": "窗口背景",
  "color.bgEditor": "编辑区背景",
  "color.fg": "文字",
  "color.fgMuted": "次要文字",
  "color.border": "边框",
  "color.accent": "强调色",
  "color.codeBg": "代码背景",

  /* 设置 - 字号 */
  "settings.uiFont": "界面字号",
  "settings.editorFont": "编辑器字号",
  "settings.previewFont": "预览字号",

  /* 设置 - 编辑 */
  "settings.view": "视图",
  "settings.view.split": "双栏",
  "settings.view.editor": "仅编辑",
  "settings.view.preview": "仅预览",
  "settings.viewAria": "视图模式",
  "settings.syncScroll": "编辑区与预览区同步滚动",
  "settings.formatBar": "显示排版工具栏（Alt+T）",
  "settings.autoSave": "自动保存（停止输入 2 秒后写回原文件）",

  /* 设置 - 语言 */
  "settings.language": "语言",

  /* 设置面板提示消息 */
  "palette.saved": "已保存风格「{name}」，可用「导出」分享给他人",
  "palette.deleted": "已删除该风格",
  "palette.importEmpty": "文件里没有有效的颜色风格",
  "palette.imported": "已导入 {count} 个风格",
  "palette.importFailed": "导入失败：{err}",
  "palette.exportEmpty": "还没有自定义风格，先点「自定义…」做一个吧",
  "palette.exported": "已导出 {count} 个风格到 {file}",
  "palette.exportFailed": "导出失败：{err}",
  "palette.defaultName": "我的风格",
  "palette.unnamed": "未命名风格",

  /* ---------- 未保存对话框 ---------- */
  "unsaved.title": "是否保存更改？",
  "unsaved.confirm": "是否保存对{name}的更改？",
  "unsaved.save": "保存",
  "unsaved.discard": "不保存",
  "unsaved.cancel": "取消",

  /* ---------- 标签页 ---------- */
  "tab.welcome": "欢迎使用",
  "tab.close": "关闭标签页",
  "tab.close.title": "关闭标签页",
  "tab.new": "新建标签页（Ctrl+N）",
  "tab.new.aria": "新建标签页",
  "tab.closeLeft": "关闭左侧（{count} 个）",
  "tab.closeRight": "关闭右侧（{count} 个）",
  "tab.closeOthers": "关闭其他（{count} 个）",
  "tab.closeAll": "关闭所有（{count} 个）",
  "tab.dirtyMany": "「{first}」等 {count} 个文档",

  /* ---------- 右键菜单 ---------- */
  "ctx.cut": "剪切",
  "ctx.copy": "复制",
  "ctx.paste": "粘贴",
  "ctx.selectAll": "全选",
  "ctx.copyLink": "复制链接地址",

  /* ---------- 主题名称 ---------- */
  "theme.auto": "跟随系统",
  "theme.light": "浅色",
  "theme.dark": "深色",
  "theme.paper": "纸墨",
  "theme.green": "护眼绿",
  "theme.ocean": "深海蓝",
  "theme.violet": "暮紫",

  /* ---------- 视图模式 ---------- */
  "view.split": "双栏",
  "view.editor": "仅编辑",
  "view.preview": "仅预览",

  /* ---------- 更新 ---------- */
  "update.checking": "正在检查更新…",
  "update.latest": "已是最新版本",
  "update.found": "发现新版本 {version}，下载中…",
  "update.progress": "下载更新 {percent}%",
  "update.bytes": "下载更新 {bytes} B",
  "update.done": "下载完成，安装后自动重启…",
  "update.failed": "检查更新失败：{err}",
  "update.err.network": "网络连接失败，请检查网络后重试",
  "update.err.notfound": "未能连接更新服务器（所有端点不可达），请稍后重试",
  "update.err.signature": "更新签名验证失败，文件可能被篡改",

  /* ---------- 导出 ---------- */
  "export.htmlFilter": "HTML 页面",
  "export.mdFilter": "Markdown",
  "export.paletteFilter": "颜色风格 JSON",

  /* ---------- 错误消息（Rust 端） ---------- */
  "err.readDir": "读取目录失败：{err}",
  "err.readFile": "读取失败：{err}",
  "err.writeFile": "写入失败：{err}",

  /* ---------- Mermaid 错误 ---------- */
  "mermaid.error": "图表渲染失败：{err}",

  /* ---------- 关于 ---------- */
  "about.repoCopy": "复制",
  "about.repoTitle": "在浏览器中打开",
  "about.repoCopyTitle": "复制仓库地址",

  /* ---------- 主题按钮显示 ---------- */
  "toolbar.themeDisplay": "主题：{mode}",

  /* ---------- 引号格式 ---------- */
  "format.quote": "「{name}」",

  /* ---------- 快捷键标签 ---------- */
  "sc.new": "新建文档",
  "sc.open": "打开文件",
  "sc.openDir": "打开文件夹",
  "sc.save": "保存",
  "sc.saveAs": "另存为",
  "sc.closeTab": "关闭标签页",
  "sc.nextTab": "下一个标签",
  "sc.prevTab": "上一个标签",
  "sc.exportHtml": "导出 HTML",
  "sc.exportPdf": "打印 / 导出 PDF",
  "sc.settings": "设置",
  "sc.help": "使用说明",
  "sc.toggleSidebar": "切换侧边栏",
  "sc.toggleView": "切换视图（双栏 / 仅编辑 / 仅预览）",
  "sc.togglePreview": "隐藏 / 显示预览",
  "sc.toggleTheme": "切换主题",
  "sc.search": "全文搜索",
  "sc.checkUpdate": "检查更新",

  /* ---------- 帮助对话框 ---------- */
  "help.title": "MDViewer 使用说明",
  "help.intro": "简介",
  "help.intro.p1": "MDViewer 是一款跨平台 Markdown 编辑 / 预览应用：左侧编辑、右侧实时预览，解析由 Rust 端 comrak 完成（完整 GFM 支持），内建 KaTeX 数学公式与 Mermaid 图表渲染，支持导出独立 HTML 与 PDF、文件树管理、大纲导航、全文搜索和自动更新。",
  "help.ui": "界面",
  "help.ui.sidebar": "侧边栏（Ctrl+\\）：文件树 / 文档大纲 / 全文搜索三个标签页",
  "help.ui.view": "视图模式（Ctrl+Shift+V）：双栏 / 仅编辑 / 仅预览，设置面板中同样可选",
  "help.ui.context": "右键菜单：按位置提供剪切 / 复制 / 粘贴、复制链接等（浏览器默认菜单已屏蔽）",
  "help.ui.editor": "编辑区：顶部排版工具栏随光标高亮当前格式，可用 Alt+T 收起",
  "help.ui.divider": "中缝分隔条：拖动调节编辑 / 预览宽度，双击复位",
  "help.ui.settings": "设置（Ctrl+,）：主题三态、颜色风格（内置 / 自定义 7 色调色板，实时预览；可导入 / 导出 JSON 与人分享——风格市场的分发格式）、界面 / 编辑器 / 预览字号",
  "help.ui.autosave": "自动保存：打开的文件停止输入 2 秒后自动写回（设置中可关闭）",
  "help.ui.tabs": "多标签：可同时打开多份文档，点击标签或 Ctrl+Tab 切换，Ctrl+W / 中键关闭；右键标签可批量关闭左侧 / 右侧 / 其他 / 所有；标签圆点亮起表示有未保存修改，打开新文件不会打断当前编辑",
  "help.ui.welcome": "引导页：启动或关闭全部标签时显示，提供新建 / 打开文件 / 打开文件夹 / 使用说明的快捷入口",
  "help.ui.dragDrop": "拖放打开：将 .md / .markdown / .mdx / .txt 文件或文件夹直接拖入窗口即可打开；拖入文件夹时自动在侧边栏文件树中展开",
  "help.shortcuts": "全局快捷键",
  "help.sc.new": "新建文档",
  "help.sc.open": "打开文件 / 打开文件夹",
  "help.sc.save": "保存 / 另存为",
  "help.sc.close": "关闭标签页",
  "help.sc.tab": "下一个 / 上一个标签",
  "help.sc.export": "导出 HTML / 打印・PDF",
  "help.sc.sidebar": "切换侧边栏",
  "help.sc.view": "切换视图（双栏 / 仅编辑 / 仅预览）",
  "help.sc.preview": "隐藏 / 显示预览（仅编辑 ↔ 双栏）",
  "help.sc.formatBar": "显示 / 隐藏排版工具栏",
  "help.sc.theme": "循环切换主题",
  "help.sc.search": "全文搜索",
  "help.sc.settings": "设置 / 本说明",
  "help.sc.update": "检查更新",
  "help.editorShortcuts": "编辑器排版快捷键（光标在编辑器内）",
  "help.es.bold": "加粗 / 斜体",
  "help.es.code": "行内代码 / 删除线",
  "help.es.link": "插入链接（选区作链接文字）",
  "help.es.heading": "设为 H1~H6 标题（同键再按取消）",
  "help.hint": "以上均为 toggle 语义：已包裹再按一次即取消；工具栏按钮与快捷键行为一致。",
  "help.about": "关于",
  "help.about.versionLabel": "版本 ",
  "help.about.versionRest": " · Tauri 2 + CodeMirror 6 + comrak · 偏好（主题、字号、分栏比例等）保存在本机，可在设置中调整；应用更新可从状态栏\"检查更新\"手动触发。",
  "help.about.repo": "项目主页：",
  "help.about.copyright": "© 2026 MDViewer · 保留所有权利",
  "help.about.license": "本软件以 MIT 许可发布，并在下列开源组件之上构建：",
  "help.about.thanks": "感谢以上开源社区的贡献者。",
};

registerLocale(
  { id: "zh-CN", label: "中文", htmlLang: "zh-CN" },
  pack,
);
