import { motion, AnimatePresence } from "motion/react";
import {
  readDir,
  DirEntry,
  remove,
  rename,
  copyFile,
} from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";
import { Folder, File, List, SquaresFour } from "@phosphor-icons/react";
import { join } from "@tauri-apps/api/path";
import { useContextMenu } from "../contexts/ContextMenuContext";

type ViewMode = "grid" | "list";
type SortKey = "name" | "type";

interface FileGridProps {
  path: string;
  onNavigate: (path: string) => void;
  selectedFiles: Set<string>;
  onSelectedFilesChange: (files: Set<string>) => void;
}

export function FileGrid({
  path,
  onNavigate,
  selectedFiles,
  onSelectedFilesChange,
}: FileGridProps) {
  const [files, setFiles] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [clipboardFiles, setClipboardFiles] = useState<{
    type: "copy" | "cut";
    files: string[];
  } | null>(null);
  const { showContextMenu } = useContextMenu();

  useEffect(() => {
    loadFiles();
    onSelectedFilesChange(new Set()); // Clear selection when path changes
  }, [path]);

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

  const sortFiles = (files: DirEntry[], key: SortKey) => {
    return [...files].sort((a, b) => {
      if (key === "type") {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const handleSort = (key: SortKey) => {
    setSortKey(key);
    setFiles(sortFiles(files, key));
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

  const handleContainerContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    showContextMenu({
      position: { x: event.pageX, y: event.pageY },
      canPaste: !!clipboardFiles,
      hasSelection: selectedFiles.size > 0,
    });
  };

  const handleItemContextMenu = (
    event: React.MouseEvent,
    file: DirEntry,
    isSelected: boolean
  ) => {
    event.preventDefault();
    if (!isSelected) {
      onSelectedFilesChange(new Set([file.name]));
    }
    showContextMenu({
      position: { x: event.pageX, y: event.pageY },
      canPaste: !!clipboardFiles,
      hasSelection: true,
    });
  };

  const handleCopy = async () => {
    const files = Array.from(selectedFiles);
    setClipboardFiles({ type: "copy", files });
  };

  const handleCut = async () => {
    const files = Array.from(selectedFiles);
    setClipboardFiles({ type: "cut", files });
  };

  const handlePaste = async () => {
    if (!clipboardFiles) return;

    try {
      for (const fileName of clipboardFiles.files) {
        // For source path, we need to use the original location
        const sourcePath = await join(
          clipboardFiles.type === "cut" ? path : "/",
          fileName
        );

        // For destination, we use the current path
        let newFileName = fileName;
        let counter = 1;
        while (files.some((f) => f.name === newFileName)) {
          const ext = fileName.includes(".")
            ? "." + fileName.split(".").pop()
            : "";
          const baseName = fileName.includes(".")
            ? fileName.slice(0, fileName.lastIndexOf("."))
            : fileName;
          newFileName = `${baseName} (${counter})${ext}`;
          counter++;
        }

        const finalDestPath = await join(path, newFileName);

        await copyFile(sourcePath, finalDestPath);

        // If it was a cut operation, delete the original after successful copy
        if (clipboardFiles.type === "cut") {
          await remove(sourcePath);
        }
      }

      // Clear clipboard after cut operation
      if (clipboardFiles.type === "cut") {
        setClipboardFiles(null);
      }

      await loadFiles();
    } catch (error) {
      console.error("Error pasting files:", error);
    }
  };

  const handleDelete = async () => {
    try {
      for (const fileName of selectedFiles) {
        const filePath = await join(path, fileName);
        await remove(filePath);
      }
      loadFiles();
    } catch (error) {
      console.error("Error deleting files:", error);
    }
  };

  const handleRename = async () => {
    const fileName = Array.from(selectedFiles)[0];
    if (!fileName) return;

    // For now, just use a prompt. Later we can make this inline
    const newName = prompt("Enter new name:", fileName);
    if (!newName || newName === fileName) return;

    try {
      const oldPath = await join(path, fileName);
      const newPath = await join(path, newName);
      await rename(oldPath, newPath);
      loadFiles();
    } catch (error) {
      console.error("Error renaming file:", error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
            value={sortKey}
            onChange={(e) => handleSort(e.target.value as SortKey)}
          >
            <option value="name">Sort by name</option>
            <option value="type">Sort by type</option>
          </select>
          {selectedFiles.size > 0 && (
            <span className="text-sm text-gray-500">
              {selectedFiles.size} selected
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg ${
              viewMode === "grid" ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
          >
            <SquaresFour className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg ${
              viewMode === "list" ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
          >
            <List className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleContainerClick}
          onContextMenu={handleContainerContextMenu}
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 min-h-[200px] p-2"
              : "flex flex-col space-y-2 min-h-[200px] p-2"
          }
        >
          {files.map((file) => (
            <div
              key={file.name}
              onClick={(e) => handleItemClick(file, e)}
              onDoubleClick={() => handleDoubleClick(file)}
              onContextMenu={(e) =>
                handleItemContextMenu(e, file, selectedFiles.has(file.name))
              }
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
                  <p className="text-sm font-medium text-gray-900 truncate select-none">
                    {file.name}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
