import { DirEntry } from "@tauri-apps/plugin-fs";
import { stat } from "@tauri-apps/plugin-fs";

export interface FileItem extends DirEntry {
  size: string;
  type: string;
  modified: string;
  created: string;
}

// Format file size to human readable format
function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Format date to locale string
function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get file type from name
function getFileType(entry: DirEntry): string {
  if (entry.isDirectory) return "Folder";
  const extension = entry.name.split(".").pop()?.toUpperCase() || "";
  return extension ? `${extension} File` : "File";
}

// Transform DirEntry to FileItem
export async function transformEntryToFileItem(
  entry: DirEntry,
  path: string
): Promise<FileItem> {
  try {
    const fullPath = `${path}/${entry.name}`;
    const meta = await stat(fullPath);

    return {
      ...entry,
      size: entry.isDirectory ? "--" : formatSize(meta.size || 0),
      type: getFileType(entry),
      modified: formatDate(new Date(meta.mtime || Date.now())),
      created: formatDate(new Date(meta.birthtime || Date.now())),
    };
  } catch (error) {
    // Fallback values if metadata fails
    return {
      ...entry,
      size: "--",
      type: getFileType(entry),
      modified: "--",
      created: "--",
    };
  }
}

// Transform all entries in a directory
export async function transformEntries(
  entries: DirEntry[],
  currentPath: string
): Promise<FileItem[]> {
  try {
    const transformedEntries = await Promise.all(
      entries.map((entry) => transformEntryToFileItem(entry, currentPath))
    );

    // Sort directories first, then files alphabetically
    return transformedEntries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error transforming entries:", error);
    return [];
  }
}
