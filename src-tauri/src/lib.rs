use bitvec::prelude::*;
use serde::Serialize;
use std::collections::HashSet;
use std::error::Error;
use std::fmt::{Debug, Display, Formatter};
use std::path::PathBuf;
use tauri::ipc::Channel;
use walkdir::WalkDir;
use windows::Win32::{Foundation::GetLastError, Storage::FileSystem::GetLogicalDrives};

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

#[derive(Serialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
enum DriveType {
    Fixed,
    Removable,
    Network,
    CdRom,
    Unknown,
}

#[derive(Debug)]
enum GetLogicalDrivesError {
    TooManyDrivesError,
    ApiError(u32),
}

impl Display for GetLogicalDrivesError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self:?}")
    }
}

impl Error for GetLogicalDrivesError {}

const INVALID_DRIVE_LETTER_BITMASK: u32 = 0b11111100_00000000_00000000_00000000;

fn get_windows_drives() -> Result<HashSet<char>, GetLogicalDrivesError> {
    let drives_bitmap = unsafe { GetLogicalDrives() };

    if drives_bitmap == 0 {
        let _err = unsafe { GetLastError() };
        Err(GetLogicalDrivesError::ApiError(1))
    } else if drives_bitmap & INVALID_DRIVE_LETTER_BITMASK != 0 {
        Err(GetLogicalDrivesError::TooManyDrivesError)
    } else {
        Ok(drives_bitmap
            .view_bits::<Lsb0>()
            .iter()
            .zip('A'..='Z')
            .filter_map(|(bit, drive_letter)| if *bit { Some(drive_letter) } else { None })
            .collect())
    }
}

#[tauri::command]
async fn list_drives() -> Result<Vec<DriveInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::ffi::OsString;
        use std::os::windows::ffi::OsStringExt;
        use windows::core::{PCWSTR, PWSTR};
        use windows::Win32::Storage::FileSystem::{
            GetDiskFreeSpaceExW, GetDriveTypeW, GetVolumeInformationW,
        };
        use windows::Win32::System::WindowsProgramming::{
            DRIVE_CDROM, DRIVE_FIXED, DRIVE_REMOTE, DRIVE_REMOVABLE,
        };

        let drives = get_windows_drives().map_err(|e| e.to_string())?;
        println!("drives: {:?}", drives);
        let mut drive_infos = Vec::new();

        for drive_letter in drives {
            let path = format!("{}:\\", drive_letter);
            let wide_path: Vec<u16> = format!("{}:\\", drive_letter)
                .encode_utf16()
                .chain(Some(0))
                .collect();

            unsafe {
                let drive_type = GetDriveTypeW(PCWSTR::from_raw(wide_path.as_ptr()));

                // Skip inaccessible drives
                if drive_type == 1 {
                    continue;
                }

                let drive_type = match drive_type {
                    DRIVE_FIXED => DriveType::Fixed,
                    DRIVE_REMOVABLE => DriveType::Removable,
                    DRIVE_CDROM => DriveType::CdRom,
                    DRIVE_REMOTE => DriveType::Network,
                    _ => DriveType::Unknown,
                };

                // Get volume information
                let mut volume_name_buffer = [0u16; 256];
                let mut fs_name_buffer = [0u16; 256];
                let mut volume_name = None;
                let mut file_system = None;

                let result = GetVolumeInformationW(
                    PCWSTR::from_raw(wide_path.as_ptr()),
                    Some(&mut volume_name_buffer),
                    None,
                    None,
                    None,
                    Some(&mut fs_name_buffer),
                );

                if result.is_ok() {
                    volume_name = Some(
                        OsString::from_wide(
                            &volume_name_buffer
                                [..volume_name_buffer.iter().position(|&x| x == 0).unwrap_or(0)],
                        )
                        .to_string_lossy()
                        .into_owned(),
                    );
                    file_system = Some(
                        OsString::from_wide(
                            &fs_name_buffer
                                [..fs_name_buffer.iter().position(|&x| x == 0).unwrap_or(0)],
                        )
                        .to_string_lossy()
                        .into_owned(),
                    );
                }

                // Get space information
                let mut total_bytes = 0u64;
                let mut free_bytes = 0u64;
                let mut available_bytes = 0u64;

                let result = GetDiskFreeSpaceExW(
                    PCWSTR::from_raw(wide_path.as_ptr()),
                    Some(&mut available_bytes),
                    Some(&mut total_bytes),
                    Some(&mut free_bytes),
                );

                if result.is_ok() {
                    drive_infos.push(DriveInfo {
                        name: format!("{}:", drive_letter),
                        path,
                        is_removable: matches!(drive_type, DriveType::Removable),
                        drive_type,
                        total_space: total_bytes,
                        available_space: available_bytes,
                        file_system,
                        volume_name,
                    });
                }
            }
        }

        Ok(drive_infos)
    }

    #[cfg(not(target_os = "windows"))]
    {
        use sysinfo::{DiskExt, System, SystemExt};
        let sys = System::new_all();
        Ok(sys
            .disks()
            .iter()
            .map(|disk| DriveInfo {
                name: disk.name().to_string_lossy().into_owned(),
                path: disk.mount_point().to_string_lossy().into_owned(),
                drive_type: if disk.is_removable() {
                    DriveType::Removable
                } else {
                    DriveType::Fixed
                },
                total_space: disk.total_space(),
                available_space: disk.available_space(),
                is_removable: disk.is_removable(),
                file_system: Some(disk.file_system().to_string_lossy().into_owned()),
                volume_name: None,
            })
            .collect())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![search_files, list_drives])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
