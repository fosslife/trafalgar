use serde::Serialize;
use std::path::Path;
use std::path::PathBuf;
use tauri::ipc::Channel;
use tokio::fs;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![search_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
