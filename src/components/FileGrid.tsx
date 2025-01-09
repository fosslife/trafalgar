import { motion, AnimatePresence } from "motion/react";
import {
  readDir,
  DirEntry,
  remove,
  rename,
  copyFile,
  mkdir,
  writeFile,
  lstat,
} from "@tauri-apps/plugin-fs";
import { useEffect, useState, useRef, useCallback } from "react";
import { Folder, File } from "@phosphor-icons/react";
import { join } from "@tauri-apps/api/path";
import { useContextMenu } from "../contexts/ContextMenuContext";
import { ContextMenu } from "./ContextMenu";
import { Notification } from "./Notification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { formatFileSize, formatDate } from "../utils/fileUtils";
import { getFileIcon } from "../utils/fileIcons";
import { RenameInput } from "./RenameInput";

type ViewMode = "grid" | "list";

interface FileGridProps {
  path: string;
  onNavigate: (path: string) => void;
  selectedFiles: Set<string>;
  onSelectedFilesChange: (files: Set<string>) => void;
  viewMode: ViewMode;
  sortKey: "name" | "type" | "date";
}

interface ClipboardItem {
  type: "copy" | "cut";
  files: string[];
  sourcePath: string;
}

// Add metadata to DirEntry type
interface FileMetadata extends DirEntry {
  size?: number;
  modifiedAt?: Date;
  accessedAt?: Date;
  createdAt?: Date;
  readonly?: boolean;
}

// First, let's add a header component for the list view
const ListViewHeader = () => (
  <div className="sticky top-0 bg-gray-50 border-b text-sm text-gray-600 py-2 px-4 grid grid-cols-[auto_100px_150px] gap-4">
    <div>Name</div>
    <div className="text-right">Size</div>
    <div className="text-right">Modified</div>
  </div>
);

export function FileGrid({
  path,
  onNavigate,
  selectedFiles,
  onSelectedFilesChange,
  viewMode,
  sortKey,
}: FileGridProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
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

  // Add navigation history with current index
  const [navigationState, setNavigationState] = useState<{
    history: string[];
    currentIndex: number;
  }>({
    history: [],
    currentIndex: -1,
  });

  // Add new state for tracking the anchor point
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);

  // Update history when path changes
  useEffect(() => {
    setNavigationState((prev) => {
      // If we're already at this path, don't add it
      if (prev.history[prev.currentIndex] === path) {
        return prev;
      }

      // Remove forward history when navigating to a new path
      const newHistory = prev.history.slice(0, prev.currentIndex + 1);

      // Normalize paths before comparing to avoid duplicates
      const normalizedPath = path.replace(/\\/g, "/");

      // Only add if it's different from the last path
      if (newHistory[newHistory.length - 1] !== normalizedPath) {
        return {
          history: [...newHistory, normalizedPath],
          currentIndex: prev.currentIndex + 1,
        };
      }

      return prev;
    });
  }, [path]);

  const handleBack = useCallback(() => {
    if (navigationState.currentIndex > 0) {
      const previousPath =
        navigationState.history[navigationState.currentIndex - 1];
      setNavigationState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
      }));
      onNavigate(previousPath);
    }
  }, [navigationState, onNavigate]);

  const handleForward = useCallback(() => {
    if (navigationState.currentIndex < navigationState.history.length - 1) {
      const nextPath =
        navigationState.history[navigationState.currentIndex + 1];
      setNavigationState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
      }));
      onNavigate(nextPath);
    }
  }, [navigationState, onNavigate]);

  // Use our new hook for keyboard shortcuts
  useKeyboardShortcuts(
    [
      {
        key: "c",
        ctrl: true,
        action: () => {
          if (selectedFiles.size > 0) {
            handleCopy();
          }
        },
      },
      {
        key: "x",
        ctrl: true,
        action: () => {
          if (selectedFiles.size > 0) {
            handleCut();
          }
        },
      },
      {
        key: "v",
        ctrl: true,
        action: () => {
          if (clipboardFiles) {
            handlePaste();
          }
        },
      },
      {
        key: "F2",
        action: () => {
          if (selectedFiles.size === 1) {
            handleRename();
          }
        },
      },
      {
        key: "Delete",
        action: () => {
          if (selectedFiles.size > 0) {
            handleDelete();
          }
        },
      },
      // Keep existing shortcuts
      {
        key: "a",
        ctrl: true,
        action: () => {
          onSelectedFilesChange(new Set(files.map((f) => f.name)));
        },
      },
      {
        key: "Escape",
        action: () => {
          onSelectedFilesChange(new Set());
        },
      },
    ],
    {
      onBack: handleBack,
      onForward: handleForward,
    }
  );

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
      console.log("Entries:", entries);

      // Get metadata for each file
      const entriesWithMetadata = await Promise.all(
        entries.map(async (entry) => {
          try {
            const filePath = await join(path, entry.name);
            const stats = await lstat(filePath);
            return {
              ...entry,
              size: stats.size,
              modifiedAt: stats.mtime || undefined,
              accessedAt: stats.atime || undefined,
              createdAt: stats.birthtime || undefined,
              readonly: stats.readonly,
            };
          } catch (error) {
            console.debug(`Skipping inaccessible path: ${entry.name}`);
            return null;
          }
        })
      );

      // Fix the type predicate
      const accessibleEntries = entriesWithMetadata.filter(
        (entry): entry is NonNullable<typeof entry> => entry !== null
      );

      const sortedEntries = sortFiles(accessibleEntries, sortKey);
      setFiles(sortedEntries);
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  };

  const sortFiles = (files: FileMetadata[], key: "name" | "type" | "date") => {
    return [...files].sort((a, b) => {
      if (key === "type") {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      }

      if (key === "date") {
        const dateA = a.modifiedAt || new Date(0);
        const dateB = b.modifiedAt || new Date(0);

        if (dateA.getTime() === dateB.getTime()) {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        }

        return dateB.getTime() - dateA.getTime();
      }

      return a.name.localeCompare(b.name);
    });
  };

  const handleContainerClick = (event: React.MouseEvent) => {
    if (!(event.target as HTMLElement).closest("[data-file-item]")) {
      setSelectionAnchor(null);
      onSelectedFilesChange(new Set());
    }
  };

  const handleItemClick = (file: FileMetadata, event: React.MouseEvent) => {
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      const newSelection = new Set(selectedFiles);
      if (selectedFiles.has(file.name)) {
        newSelection.delete(file.name);
      } else {
        newSelection.add(file.name);
        setSelectionAnchor(file.name); // Update anchor on Ctrl+Click
      }
      onSelectedFilesChange(newSelection);
    } else if (event.shiftKey && files.length > 0) {
      // Range select with Shift
      if (!selectionAnchor) {
        // If no anchor, use this as anchor and select single item
        setSelectionAnchor(file.name);
        onSelectedFilesChange(new Set([file.name]));
      } else {
        // Select range from anchor to current item
        const start = files.findIndex((f) => f.name === selectionAnchor);
        const end = files.findIndex((f) => f.name === file.name);
        const range = files.slice(
          Math.min(start, end),
          Math.max(start, end) + 1
        );
        onSelectedFilesChange(new Set(range.map((f) => f.name)));
      }
    } else {
      // Single select
      setSelectionAnchor(file.name);
      onSelectedFilesChange(new Set([file.name]));
    }
  };

  const handleDoubleClick = (file: FileMetadata) => {
    if (file.isDirectory) {
      onNavigate(file.name);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, file?: FileMetadata) => {
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

      // Add new folder to files state directly
      const newFolder: FileMetadata = {
        name,
        isDirectory: true,
        isFile: false,
        isSymlink: false,
      };
      setFiles(sortFiles([...files, newFolder], sortKey));

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

      // Add new file to files state directly
      const newFile: FileMetadata = {
        name,
        isDirectory: false,
        isFile: true,
        isSymlink: false,
      };
      setFiles(sortFiles([...files, newFile], sortKey));

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

      // Update files state directly
      setFiles(
        sortFiles(
          files.map((f) =>
            f.name === renamingFile ? { ...f, name: renameValue } : f
          ),
          sortKey
        )
      );

      setRenamingFile(null);
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

        // Update files state directly
        setFiles(files.filter((f) => !selectedFiles.has(f.name)));
        onSelectedFilesChange(new Set());
      } catch (error) {
        console.error("Error deleting files:", error);
        showNotification(
          "error",
          "Delete Error",
          "Failed to delete one or more items."
        );
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

  // Also clear anchor when path changes
  useEffect(() => {
    setSelectionAnchor(null);
    onSelectedFilesChange(new Set());
  }, [path]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 relative h-full flex flex-col"
      onClick={handleContainerClick}
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
          className={`${
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
              : "flex-1 flex flex-col overflow-auto bg-white rounded-xl border border-surface-200"
          }`}
        >
          {viewMode === "list" && (
            <div className="sticky top-0 bg-surface-50/80 backdrop-blur-sm border-b border-surface-200 text-sm text-gray-500 py-2 px-4 grid grid-cols-[auto_100px_150px] gap-4">
              <div>Name</div>
              <div className="text-right">Size</div>
              <div className="text-right">Modified</div>
            </div>
          )}

          {files.map((file) => {
            const FileIcon = getFileIcon(file.name);
            const isSelected = selectedFiles.has(file.name);

            return viewMode === "grid" ? (
              // Grid View Item
              <motion.div
                key={file.name}
                data-file-item
                onClick={(e) => handleItemClick(file, e)}
                onDoubleClick={() => handleDoubleClick(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
                className={`group relative bg-white rounded-xl border p-4 cursor-pointer
                  transition-all duration-200 hover:shadow-md
                  ${
                    isSelected
                      ? "border-primary-500 bg-primary-50/50 ring-1 ring-primary-500"
                      : "border-surface-200 hover:border-surface-300"
                  }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div
                    className={`p-3 rounded-xl transition-colors ${
                      isSelected
                        ? "bg-primary-100"
                        : "bg-surface-50 group-hover:bg-surface-100"
                    }`}
                  >
                    {file.isDirectory ? (
                      <Folder
                        className={`w-8 h-8 ${
                          isSelected ? "text-primary-500" : "text-blue-500"
                        }`}
                        weight="fill"
                      />
                    ) : (
                      <FileIcon
                        className={`w-8 h-8 ${
                          isSelected ? "text-primary-500" : "text-gray-500"
                        }`}
                        weight="fill"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {renamingFile === file.name ? (
                      <RenameInput
                        value={renameValue}
                        onChange={setRenameValue}
                        onSubmit={handleRenameSubmit}
                        onCancel={handleRenameCancel}
                        inputRef={renameInputRef}
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              // List View Item
              <motion.div
                key={file.name}
                data-file-item
                onClick={(e) => handleItemClick(file, e)}
                onDoubleClick={() => handleDoubleClick(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
                className={`group border-b border-surface-200 transition-colors
                  ${
                    isSelected
                      ? "bg-primary-50 hover:bg-primary-100"
                      : "hover:bg-surface-50"
                  }`}
              >
                <div className="py-2 px-4 grid grid-cols-[auto_100px_150px] gap-4 items-center">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-primary-100"
                          : "bg-surface-50 group-hover:bg-surface-100"
                      }`}
                    >
                      {file.isDirectory ? (
                        <Folder
                          className={`w-5 h-5 ${
                            isSelected ? "text-primary-500" : "text-blue-500"
                          }`}
                          weight="fill"
                        />
                      ) : (
                        <FileIcon
                          className={`w-5 h-5 ${
                            isSelected ? "text-primary-500" : "text-gray-500"
                          }`}
                          weight="fill"
                        />
                      )}
                    </div>
                    {renamingFile === file.name ? (
                      <RenameInput
                        value={renameValue}
                        onChange={setRenameValue}
                        onSubmit={handleRenameSubmit}
                        onCancel={handleRenameCancel}
                        inputRef={renameInputRef}
                      />
                    ) : (
                      <span className="text-sm truncate">{file.name}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 text-right">
                    {!file.isDirectory && file.size !== undefined
                      ? formatFileSize(file.size)
                      : ""}
                  </div>
                  <div className="text-sm text-gray-500 text-right">
                    {file.modifiedAt ? formatDate(file.modifiedAt) : ""}
                  </div>
                </div>
              </motion.div>
            );
          })}
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
