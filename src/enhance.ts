/**
 * 预览增强：数学公式（KaTeX）与图表（Mermaid）。
 * - 输入是 comrak 的输出 HTML：
 *   - 行内公式 `<code data-math-style="inline">…</code>`
 *   - 块级公式 `<pre><code class="language-math" data-math-style="display">…</code></pre>`
 *   - Mermaid 图表 ```` ```mermaid ```` 代码块 → `<pre><code class="language-mermaid">`
 * - KaTeX 静态导入（小）；Mermaid 动态导入（体积大，按需加载）
 * - 就地处理（enhancePreview）与导出处理（enhanceBodyHtml）共用同一实现
 */
import katex from "katex";
import { effectiveDark } from "./theme";

/** 渲染计数：Mermaid SVG 节点 id 唯一化 */
let seq = 0;

/** 数学公式增强：就地渲染 KaTeX（无 DOM 挂载依赖，失败时保留原文） */
function enhanceMath(root: ParentNode): boolean {
  let rendered = false;
  root.querySelectorAll<HTMLElement>("[data-math-style]").forEach((el) => {
    const tex = (el.textContent ?? "").trim();
    const display = el.getAttribute("data-math-style") === "display";
    const target = document.createElement(display ? "div" : "span");
    target.className = display ? "math-display" : "math-inline";
    try {
      katex.render(tex, target, { displayMode: display, throwOnError: true });
      el.replaceWith(target);
      rendered = true;
    } catch {
      target.textContent = tex; // 公式语法错误：显示原文
      target.classList.add("math-error");
      el.replaceWith(target);
    }
  });
  return rendered;
}

/** Mermaid 增强懒加载：动态 import（约 1MB，仅文档含图表时加载） */
async function enhanceMermaid(root: ParentNode): Promise<boolean> {
  const blocks = [...root.querySelectorAll<HTMLElement>("code.language-mermaid")];
  if (blocks.length === 0) return false;
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: effectiveDark() ? "dark" : "default",
    securityLevel: "strict",
  });
  for (const block of blocks) {
    const source = block.textContent ?? "";
    try {
      const { svg } = await mermaid.render(`mdviewer-mmd-${seq++}`, source);
      const holder = document.createElement("div");
      holder.className = "mermaid-figure";
      holder.innerHTML = svg;
      // 代码块外层是 <pre>：整体替换，保留 pre 的 data-sourcepos 不影响大纲
      const pre = block.closest("pre");
      if (pre) pre.replaceWith(holder);
      else block.replaceWith(holder);
    } catch (err) {
      const fallback = document.createElement("pre");
      fallback.className = "mermaid-error";
      fallback.textContent = `图表渲染失败：${err}\n\n${source}`;
      const pre = block.closest("pre");
      if (pre) pre.replaceWith(fallback);
      else block.replaceWith(fallback);
    }
  }
  return true;
}

/** 就地增强一个已插入文档的容器（预览区）。返回是否含 KaTeX 输出。 */
export async function enhancePreview(root: HTMLElement): Promise<boolean> {
  const rendered = enhanceMath(root);
  await enhanceMermaid(root);
  return rendered;
}

/** 增强一段 body HTML 字符串（导出用），返回处理后的 HTML 与是否含公式。 */
export async function enhanceBodyHtml(
  html: string,
): Promise<{ html: string; hasMath: boolean }> {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const body = doc.body;
  const rendered = enhanceMath(body);
  await enhanceMermaid(body);
  return { html: body.innerHTML, hasMath: rendered };
}

/** 导出 HTML 的 KaTeX 样式来源（字体无法内嵌，走 CDN；离线时公式降级显示） */
export const KATEX_CDN_CSS =
  "https://cdn.jsdelivr.net/npm/katex@0.18.7/dist/katex.min.css";
