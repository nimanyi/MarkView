use comrak::{markdown_to_html, Options};

/// 目录条目：名称 / 完整路径 / 是否目录（供前端文件树渲染）。
#[derive(serde::Serialize)]
struct DirEntryInfo {
    name: String,
    path: String,
    is_dir: bool,
}

/// 列出目录的直接子项。
/// 跳过隐藏条目（点开头）；目录在前、同级按名称不区分大小写排序。
#[tauri::command]
fn list_dir(path: String) -> Result<Vec<DirEntryInfo>, String> {
    let rd = std::fs::read_dir(&path).map_err(|e| format!("读取目录失败：{e}"))?;
    let mut entries: Vec<DirEntryInfo> = Vec::new();
    for item in rd.flatten() {
        let name = item.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let is_dir = item.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let full = item.path().to_string_lossy().into_owned();
        entries.push(DirEntryInfo { name, path: full, is_dir });
    }
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

/// 解析 Markdown 为 HTML。
/// 开启 GFM 扩展（表格 / 任务列表 / 删除线 / 自动链接 / 数学公式），
/// 允许内嵌 HTML（本地文档场景，后续可按需收紧）。
/// 输出 sourcepos（data-sourcepos）供前端大纲跳转定位。
#[tauri::command]
fn parse_markdown(source: String) -> String {
    let mut options = Options::default();
    options.extension.strikethrough = true;
    options.extension.table = true;
    options.extension.autolink = true;
    options.extension.tasklist = true;
    // 数学公式两种语法：$…$ / $$…$$（math_dollars）与 $`…`$ / ```math（math_code）
    options.extension.math_dollars = true;
    options.extension.math_code = true;
    options.render.r#unsafe = true;
    options.render.sourcepos = true;
    markdown_to_html(&source, &options)
}

/// 读取 UTF-8 文本文件（当前假定 Markdown 文档为 UTF-8 编码）。
/// 路径来自系统文件对话框，由用户主动选择，不额外做目录限制。
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("读取失败：{e}"))
}

/// 将文本写入文件（覆盖写入；保存路径来自系统保存对话框）。
#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| format!("写入失败：{e}"))
}

/// 跨文件搜索命中：文件路径 / 行号（1 起）/ 该行内容（去除首尾空白）。
#[derive(serde::Serialize)]
struct SearchHit {
    path: String,
    line_no: usize,
    line_text: String,
}

/// 忽略的目录名（常见非文档目录）
const SKIP_DIRS: [&str; 5] = [".git", "node_modules", "target", "dist", ".venv"];

/// 搜索的文本扩展名
const SEARCH_EXT: [&str; 4] = ["md", "markdown", "mdx", "txt"];

/// 在根目录下递归全文搜索（不区分大小写，子串匹配）。
/// 跳过隐藏条目与常见构建目录；最多返回 500 条命中。
#[tauri::command]
fn search_in_dir(root: String, pattern: String) -> Result<Vec<SearchHit>, String> {
    if pattern.trim().is_empty() {
        return Ok(Vec::new());
    }
    let needle = pattern.to_lowercase();
    let mut hits: Vec<SearchHit> = Vec::new();
    let mut stack = vec![std::path::PathBuf::from(&root)];
    while let Some(dir) = stack.pop() {
        let rd = match std::fs::read_dir(&dir) {
            Ok(rd) => rd,
            Err(_) => continue,
        };
        for item in rd.flatten() {
            let name = item.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') || SKIP_DIRS.contains(&name.as_str()) {
                continue;
            }
            let path = item.path();
            if item.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                stack.push(path);
                continue;
            }
            let is_text = path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| SEARCH_EXT.contains(&e.to_lowercase().as_str()))
                .unwrap_or(false);
            if !is_text {
                continue;
            }
            let Ok(content) = std::fs::read_to_string(&path) else {
                continue; // 非 UTF-8 或不可读：跳过
            };
            for (idx, line) in content.lines().enumerate() {
                if line.to_lowercase().contains(&needle) {
                    hits.push(SearchHit {
                        path: path.to_string_lossy().into_owned(),
                        line_no: idx + 1,
                        line_text: line.trim().chars().take(200).collect(),
                    });
                    if hits.len() >= 500 {
                        return Ok(hits);
                    }
                }
            }
        }
    }
    Ok(hits)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 启动闪屏治理：WebView 初始化完成前窗口只显示原生底色，
            // 按系统深浅把它设为应用对应主题的背景色（浅 #f7f7f8 / 深 #171717），
            // 与前端启动占位页、最终界面底色无缝衔接，全程无白屏；
            // 失败（个别平台不支持等）静默忽略，退回 tauri.conf.json 的静态值。
            use tauri::Manager;
            if let Some(win) = app.get_webview_window("main") {
                let dark = matches!(win.theme(), Ok(tauri::Theme::Dark));
                let rgb = if dark { (23, 23, 23) } else { (247, 247, 248) };
                let _ = win.set_background_color(Some(tauri::window::Color::from(rgb)));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            parse_markdown,
            read_file,
            write_file,
            list_dir,
            search_in_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
