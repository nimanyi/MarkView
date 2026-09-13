import { invoke } from "@tauri-apps/api/core";
import { pickSavePath, writeTextFile } from "./files";
import { enhanceBodyHtml, KATEX_CDN_CSS } from "./enhance";

/** 保存对话框的 HTML 文件类型 */
const HTML_FILTERS = [{ name: "HTML 页面", extensions: ["html", "htm"] }];

/**
 * 导出文档的内嵌样式：与预览区排版一致（GFM 元素覆盖），
 * 跟随查看环境深浅色；@media print 为纸张输出微调。
 */
const EXPORT_CSS = `
:root {
  color-scheme: light dark;
  --fg: #171717;
  --fg-muted: #52525b;
  --border: rgba(23, 23, 23, 0.14);
  --accent: #4b3fe3;
  --code-bg: #eceef3;
}
@media (prefers-color-scheme: dark) {
  :root {
    --fg: #e5e5e5;
    --fg-muted: #a1a1aa;
    --border: rgba(229, 229, 229, 0.16);
    --accent: #8b83f5;
    --code-bg: #26262a;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0 auto;
  padding: 40px 24px 72px;
  max-width: 820px;
  font-family: "SF Pro Text", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  line-height: 1.7;
  color: var(--fg);
  background: #ffffff;
}
@media (prefers-color-scheme: dark) {
  body { background: #171717; }
}
h1, h2, h3 { line-height: 1.3; margin: 1.2em 0 0.5em; }
h1 { font-size: 1.6em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
h2 { font-size: 1.3em; }
p { margin: 0.6em 0; }
blockquote {
  margin: 0.8em 0;
  padding: 0.2em 1em;
  border-left: 3px solid var(--accent);
  color: var(--fg-muted);
}
code {
  background: var(--code-bg);
  border-radius: 4px;
  padding: 0.15em 0.4em;
  font-size: 0.9em;
  font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
}
pre {
  background: var(--code-bg);
  border-radius: 8px;
  padding: 12px 16px;
  overflow-x: auto;
}
pre code { background: none; padding: 0; }
table { border-collapse: collapse; margin: 0.8em 0; }
th, td { border: 1px solid var(--border); padding: 6px 14px; text-align: left; }
th { background: var(--code-bg); }
li.task-list-item { list-style: none; margin-left: -1.2em; }
a { color: var(--accent); }
hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
img { max-width: 100%; }
.math-display { overflow-x: auto; padding: 4px 0; }
.mermaid-figure { margin: 0.8em 0; text-align: center; overflow-x: auto; }
.mermaid-figure svg { max-width: 100%; height: auto; }
@media print {
  body { max-width: none; padding: 0; background: #ffffff; color: #171717; }
  pre { white-space: pre-wrap; }
  code, pre, th {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  a { color: inherit; }
}
`;

/** 转义 HTML 文本节点中的特殊字符（用于 <title> 等） */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
}

/** 由文档名推导导出建议文件名：readme.md -> readme.html */
export function suggestExportName(docName: string, ext: string): string {
  return docName.replace(/\.(md|markdown|mdx|txt)$/i, "") + ext;
}

/** 组装自包含 HTML 文档：body 由 Rust 端 comrak 渲染，与预览同源；
 *  公式与图表经同一增强链路处理（含数学公式时引 KaTeX 样式 CDN） */
export async function buildStandaloneHtml(markdown: string, title: string): Promise<string> {
  const raw = await invoke<string>("parse_markdown", { source: markdown });
  const { html: body, hasMath } = await enhanceBodyHtml(raw);
  return [
    "<!DOCTYPE html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `<title>${escapeHtml(title)}</title>`,
    ...(hasMath ? [`<link rel="stylesheet" href="${KATEX_CDN_CSS}">`] : []),
    "<style>",
    EXPORT_CSS,
    "</style>",
    "</head>",
    "<body>",
    body,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** 导出为 HTML 文件（经系统保存对话框）。返回是否实际写出（取消返回 false）。 */
export async function exportHtmlFile(
  markdown: string,
  title: string,
  suggestedName: string,
): Promise<boolean> {
  const html = await buildStandaloneHtml(markdown, title);
  const path = await pickSavePath(suggestedName, HTML_FILTERS);
  if (!path) return false;
  await writeTextFile(path, html);
  return true;
}

/**
 * 通过隐藏 iframe 调起系统打印（WebView 打印通道）：
 * Windows（WebView2）弹出打印预览，可选"另存为 PDF" / "Microsoft Print to PDF"。
 * 注：iframe 不用 display:none——部分引擎不为隐藏框架生成打印布局。
 */
export function printStandaloneHtml(html: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "100%";
  frame.style.bottom = "100%";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.srcdoc = html;
  frame.addEventListener("load", () => {
    const target = frame.contentWindow;
    if (!target) {
      frame.remove();
      return;
    }
    target.focus();
    target.print(); // Chromium / WebView2 阻塞至打印对话框关闭
    // 延迟移除：兼容 print() 立即返回的引擎，避免布局被过早销毁
    window.setTimeout(() => frame.remove(), 1000);
  });
  document.body.appendChild(frame);
}
