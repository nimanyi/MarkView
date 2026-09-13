# MDViewer

跨平台 Markdown 编辑器 / 查看器，支持 Windows · macOS · Linux。

技术栈：**Tauri 2 + Rust（comrak）+ Vite + TypeScript**

> 当前为阶段 2：在阶段 1 编辑 / 预览的基础上新增导出——
> HTML 为自包含文档（内嵌样式、正文与预览同源 comrak 渲染），
> PDF 走 WebView 打印通道（`Ctrl+P`，在系统打印对话框选择"另存为 PDF"）。

## 环境要求

- Node.js >= 20（含 npm）
- Rust（推荐 [rustup](https://rustup.rs) 安装）
- 平台依赖：
  - **Windows**：推荐 Visual Studio Build Tools（含 "使用 C++ 的桌面开发" 工作负载，即 MSVC 工具链）；
    本机无 MSVC、无管理员权限，改用 GNU 方案（已配置完毕）：
    1. rustup GNU 工具链：`rustup toolchain install stable-x86_64-pc-windows-gnu --profile minimal`，
       并 `rustup override set` 仅对本目录生效
    2. `~/.cargo/mingw64`：从 MSYS2 仓库提取的 gcc 16 / binutils / mingw-w64 头文件与 CRT
       （真 gcc + ld + as + windres），其 `bin` 已加入用户 PATH
    3. 工具链 `bin/self-contained` 目录内已放入 `as.exe`（dlltool 生成 raw-dylib 导入库时需要）
       及其依赖 DLL（libintl-8 / libiconv-2 / zlib1 / libzstd / libgcc_s_seh）
    4. `src-tauri/.cargo/config.toml`（不入库）指定 linker / dlltool / link-self-contained，见该文件注释
    5. 注意：`rustup update` 会重置 self-contained 目录，需重新放入第 3 步的文件
  - **macOS**：Xcode Command Line Tools（`xcode-select --install`）
  - **Linux**：`libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf`

## 开发

```bash
npm install        # 安装前端依赖
npm run tauri dev  # 开发模式（热重载）
```

> 注意：直接运行 `cargo` 命令时需在 `src-tauri/` 目录下执行——
> linker / dlltool 等配置位于 `src-tauri/.cargo/config.toml`，cargo 从工作目录向上查找该文件，
> 在项目根目录用 `--manifest-path` 跑会绕过配置导致链接失败。

## 构建发布包

```bash
npm run tauri build
```

产物位于 `src-tauri/target/release/bundle/`（Windows 为 NSIS 安装包 + MSI）。

## 目录结构

```
mdviewer/
├─ index.html               # 前端入口（工具栏 / 双栏 / 状态栏 / 未保存对话框）
├─ src/                     # 前端源码（TypeScript）
│  ├─ main.ts               # 装配：状态管理、快捷键、标题联动、关闭拦截
│  ├─ editor.ts             # CodeMirror 6 封装（主题切换、光标/文档事件）
│  ├─ files.ts              # 文件对话框 + read_file / write_file 命令调用
│  ├─ exporter.ts           # 导出：自包含 HTML 组装 / iframe 打印（PDF）
│  └─ styles.css
├─ src-tauri/               # Rust 核心
│  ├─ src/
│  │  ├─ main.rs            # 入口
│  │  └─ lib.rs             # Tauri 命令（parse_markdown / read_file / write_file）
│  ├─ capabilities/         # 权限声明（对话框 + 窗口标题）
│  ├─ icons/                # 应用图标（tauri icon 生成）
│  ├─ tauri.conf.json       # Tauri 配置
│  └─ Cargo.toml
├─ .github/workflows/       # 三平台 CI
└─ app-icon.png             # 图标源文件（1024x1024）
```

## 路线图

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| 0 | 脚手架 + CI + IPC 链路验证 | ✅ |
| 1 | CodeMirror 6 编辑器、文件打开/保存、实时预览 | ✅ |
| 2 | HTML / PDF 导出 | ✅ 当前 |
| 3 | 同步滚动、文件树、主题、快捷键 | ⬜ |
| 4 | 公式 / Mermaid、大纲、全文搜索 | ⬜ |
| 5 | 三平台安装包、自动更新 | ⬜ |
