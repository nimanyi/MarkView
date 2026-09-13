/**
 * 快捷键注册表：集中声明（键 + 修饰 + 动作名 + 处理函数），
 * 统一由单个 keydown 监听分发，便于查阅与后续扩展为可配置。
 * 修饰键：Ctrl（macOS 为 Cmd）；shift / alt 为可选附加项。
 */

export interface Shortcut {
  /** 主键（小写字母） */
  key: string;
  shift?: boolean;
  alt?: boolean;
  /** 动作名（用于按钮 title 等显示） */
  label: string;
  run(): void;
}

/** 安装全局快捷键表 */
export function installShortcuts(shortcuts: Shortcut[]): void {
  window.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    for (const s of shortcuts) {
      if (e.key.toLowerCase() !== s.key) continue;
      if (!!e.shiftKey !== !!s.shift) continue;
      if (!!e.altKey !== !!s.alt) continue;
      e.preventDefault();
      s.run();
      return;
    }
  });
}

/** 快捷键的显示文本（用于 title 属性与文档） */
export function shortcutHint(s: Shortcut): string {
  const parts = ["Ctrl"];
  if (s.shift) parts.push("Shift");
  if (s.alt) parts.push("Alt");
  parts.push(s.key.toUpperCase());
  return `${parts.join("+")} ${s.label}`;
}
