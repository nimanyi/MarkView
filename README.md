# MDViewer

跨平台 Markdown 编辑器 / 查看器，支持 Windows · macOS · Linux。

技术栈：**Tauri 2 + Rust（comrak）+ Vite + TypeScript**

> 阶段 5（最终阶段）：安装包与自动更新——
> 三平台安装包（Windows NSIS / macOS dmg / Linux deb + AppImage）、
> minisign 签名的自动更新（状态栏一键检查、下载进度、安装重启）、
> tag 触发的 CI 发布流水线（自动生成 latest.json 更新清单）。
> 完整快捷键见应用内欢迎文档。

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
    6. 工具链坑（已修复）：MSYS2 包 `libwinpthread-git` 12.0.0.r747 提供的 `libwinpthread-1.dll`
       才导出 `clock_gettime64`；若 `bin\` 内是旧版 DLL，gcc 的 `-E` 预处理路径（windres 编
       resource.rc 时触发）会以 0xC0000139（入口点未找到）静默失败。新版 DLL 需同时放入
       `bin\` 与 `lib\gcc\x86_64-w64-mingw32\16.2.0\`（应用目录优先级高于 PATH）
    7. 工具链坑（已修复）：`webview2-com-sys` 0.38 在 **MSVC** 下链接静态库 `WebView2LoaderStatic.lib`，
       而在 **GNU** 下链接动态导入库——安装后运行时必须能在 exe 旁找到 `WebView2Loader.dll`，
       否则报"找不到 webviewloader.dll"。已在 `tauri.conf.json > bundle.resources`
       将 `src-tauri/bin/WebView2Loader.dll` 打进安装包（安装到 exe 同目录）；
       直接运行 `target/release|debug/mdviewer.exe` 时需手动复制该 DLL 到 exe 旁
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
# Windows（PowerShell）：需注入签名私钥，updater 工件（.sig）才会生成
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content .tauri/mdviewer.key -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ''
npm run tauri build
```

产物位于 `src-tauri/target/release/bundle/`：

| 平台 | 产物 |
| --- | --- |
| Windows | `nsis/*.exe` 安装包（含 `WebView2Loader.dll`）+ `nsis/*.exe.sig` 签名（updater 工件） |
| macOS | `dmg/*.dmg` + `.app.tar.gz.sig` |
| Linux | `deb/*.deb`、`appimage/*.AppImage` + `.sig` |

## 自动更新

- **原理**：应用内「检查更新」（状态栏按钮或 Ctrl+Shift+U）调用 updater 插件，
  请求 `tauri.conf.json > plugins.updater.endpoints` 指向的 `latest.json` 清单；
  版本更新时下载安装包，用配置内 **公钥** 校验 `.sig` 签名后静默安装并重启。
- **启用前必须修改**：`tauri.conf.json` 中 updater endpoint 的 `owner/repo`
  （当前为占位值 `mdviewer/mdviewer`），换成你实际的 GitHub 仓库；
  CI 发布后旧版本即可收到更新推送。
- **CI 发布**：推送 `v*` 标签触发 release job（tauri-action）——
  需在仓库 Settings → Secrets 配置 `TAURI_SIGNING_PRIVATE_KEY`（`.tauri/mdviewer.key` 文件内容）
  与 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（本仓库密钥无密码，设为空串）；
  构建产物为 draft Release，确认后发布。
- **私钥警示**：`.tauri/mdviewer.key` 是 minisign 私钥（已在 .gitignore，绝不入库）。
  **一旦丢失，老用户将无法升级到新版本**（公钥烧录在已发布的安装包里，无法更换），
  请将私钥离线备份；泄露则任何人可伪造更新包，需立即作废。
- Linux AppImage / macOS dmg 的更新签名同样由 `createUpdaterArtifacts: true` 生成；
  macOS 另需对 dmg 做签名公证（未配置时用户首次打开需右键信任）。

## 目录结构

```
mdviewer/
├─ index.html               # 前端入口（工具栏 / 双栏 / 状态栏 / 未保存对话框）
├─ src/                     # 前端源码（TypeScript）
│  ├─ main.ts               # 装配：状态管理、文件/导出/主题/侧边栏、快捷键表
│  ├─ editor.ts             # CodeMirror 6 封装（主题切换、光标/文档事件）
│  ├─ format.ts             # 排版命令（加粗/斜体/标题/引用/列表/表格，toggle 语义）
│  ├─ toolbar.ts            # 编辑区排版工具栏（按钮与快捷键同源、显隐持久化）
│  ├─ files.ts              # 文件对话框 + read_file / write_file 命令调用
│  ├─ exporter.ts           # 导出：自包含 HTML 组装 / iframe 打印（PDF）
│  ├─ sidebar.ts            # 文件树侧边栏（懒加载展开、当前文件高亮）
│  ├─ splitter.ts           # 编辑/预览分栏拖拽（比例持久化、双击复位）
│  ├─ enhance.ts            # 预览/导出共用增强：KaTeX 公式 + Mermaid 图表
│  ├─ outline.ts            # 大纲提取（跳过围栏）与点击跳转定位
│  ├─ theme.ts              # 三态主题管理（跟随系统 / 浅色 / 深色）
│  ├─ scroll.ts             # 编辑器与预览双向同步滚动
│  ├─ shortcut.ts           # 快捷键注册表（表驱动）
│  ├─ updater.ts            # 自动更新：检查 / 下载进度 / 安装重启
│  └─ styles.css
├─ src-tauri/               # Rust 核心
│  ├─ src/
│  │  ├─ main.rs            # 入口
│  │  └─ lib.rs             # Tauri 命令（parse_markdown / read_file / write_file / list_dir / search_in_dir）
│  ├─ capabilities/         # 权限声明（对话框 + updater + process）
│  ├─ icons/                # 应用图标（tauri icon 生成）
│  ├─ bin/                  # WebView2Loader.dll（GNU 工具链运行时依赖，随包分发）
│  ├─ tauri.conf.json       # Tauri 配置（bundle 元数据 + updater 公钥）
│  └─ Cargo.toml
├─ .github/workflows/       # CI：main 分支构建 + tag 发布（latest.json）
├─ .tauri/                  # updater 签名密钥对（.gitignore，绝不入库）
└─ app-icon.png             # 图标源文件（1024x1024）
```

## 路线图

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| 0 | 脚手架 + CI + IPC 链路验证 | ✅ |
| 1 | CodeMirror 6 编辑器、文件打开/保存、实时预览 | ✅ |
| 2 | HTML / PDF 导出 | ✅ |
| 3 | 同步滚动、文件树、主题、快捷键 | ✅ |
| 4 | 公式 / Mermaid、大纲、全文搜索 | ✅ |
| 5 | 三平台安装包、自动更新 | ✅ 当前 |

> 路线图外增量：编辑 / 预览中缝可拖动调宽（比例持久化，双击复位）；
> 编辑器内排版快捷键 Ctrl+B/I/E/Shift+X/K、Ctrl+1~6（toggle 语义，见应用内欢迎文档）；
> 编辑区顶部排版工具栏：按钮与快捷键同源、随光标高亮当前格式，Alt+T 或右上角按钮收起 / 展开（状态持久化）。
