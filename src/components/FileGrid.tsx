import { motion, AnimatePresence } from "motion/react";
import { readDir, DirEntry } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";
import { Folder, File, List, SquaresFour } from "@phosphor-icons/react";

type ViewMode = "grid" | "list";
type SortKey = "name" | "type";

interface FileGridProps {
  path: string;
  onNavigate: (path: string) => void;
}

export function FileGrid({ path, onNavigate }: FileGridProps) {
  const [files, setFiles] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFiles();
    setSelectedFiles(new Set()); // Clear selection when path changes
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

  const handleItemClick = (file: DirEntry, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      const newSelection = new Set(selectedFiles);
      if (selectedFiles.has(file.name)) {
        newSelection.delete(file.name);
      } else {
        newSelection.add(file.name);
      }
      setSelectedFiles(newSelection);
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
        setSelectedFiles(new Set(range.map((f) => f.name)));
      } else {
        setSelectedFiles(new Set([file.name]));
      }
    } else {
      // Single select
      setSelectedFiles(new Set([file.name]));
    }
  };

  const handleDoubleClick = (file: DirEntry) => {
    if (file.isDirectory) {
      onNavigate(file.name);
    }
    // Handle file opening later
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              : "flex flex-col space-y-2"
          }
        >
          {files.map((file) => (
            <div
              key={file.name}
              onClick={(e) => handleItemClick(file, e)}
              onDoubleClick={() => handleDoubleClick(file)}
              className={`${
                viewMode === "grid"
                  ? "bg-white rounded-lg border hover:border-gray-200 hover:shadow-sm transition-all p-4"
                  : "bg-white rounded-lg border hover:border-gray-200 hover:shadow-sm transition-all p-3"
              } cursor-pointer ${
                selectedFiles.has(file.name)
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-gray-100"
              }`}
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
                  <p className="text-sm font-medium text-gray-900 truncate">
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
