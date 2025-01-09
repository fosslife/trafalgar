use serde::Serialize;
use std::path::PathBuf;
use tauri::ipc::Channel;
use tokio::fs;
use walkdir::WalkDir;

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
    },
}

#[tauri::command]
pub async fn search_files(
    path: PathBuf,
    query: String,
    search_id: u32,
    on_event: Channel<SearchEvent>,
) -> Result<(), String> {
    on_event
        .send(SearchEvent::Started {
            query: query.clone(),
            search_id,
        })
        .unwrap();

    let mut total_matches = 0;
    let query = query.to_lowercase();

    // First search current directory (fast results)
    let mut entries = fs::read_dir(&path).await.unwrap();
    while let Ok(Some(entry)) = entries.next_entry().await {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.to_lowercase().contains(&query) {
            let metadata = entry.metadata().await.unwrap();
            on_event
                .send(SearchEvent::Result {
                    search_id,
                    path: entry.path().to_string_lossy().to_string(),
                    name,
                    is_file: metadata.is_file(),
                    size: metadata.len(),
                    modified: metadata
                        .modified()
                        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs())
                        .unwrap_or(0),
                })
                .unwrap();
            total_matches += 1;
        }
    }

    // Then start recursive search
    for entry in WalkDir::new(path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.to_lowercase().contains(&query) {
            let metadata = entry.metadata().unwrap();
            on_event
                .send(SearchEvent::Result {
                    search_id,
                    path: entry.path().to_string_lossy().to_string(),
                    name,
                    is_file: metadata.is_file(),
                    size: metadata.len(),
                    modified: metadata
                        .modified()
                        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs())
                        .unwrap_or(0),
                })
                .unwrap();
            total_matches += 1;
        }
    }

    on_event
        .send(SearchEvent::Finished {
            search_id,
            total_matches,
        })
        .unwrap();

    Ok(())
}
