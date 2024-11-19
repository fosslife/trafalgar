import {
  DirEntry,
  copyFile,
  mkdir,
  exists,
  remove,
  rename,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { stat } from "@tauri-apps/plugin-fs";
// import { BaseDirectory, copyFile, createDir, exists } from "@tauri-apps/api/fs";
import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager";
import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";

export interface FileItem extends DirEntry {
  size: string;
  type: string;
  modified: string;
  created: string;
}

export async function renameItem(
  path: string,
  oldName: string,
  newName: string,
): Promise<boolean> {
  try {
    const oldPath = await join(path, oldName);
    const newPath = await join(path, newName);
    await rename(oldPath, newPath);
    return true;
  } catch (error) {
    console.error("Rename failed:", error);
    return false;
  }
}

export function isValidFileName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Name cannot be empty" };
  }

  if (name.length > 255) {
    return { valid: false, error: "Name is too long" };
  }

  // Check for invalid characters
  // Instead of using hex codes directly, we can use their Unicode equivalents
  const invalidChars = /[<>:"/\\|?*\0]/g;
  if (invalidChars.test(name)) {
    return { valid: false, error: "Name contains invalid characters" };
  }

  return { valid: true };
}

export async function createNewFile(
  path: string,
  name: string,
): Promise<boolean> {
  try {
    const fullPath = `${path}/${name}`.replace(/\/+/g, "/");

    // Check if file already exists
    const exist = await exists(fullPath);
    if (exist) {
      throw new Error("A file with this name already exists");
    }

    // Create empty file
    await writeTextFile(fullPath, "");
    return true;
  } catch (error) {
    console.error("Error creating file:", error);
    throw error;
  }
}

export async function createNewFolder(
  path: string,
  name: string,
): Promise<boolean> {
  try {
    const fullPath = `${path}/${name}`.replace(/\/+/g, "/");

    // Check if folder already exists
    const exist = await exists(fullPath);
    if (exist) {
      throw new Error("A folder with this name already exists");
    }

    // Create directory
    await mkdir(fullPath);
    return true;
  } catch (error) {
    console.error("Error creating folder:", error);
    throw error;
  }
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
  path: string,
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
  } catch {
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
  currentPath: string,
): Promise<FileItem[]> {
  try {
    const transformedEntries = await Promise.all(
      entries.map((entry) => transformEntryToFileItem(entry, currentPath)),
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

interface ClipboardData {
  action: "copy" | "cut";
  files: Array<{
    name: string;
    path: string;
    isDirectory: boolean;
  }>;
}

// Store clipboard data in memory (since system clipboard can only store text)
let clipboardCache: ClipboardData | null = null;

export async function copyToClipboard(files: FileItem[], sourcePath: string) {
  const fileData: ClipboardData = {
    action: "copy",
    files: files.map((file) => ({
      name: file.name,
      path: `${sourcePath}/${file.name}`,
      isDirectory: file.isDirectory,
    })),
  };

  // Store in memory
  clipboardCache = fileData;

  // Store serialized data in system clipboard as fallback
  await writeText(JSON.stringify(fileData));

  return fileData.files.length;
}

export async function cutToClipboard(files: FileItem[], sourcePath: string) {
  const fileData: ClipboardData = {
    action: "cut",
    files: files.map((file) => ({
      name: file.name,
      path: `${sourcePath}/${file.name}`,
      isDirectory: file.isDirectory,
    })),
  };

  clipboardCache = fileData;
  await writeText(JSON.stringify(fileData));

  return fileData.files.length;
}

export async function pasteFromClipboard(targetPath: string): Promise<boolean> {
  try {
    // Try to get data from memory first
    let clipboardData = clipboardCache;
    console.log("clipboardData", clipboardData);

    if (!clipboardData) {
      // Fallback to system clipboard
      const clipboardText = await readText();
      if (clipboardText) {
        try {
          clipboardData = JSON.parse(clipboardText) as ClipboardData;
        } catch {
          console.error("Invalid clipboard data");
          return false;
        }
      }
    }

    if (!clipboardData) return false;

    // Process each file
    for (const file of clipboardData.files) {
      const targetFilePath = `${targetPath}/${file.name}`;
      console.log("targetFilePath", targetFilePath);

      // Check if target already exists
      if (await exists(targetFilePath)) {
        // TODO: Handle name conflicts (maybe add number suffix)
        continue;
      }

      // Copy the file
      await copyFile(file.path, targetFilePath);

      // If this was a cut operation, delete the original after successful copy
      if (clipboardData.action === "cut") {
        await remove(file.path);
      }
    }

    // Clear clipboard after cut operation
    if (clipboardData.action === "cut") {
      clipboardCache = null;
      await writeText("");
    }

    return true;
  } catch (error) {
    console.error("Paste operation failed:", error);
    return false;
  }
}

export async function deleteFiles(
  files: FileItem[],
  basePath: string,
): Promise<boolean> {
  try {
    for (const file of files) {
      // if (file.isDirectory) {
      //   await removeDir(file.path, { recursive: true });
      // } else {
      //   await removeFile(file.path);
      // }
      console.log("file", file);
      await remove(`${basePath}/${file.name}`, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error("Delete operation failed:", error);
    return false;
  }
}

export async function moveToTrash(
  files: FileItem[],
  basePath: string,
): Promise<boolean> {
  try {
    // We'll need to implement this in Rust
    await invoke("move_to_trash", {
      paths: files.map((file) => `${basePath}/${file.name}`),
    });
    return true;
  } catch (error) {
    console.error("Move to trash failed:", error);
    return false;
  }
}
