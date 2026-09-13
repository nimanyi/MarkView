import { invoke } from "@tauri-apps/api/core";

const editor = document.querySelector<HTMLTextAreaElement>("#editor")!;
const preview = document.querySelector<HTMLElement>("#preview")!;

/** 阶段 0 示例文档：验证 comrak 的 GFM 能力 */
const SAMPLE = `# MDViewer 脚手架

> 这一页由 **Rust 端 comrak** 解析后经 IPC 送回前端渲染 —— 跨语言链路已打通。

## GFM 特性一览

| 特性 | 状态 |
| --- | --- |
| 表格 | 支持 |
| 任务列表 | 支持 |
| 删除线 | 支持 |
| 自动链接 | 支持 |

## 开发路线

- [x] Tauri 2 项目骨架
- [x] comrak 解析命令
- [ ] CodeMirror 6 编辑器（阶段 1）
- [ ] 文件打开 / 保存（阶段 1）
- [ ] HTML / PDF 导出（阶段 2）

## 代码块

\`\`\`rust
#[tauri::command]
fn parse_markdown(source: String) -> String {
    comrak::markdown_to_html(&source, &comrak::Options::default())
}
\`\`\`

行内代码：\`invoke("parse_markdown", { source })\`。

~~Electron 方案~~ Tauri 方案：更小的体积、Rust 后端。

自动链接：https://tauri.app
`;

editor.value = SAMPLE;

let timer: number | undefined;

/** 调用 Rust 命令解析 Markdown，写入预览区 */
async function renderPreview(): Promise<void> {
  const html = await invoke<string>("parse_markdown", { source: editor.value });
  preview.innerHTML = html;
}

editor.addEventListener("input", () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void renderPreview(), 150);
});

void renderPreview();
