use trash;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![move_to_trash])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn move_to_trash(paths: Vec<String>) -> Result<(), String> {
    for path in paths {
        trash::delete(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
