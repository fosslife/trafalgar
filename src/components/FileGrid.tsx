import { motion, AnimatePresence } from "motion/react";
import {
  readDir,
  DirEntry,
  rename,
  mkdir,
  writeFile,
  lstat,
} from "@tauri-apps/plugin-fs";
import { useEffect, useState, useRef, useCallback } from "react";
import { Folder } from "@phosphor-icons/react";
import { join, sep } from "@tauri-apps/api/path";
import { useContextMenu } from "../contexts/ContextMenuContext";
import { ContextMenu } from "./ContextMenu";
import { Notification } from "./Notification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import {
  formatFileSize,
  formatDate,
  filterSystemFiles,
} from "../utils/fileUtils";
import { getFileIcon } from "../utils/fileIcons";
import { RenameInput } from "./RenameInput";
import { HomeView } from "./HomeView";
import { useFileOperations } from "../contexts/FileOperationsContext";

type ViewMode = "grid" | "list";

interface FileGridProps {
  path: string;
  onNavigate: (path: string) => void;
  selectedFiles: Set<string>;
  onSelectedFilesChange: (files: Set<string>) => void;
  viewMode: ViewMode;
  sortKey: "name" | "type" | "date";
  fileToRename?: string | null;
  onRenameComplete?: () => void;
}

// Add metadata to DirEntry type
interface FileMetadata extends DirEntry {
  size?: number;
  modifiedAt?: Date;
  accessedAt?: Date;
  createdAt?: Date;
  readonly?: boolean;
}

interface TypeAheadState {
  searchString: string;
  lastKeyTime: number;
  currentMatchIndex: number;
}

export function FileGrid({
  path,
  onNavigate,
  selectedFiles,
  onSelectedFilesChange,
  viewMode,
  sortKey,
  fileToRename,
  onRenameComplete,
}: FileGridProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const { openMenu } = useContextMenu();
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{
    status: "success" | "error" | "info" | "warning";
    title: string;
    message: string;
  } | null>(null);

  // Add new state for tracking the anchor point
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);

  // Add new state for type-ahead search
  const typeAheadRef = useRef<TypeAheadState>({
    searchString: "",
    lastKeyTime: 0,
    currentMatchIndex: 0,
  });

  const { copy, cut, paste, delete: deleteFiles } = useFileOperations();

  // Add drag state at the top of the FileGrid component
  const [isDragging, setIsDragging] = useState(false);

  // Add drag handlers
  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);

  // Add keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "c",
      ctrl: true,
      action: () => {
        if (selectedFiles.size > 0) {
          copy(Array.from(selectedFiles), path);
        }
      },
    },
    {
      key: "x",
      ctrl: true,
      action: () => {
        if (selectedFiles.size > 0) {
          cut(Array.from(selectedFiles), path);
        }
      },
    },
    {
      key: "v",
      ctrl: true,
      action: async () => {
        await paste(path, loadFiles);
      },
    },
    {
      key: "Delete",
      action: async () => {
        if (selectedFiles.size > 0) {
          const confirmMessage =
            selectedFiles.size === 1
              ? `Are you sure you want to delete "${
                  Array.from(selectedFiles)[0]
                }"?`
              : `Are you sure you want to delete ${selectedFiles.size} items?`;

          if (window.confirm(confirmMessage)) {
            await deleteFiles(Array.from(selectedFiles), path);
            onSelectedFilesChange(new Set());
            await loadFiles();
          }
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
  ]);

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
      const filtered = filterSystemFiles(entries);
      console.log("Entries:", filtered);

      // Get metadata for each file
      const entriesWithMetadata = await Promise.all(
        filtered.map(async (entry) => {
          try {
            const filePath = await join(path, entry.name);
            const stats = await lstat(filePath).catch((error) => {
              console.error("Error getting stats for", filePath, error);
              return null;
            });
            return {
              ...entry,
              size: stats?.size || 0,
              modifiedAt: stats?.mtime || undefined,
              accessedAt: stats?.atime || undefined,
              createdAt: stats?.birthtime || undefined,
              readonly: stats?.readonly,
            };
          } catch (error) {
            console.error(error);
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

  // Add this new handler
  const handleTypeAheadSearch = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if we're in an input field or if control/meta keys are pressed
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return;
      }

      // Only handle printable characters
      if (e.key.length === 1) {
        const currentTime = Date.now();
        const { searchString, lastKeyTime, currentMatchIndex } =
          typeAheadRef.current;

        // Reset search string if it's been too long since last keystroke (500ms)
        const isNewSearch = currentTime - lastKeyTime > 500;
        const newSearchString = isNewSearch ? e.key : searchString + e.key;

        // Find all matching files
        const matchingFiles = files.filter((file) =>
          file.name.toLowerCase().startsWith(newSearchString.toLowerCase())
        );

        if (matchingFiles.length > 0) {
          // If it's the same search string and we have multiple matches,
          // cycle through them
          let nextMatchIndex = 0;
          if (!isNewSearch && newSearchString === searchString) {
            nextMatchIndex = (currentMatchIndex + 1) % matchingFiles.length;
          }

          const matchingFile = matchingFiles[nextMatchIndex];

          // Select the matching file
          onSelectedFilesChange(new Set([matchingFile.name]));
          setSelectionAnchor(matchingFile.name);

          // If we're in a list view, scroll the item into view
          const element = document.querySelector(
            `[data-file-item="${matchingFile.name}"]`
          );
          if (element) {
            element.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
          }

          // Show a temporary notification about multiple matches
          if (matchingFiles.length > 1) {
            showNotification(
              "info",
              "Multiple Matches",
              `Match ${nextMatchIndex + 1} of ${matchingFiles.length}: "${
                matchingFile.name
              }"`
            );
            // Auto-hide the notification after 1.5 seconds
            setTimeout(() => {
              setNotification(null);
            }, 1500);
          }

          // Update the typeahead state
          typeAheadRef.current = {
            searchString: newSearchString,
            lastKeyTime: currentTime,
            currentMatchIndex: nextMatchIndex,
          };
        } else {
          // If no matches found, just update the search string
          typeAheadRef.current = {
            searchString: newSearchString,
            lastKeyTime: currentTime,
            currentMatchIndex: 0,
          };
        }
      }
    },
    [files, onSelectedFilesChange, showNotification]
  );

  // Add effect to bind/unbind the keyboard event listener
  useEffect(() => {
    window.addEventListener("keydown", handleTypeAheadSearch);
    return () => {
      window.removeEventListener("keydown", handleTypeAheadSearch);
    };
  }, [handleTypeAheadSearch]);

  // Add effect to handle fileToRename prop
  useEffect(() => {
    if (fileToRename) {
      setRenamingFile(fileToRename);
      setRenameValue(fileToRename);
      onRenameComplete?.();
    }
  }, [fileToRename, onRenameComplete]);

  // Show home view at root path
  if (path === "/" || path === "" || path === sep()) {
    return <HomeView onNavigate={onNavigate} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className={`relative h-full overflow-auto ${
        viewMode === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4 content-start"
          : "flex flex-col bg-white dark:bg-surface-100 rounded-xl border border-surface-200 dark:border-surface-200"
      }`}
      onClick={handleContainerClick}
      onContextMenu={(e) => {
        e.preventDefault();
        handleContextMenu(e);
      }}
    >
      {viewMode === "list" && (
        <div className="sticky top-0 z-10 bg-surface-50/80 dark:bg-surface-200/80 backdrop-blur-sm border-b border-surface-200 dark:border-surface-200">
          <div className="text-sm text-gray-500 dark:text-gray-400 py-2 px-4 grid grid-cols-[auto_100px_150px] gap-4">
            <div>Name</div>
            <div className="text-right">Size</div>
            <div className="text-right">Modified</div>
          </div>
        </div>
      )}

      {viewMode === "list" ? (
        // List View Container
        <div className="flex-1 bg-white dark:bg-surface-100 rounded-xl border border-surface-200 dark:border-surface-200">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.name);
            return (
              // List View Item
              <motion.div
                key={file.name}
                data-file-item={file.name}
                onClick={(e) => handleItemClick(file, e)}
                onDoubleClick={() => handleDoubleClick(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
                className={`group border-b border-surface-200 dark:border-surface-200 transition-colors
                  ${
                    selectedFiles.has(file.name)
                      ? "bg-primary-50/30 dark:bg-primary-900/20 hover:bg-primary-50/50 dark:hover:bg-primary-900/30"
                      : "hover:bg-surface-50 dark:hover:bg-surface-200"
                  }`}
              >
                <div className="py-2 px-4 grid grid-cols-[auto_100px_150px] gap-4 items-center">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        selectedFiles.has(file.name)
                          ? "bg-primary-50/70 dark:bg-primary-900/40"
                          : "bg-surface-50 dark:bg-surface-200 group-hover:bg-surface-100 dark:group-hover:bg-surface-300"
                      }`}
                    >
                      {file.isDirectory ? (
                        <Folder
                          className={`w-5 h-5 ${
                            selectedFiles.has(file.name)
                              ? "text-primary-500 dark:text-primary-400"
                              : "text-blue-500"
                          }`}
                          weight="fill"
                        />
                      ) : (
                        <FileIcon
                          className={`w-5 h-5 ${
                            selectedFiles.has(file.name)
                              ? "text-primary-500 dark:text-primary-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                          weight="fill"
                        />
                      )}
                    </div>
                    <span className="text-sm truncate text-gray-900 dark:text-gray-100">
                      {file.name}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
                    {!file.isDirectory && file.size !== undefined
                      ? formatFileSize(file.size)
                      : ""}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
                    {file.modifiedAt ? formatDate(file.modifiedAt) : ""}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        // Grid View Items directly in the container
        files.map((file) => {
          const FileIcon = getFileIcon(file.name);
          return (
            // Grid View Item
            <motion.div
              key={file.name}
              data-file-item={file.name}
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onClick={(e) => handleItemClick(file, e)}
              onDoubleClick={() => handleDoubleClick(file)}
              onContextMenu={(e) => handleContextMenu(e, file)}
              className={`group relative bg-white dark:bg-surface-100 rounded-lg border p-3 cursor-pointer h-[160px]
              transition-all duration-150 hover:shadow-lg
              ${
                selectedFiles.has(file.name)
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-100 dark:ring-primary-900/30"
                  : "border-surface-100 dark:border-surface-200 hover:border-primary-100 dark:hover:border-primary-900/30"
              }
              ${isDragging ? "opacity-50" : "opacity-100"}
            `}
            >
              <div className="flex flex-col items-center text-center space-y-2 h-full justify-center">
                <div
                  className={`p-3 rounded-xl transition-all duration-150 
                  ${
                    selectedFiles.has(file.name)
                      ? "bg-primary-100/60 dark:bg-primary-900/40"
                      : "bg-surface-50 dark:bg-surface-200 group-hover:bg-surface-100 dark:group-hover:bg-surface-300"
                  }
                `}
                >
                  {file.isDirectory ? (
                    <Folder
                      className={`w-8 h-8 transition-colors duration-150
                      ${
                        selectedFiles.has(file.name)
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-blue-500"
                      }
                    `}
                      weight="fill"
                    />
                  ) : (
                    <FileIcon
                      className={`w-8 h-8 transition-colors duration-150
                      ${
                        selectedFiles.has(file.name)
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-gray-500 dark:text-gray-400"
                      }
                    `}
                      weight="fill"
                    />
                  )}
                </div>
                <span
                  className={`text-sm font-medium truncate max-w-[120px]
                ${
                  selectedFiles.has(file.name)
                    ? "text-primary-900 dark:text-primary-100"
                    : "text-gray-700 dark:text-gray-200"
                }
              `}
                >
                  {file.name}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {file.size !== undefined ? formatFileSize(file.size) : ""}
                </span>
              </div>
            </motion.div>
          );
        })
      )}

      <div
        className="absolute inset-0 -z-10"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleContextMenu(e);
        }}
      />

      <ContextMenu
        onNewFolder={handleNewFolder}
        onNewFile={handleNewFile}
        onRename={handleRename}
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
