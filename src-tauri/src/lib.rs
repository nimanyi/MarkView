use comrak::{markdown_to_html, Options};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![parse_markdown])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
