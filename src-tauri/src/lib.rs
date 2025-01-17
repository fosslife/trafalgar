mod pty;

use pty::PtyManager;
use serde::Serialize;
use std::path::PathBuf;
use sysinfo::{DiskKind, Disks};
use tauri::ipc::Channel;
use walkdir::WalkDir;

// Add a constant for max results per batch
const MAX_RESULTS_PER_BATCH: usize = 20;
const MAX_TOTAL_RESULTS: usize = 100;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
enum SearchEvent {
    #[serde(rename_all = "camelCase")]
    Started { query: String, search_id: u32 },
    #[serde(rename_all = "camelCase")]
    Result {
        search_id: u32,
        path: String,
        name: String,
        is_file: bool,
        size: u64,
        modified: u64,
    },
    #[serde(rename_all = "camelCase")]
    Finished {
        search_id: u32,
        total_matches: usize,
        has_more: bool,
    },
}

// First, let's create a helper function to clean Windows paths
fn clean_path(path: String) -> String {
    path.replace("\\\\?\\", "") // Remove Windows extended path prefix
        .replace("\\", "/") // Normalize separators
}

#[tauri::command]
async fn search_files(
    path: PathBuf,
    query: String,
    search_id: u32,
    on_event: Channel<SearchEvent>,
) -> Result<(), String> {
    println!("search_files called with query: {}", query);

    let _ = on_event.send(SearchEvent::Started {
        query: query.clone(),
        search_id,
    });

    let mut total_matches = 0;
    let mut sent_results = 0;
    let query = query.to_lowercase();
    let mut results = Vec::new();

    // Use WalkDir for recursive search
    for entry in WalkDir::new(&path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.to_lowercase().contains(&query) {
            if let Ok(metadata) = entry.metadata() {
                total_matches += 1;

                // Store all matches
                results.push((entry.path().to_path_buf(), metadata));

                // Send results in batches
                if results.len() >= MAX_RESULTS_PER_BATCH {
                    for (path, metadata) in results.drain(..MAX_RESULTS_PER_BATCH) {
                        if sent_results >= MAX_TOTAL_RESULTS {
                            break;
                        }

                        let absolute_path = clean_path(
                            path.canonicalize()
                                .unwrap_or(path.to_path_buf())
                                .to_string_lossy()
                                .to_string(),
                        );

                        let name = path
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_default();

                        let _ = on_event.send(SearchEvent::Result {
                            search_id,
                            path: absolute_path,
                            name,
                            is_file: metadata.is_file(),
                            size: metadata.len(),
                            modified: metadata
                                .modified()
                                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs())
                                .unwrap_or(0),
                        });
                        sent_results += 1;
                    }
                }

                if sent_results >= MAX_TOTAL_RESULTS {
                    break;
                }
            }
        }
    }

    // Send remaining results
    for (path, metadata) in results.iter().take(MAX_RESULTS_PER_BATCH) {
        if sent_results >= MAX_TOTAL_RESULTS {
            break;
        }

        let absolute_path = clean_path(
            path.canonicalize()
                .unwrap_or(path.to_path_buf())
                .to_string_lossy()
                .to_string(),
        );

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let _ = on_event.send(SearchEvent::Result {
            search_id,
            path: absolute_path,
            name,
            is_file: metadata.is_file(),
            size: metadata.len(),
            modified: metadata
                .modified()
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs())
                .unwrap_or(0),
        });
        sent_results += 1;
    }

    // Send finished event with has_more flag
    let _ = on_event.send(SearchEvent::Finished {
        search_id,
        total_matches,
        has_more: total_matches > sent_results,
    });

    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DriveInfo {
    name: String,
    path: String,
    drive_type: DriveType,
    total_space: u64,
    available_space: u64,
    is_removable: bool,
    file_system: Option<String>,
    volume_name: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
enum DriveType {
    Fixed,
    Removable,
    Network,
    CdRom,
    Unknown,
}

impl From<(DiskKind, bool)> for DriveType {
    fn from((kind, is_removable): (DiskKind, bool)) -> Self {
        if is_removable {
            DriveType::Removable
        } else {
            match kind {
                DiskKind::HDD | DiskKind::SSD => DriveType::Fixed,
                DiskKind::Unknown(_) => DriveType::Unknown,
            }
        }
    }
}

#[tauri::command]
async fn list_drives() -> Result<Vec<DriveInfo>, String> {
    let drives = Disks::new_with_refreshed_list();

    Ok(drives
        .iter()
        .map(|disk| {
            let path = disk.mount_point().to_string_lossy().into_owned();
            // Extract drive letter with colon for Windows (e.g., "C:\\" -> "C:")
            let name = if path.len() >= 2 && path.chars().nth(1) == Some(':') {
                path.chars().take(2).collect::<String>() // Take first two chars ("C:")
            } else {
                disk.name().to_string_lossy().into_owned()
            };

            DriveInfo {
                name,
                path,
                drive_type: (disk.kind(), disk.is_removable()).into(),
                total_space: disk.total_space(),
                available_space: disk.available_space(),
                is_removable: disk.is_removable(),
                file_system: Some(disk.file_system().to_string_lossy().into_owned()),
                volume_name: {
                    let disk_name = disk.name().to_string_lossy();
                    if disk_name.is_empty() {
                        None
                    } else {
                        Some(disk_name.into_owned())
                    }
                },
            }
        })
        .collect())
}

#[tauri::command]
async fn create_pty(
    window: tauri::Window,
    state: tauri::State<'_, PtyManager>,
    cwd: String,
    rows: u16,
    cols: u16,
) -> Result<String, String> {
    state.create_pty(cwd, rows, cols, window).await
}

#[tauri::command]
async fn write_pty(
    state: tauri::State<'_, PtyManager>,
    pty_id: String,
    data: String,
) -> Result<(), String> {
    state.write_pty(pty_id, data)
}

#[tauri::command]
async fn resize_pty(
    state: tauri::State<'_, PtyManager>,
    pty_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    state.resize_pty(pty_id, rows, cols)
}

#[tauri::command]
async fn destroy_pty(state: tauri::State<'_, PtyManager>, pty_id: String) -> Result<(), String> {
    state.destroy_pty(pty_id);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pty_manager = PtyManager::new();

    tauri::Builder::default()
        .manage(pty_manager)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            search_files,
            list_drives,
            create_pty,
            write_pty,
            resize_pty,
            destroy_pty,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
