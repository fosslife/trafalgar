import prettyBytes from "pretty-bytes";
import { format, isToday, differenceInDays } from "date-fns";
import { DriveInfo } from "../components/HomeView";
import { DirEntry } from "@tauri-apps/plugin-fs";

export function formatFileSize(bytes: number): string {
  return prettyBytes(bytes);
}

export function formatDate(date: Date): string {
  const now = new Date();
  const daysDifference = differenceInDays(now, date);

  // Today: show time only
  if (isToday(date)) {
    return format(date, "HH:mm");
  }

  // Within last 7 days: show day of week
  if (daysDifference < 7) {
    return format(date, "EEE HH:mm");
  }

  // This year: show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "MMM d");
  }

  // Different year: show full date
  return format(date, "MMM d, yyyy");
}

export function filterDrives(drives: DriveInfo[]): DriveInfo[] {
  const unwantedFileSystems = [
    "fuse.snapfuse",
    "overlay",
    "tmpfs",
    "fuse.portal",
    "9p",
  ];
  return drives.filter(
    (drive) => !unwantedFileSystems.includes(drive.fileSystem)
  );
}

export function filterSystemFiles(files: DirEntry[]): DirEntry[] {
  const unwantedFilesNames = [
    // windows
    "$RECYCLE.BIN",
    "System Volume Information",
    "pagefile.sys",
    "hiberfil.sys",
    "swapfile.sys",
    "DumpStack.log.tmp",
    // macos
    ".DS_Store",
    ".AppleDouble",
    ".AppleDouble.plist",
    // linux
    ".Trash",
  ];
  return files.filter((file) => !unwantedFilesNames.includes(file.name));
}
