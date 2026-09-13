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
/// 开启 GFM 扩展（表格 / 任务列表 / 删除线 / 自动链接），
/// 允许内嵌 HTML（本地文档场景，后续可按需收紧）。
#[tauri::command]
fn parse_markdown(source: String) -> String {
    let mut options = Options::default();
    options.extension.strikethrough = true;
    options.extension.table = true;
    options.extension.autolink = true;
    options.extension.tasklist = true;
    options.render.r#unsafe = true;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            parse_markdown,
            read_file,
            write_file,
            list_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
