import { defineConfig } from "vite";

// Tauri 约定：固定端口 + 不清屏 + 忽略 Rust 目录的变更
export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
