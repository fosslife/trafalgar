import { motion, AnimatePresence } from "motion/react";
import {
  readDir,
  DirEntry,
  remove,
  rename,
  copyFile,
  mkdir,
  writeFile,
} from "@tauri-apps/plugin-fs";
import { useEffect, useState, useRef } from "react";
import {
  Folder,
  File,
  List,
  SquaresFour,
  Copy,
  Scissors,
  PencilSimple,
  Trash,
  Clipboard,
} from "@phosphor-icons/react";
import { join } from "@tauri-apps/api/path";
import { useContextMenu } from "../contexts/ContextMenuContext";
import { ContextMenu } from "./ContextMenu";
import { Notification } from "./Notification";

type ViewMode = "grid" | "list";

interface FileGridProps {
  path: string;
  onNavigate: (path: string) => void;
  selectedFiles: Set<string>;
  onSelectedFilesChange: (files: Set<string>) => void;
  viewMode: ViewMode;
  sortKey: "name" | "type";
}

interface ClipboardItem {
  type: "copy" | "cut";
  files: string[];
  sourcePath: string;
}

export function FileGrid({
  path,
  onNavigate,
  selectedFiles,
  onSelectedFilesChange,
  viewMode,
  sortKey,
}: FileGridProps) {
  const [files, setFiles] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clipboardFiles, setClipboardFiles] = useState<ClipboardItem | null>(
    null
  );
  const { openMenu } = useContextMenu();
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{
    status: "success" | "error" | "info" | "warning";
    title: string;
    message: string;
  } | null>(null);

  // Add effect to resort files when sortKey changes
  useEffect(() => {
    if (files.length > 0) {
      setFiles(sortFiles(files, sortKey));
    }
  }, [sortKey]);

  useEffect(() => {
    loadFiles();
    onSelectedFilesChange(new Set()); // Clear selection when path changes
  }, [path]);

  useEffect(() => {
    if (renamingFile && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingFile]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const entries = await readDir(path);
      const sortedEntries = sortFiles(entries, sortKey);
      setFiles(sortedEntries);
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  };

  const sortFiles = (files: DirEntry[], key: "name" | "type") => {
    return [...files].sort((a, b) => {
      if (key === "type") {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const handleContainerClick = (event: React.MouseEvent) => {
    // Only deselect if clicking directly on the container (not its children)
    if (event.target === event.currentTarget) {
      onSelectedFilesChange(new Set());
    }
  };

  const handleItemClick = (file: DirEntry, event: React.MouseEvent) => {
    // Prevent click from bubbling up to container
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      const newSelection = new Set(selectedFiles);
      if (selectedFiles.has(file.name)) {
        newSelection.delete(file.name);
      } else {
        newSelection.add(file.name);
      }
      onSelectedFilesChange(newSelection);
    } else if (event.shiftKey && files.length > 0) {
      // Range select with Shift
      const lastSelected = Array.from(selectedFiles).pop();
      if (lastSelected) {
        const start = files.findIndex((f) => f.name === lastSelected);
        const end = files.findIndex((f) => f.name === file.name);
        const range = files.slice(
          Math.min(start, end),
          Math.max(start, end) + 1
        );
        onSelectedFilesChange(new Set(range.map((f) => f.name)));
      } else {
        onSelectedFilesChange(new Set([file.name]));
      }
    } else {
      // Single select
      onSelectedFilesChange(new Set([file.name]));
    }
  };

  const handleDoubleClick = (file: DirEntry) => {
    if (file.isDirectory) {
      onNavigate(file.name);
    }
  };

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const hasSelection = selectedFiles.size > 0;
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key === "a") {
        // Select all
        e.preventDefault();
        onSelectedFilesChange(new Set(files.map((f) => f.name)));
      } else if (e.key === "Escape") {
        // Clear selection
        e.preventDefault();
        onSelectedFilesChange(new Set());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [files, selectedFiles]);

  const handleContextMenu = (event: React.MouseEvent, file?: DirEntry) => {
    event.preventDefault();
    event.stopPropagation();

    // Check if we clicked on a file item or its children
    const fileItem = (event.target as HTMLElement).closest("[data-file-item]");

    if (fileItem && file) {
      // Right-clicked on a file
      if (!selectedFiles.has(file.name)) {
        onSelectedFilesChange(new Set([file.name]));
      }
      openMenu({ x: event.clientX, y: event.clientY }, "selection", file.name);
    } else {
      // Right-clicked on empty space
      onSelectedFilesChange(new Set());
      openMenu({ x: event.clientX, y: event.clientY }, "default");
    }
  };

  const handleNewFolder = async () => {
    try {
      const baseName = "New Folder";
      let name = baseName;
      let counter = 1;

      while (files.some((f) => f.name === name)) {
        name = `${baseName} (${counter})`;
        counter++;
      }

      const newFolderPath = await join(path, name);
      await mkdir(newFolderPath);
      await loadFiles();

      // Trigger rename operation
      setRenamingFile(name);
      setRenameValue(name);
    } catch (error) {
      console.error("Error creating folder:", error);
      showNotification(
        "error",
        "Creation Error",
        "Failed to create new folder."
      );
    }
  };

  const handleNewFile = async () => {
    try {
      const baseName = "New File";
      let name = baseName;
      let counter = 1;

      while (files.some((f) => f.name === name)) {
        name = `${baseName} (${counter})`;
        counter++;
      }

      const newFilePath = await join(path, name);
      await writeFile(newFilePath, new Uint8Array());
      await loadFiles();

      // Trigger rename operation
      setRenamingFile(name);
      setRenameValue(name);
    } catch (error) {
      console.error("Error creating file:", error);
      showNotification("error", "Creation Error", "Failed to create new file.");
    }
  };

  const handleCopy = () => {
    const files = Array.from(selectedFiles);
    setClipboardFiles({
      type: "copy",
      files,
      sourcePath: path,
    });
  };

  const handleCut = () => {
    const files = Array.from(selectedFiles);
    setClipboardFiles({
      type: "cut",
      files,
      sourcePath: path,
    });
  };

  const handlePaste = async () => {
    if (!clipboardFiles) return;

    try {
      for (const fileName of clipboardFiles.files) {
        const sourcePath = await join(clipboardFiles.sourcePath, fileName);

        // Generate unique name if file exists
        let destName = fileName;
        let counter = 1;
        while (files.some((f) => f.name === destName)) {
          const ext = fileName.includes(".")
            ? "." + fileName.split(".").pop()
            : "";
          const baseName = fileName.includes(".")
            ? fileName.substring(0, fileName.lastIndexOf("."))
            : fileName;
          destName = `${baseName} (${counter})${ext}`;
          counter++;
        }

        // Use current path for destination
        const destPath = await join(path, destName);

        if (clipboardFiles.type === "copy") {
          await copyFile(sourcePath, destPath);
        } else {
          await rename(sourcePath, destPath);
        }
      }

      if (clipboardFiles.type === "cut") {
        setClipboardFiles(null);
      }

      await loadFiles();
    } catch (error) {
      console.error("Error pasting files:", error);
    }
  };

  const handleRename = async () => {
    const selectedFile = Array.from(selectedFiles)[0];
    if (!selectedFile) return;

    setRenamingFile(selectedFile);
    setRenameValue(selectedFile);
  };

  const handleRenameSubmit = async () => {
    if (!renamingFile || !renameValue.trim()) return;

    try {
      const oldPath = await join(path, renamingFile);
      const newPath = await join(path, renameValue);

      // Check if target exists
      if (files.some((f) => f.name === renameValue)) {
        throw new Error("A file with that name already exists");
      }

      await rename(oldPath, newPath);
      setRenamingFile(null);
      await loadFiles();
    } catch (error) {
      console.error("Error renaming file:", error);
      showNotification(
        "error",
        "Rename Error",
        "A file with that name already exists."
      );
    }
  };

  const handleRenameCancel = () => {
    setRenamingFile(null);
    setRenameValue("");
  };

  const handleDelete = async () => {
    if (selectedFiles.size === 0) return;

    const confirmMessage =
      selectedFiles.size === 1
        ? `Are you sure you want to delete "${Array.from(selectedFiles)[0]}"?`
        : `Are you sure you want to delete ${selectedFiles.size} items?`;

    if (window.confirm(confirmMessage)) {
      try {
        for (const fileName of selectedFiles) {
          const filePath = await join(path, fileName);
          await remove(filePath);
        }
        onSelectedFilesChange(new Set());
        await loadFiles();
      } catch (error) {
        console.error("Error deleting files:", error);
      }
    }
  };

  const showNotification = (
    status: "success" | "error" | "info" | "warning",
    title: string,
    message: string
  ) => {
    setNotification({ status, title, message });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 relative"
      style={{ minHeight: "calc(100vh - 200px)" }}
      onContextMenu={(e) => {
        e.preventDefault();
        handleContextMenu(e);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleContainerClick}
          className={`${
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2"
              : "flex flex-col space-y-2 p-2"
          }`}
        >
          {files.map((file) => (
            <div
              key={file.name}
              data-file-item
              onClick={(e) => handleItemClick(file, e)}
              onDoubleClick={() => handleDoubleClick(file)}
              onContextMenu={(e) => {
                e.stopPropagation();
                handleContextMenu(e, file);
              }}
              className={`${
                viewMode === "grid"
                  ? "bg-white rounded-lg border p-4"
                  : "bg-white rounded-lg border p-3"
              } cursor-pointer select-none transition-all ${
                selectedFiles.has(file.name)
                  ? "border-blue-500 bg-blue-50/50 hover:border-blue-500"
                  : "border-gray-100 hover:border-gray-200"
              } hover:shadow-sm`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gray-50">
                  {file.isDirectory ? (
                    <Folder className="w-5 h-5 text-blue-500" weight="fill" />
                  ) : (
                    <File className="w-5 h-5 text-gray-500" weight="fill" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {renamingFile === file.name ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRenameSubmit();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameCancel}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            handleRenameCancel();
                          }
                        }}
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </form>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 truncate select-none">
                      {file.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <div
        className="absolute inset-0 -z-10"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleContextMenu(e);
        }}
      />

      <ContextMenu
        clipboardFiles={clipboardFiles}
        onNewFolder={handleNewFolder}
        onNewFile={handleNewFile}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      <AnimatePresence>
        {notification && (
          <Notification
            status={notification.status}
            title={notification.title}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
