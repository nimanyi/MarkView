import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

/** 文件对话框过滤器：Markdown 常见扩展名 */
const MD_FILTERS = [
  { name: "Markdown", extensions: ["md", "markdown", "mdx", "txt"] },
];

/** 弹出系统"打开文件"对话框，返回所选路径（取消返回 null） */
export async function pickOpenPath(): Promise<string | null> {
  const selected = await open({ multiple: false, filters: MD_FILTERS });
  return typeof selected === "string" ? selected : null;
}

/** 弹出系统"保存文件"对话框，返回目标路径（取消返回 null） */
export async function pickSavePath(defaultPath?: string): Promise<string | null> {
  const path = await save({ filters: MD_FILTERS, defaultPath });
  return path ?? null;
}

/** 调用 Rust 端命令读取 UTF-8 文本文件 */
export function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

/** 调用 Rust 端命令写入文本文件（覆盖） */
export function writeTextFile(path: string, contents: string): Promise<void> {
  return invoke<void>("write_file", { path, contents });
}

/** 从路径提取显示用文件名（兼容 / 与 \ 分隔符） */
export function baseName(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i >= 0 ? path.slice(i + 1) : path;
}
