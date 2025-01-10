import { useState, useEffect } from "react";
import { CaretRight, HardDrive, Folder, House } from "@phosphor-icons/react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "motion/react";
import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

interface DriveInfo {
  name: string;
  path: string;
  driveType: "fixed" | "removable" | "network" | "cdRom" | "unknown";
  volumeName?: string;
}

interface FolderInfo {
  name: string;
  path: string;
}

interface TreeNodeProps {
  name: string;
  path: string;
  icon?: React.ReactNode;
  isActive: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onNavigate: (path: string) => void;
  onToggle?: () => void;
  children?: React.ReactNode;
}

function TreeNode({
  name,
  path,
  icon,
  isActive,
  hasChildren,
  isExpanded,
  onNavigate,
  onToggle,
  children,
}: TreeNodeProps) {
  return (
    <div>
      <motion.div
        className="flex items-center"
        whileHover={{ x: hasChildren ? 0 : 2 }}
      >
        {hasChildren && (
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-surface-100 text-gray-400"
          >
            <CaretRight
              className={`w-3 h-3 transition-transform ${
                isExpanded ? "transform rotate-90" : ""
              }`}
            />
          </button>
        )}
        <button
          onClick={() => onNavigate(path)}
          className={`flex-1 flex items-center space-x-2 px-2 py-1.5 rounded-lg
            text-sm transition-colors text-left
            ${
              isActive
                ? "bg-primary-50 text-primary-600"
                : "hover:bg-surface-100 text-gray-600"
            }`}
        >
          <span className={isActive ? "text-primary-500" : "text-gray-500"}>
            {icon || <Folder className="w-4 h-4" />}
          </span>
          <span className="truncate">{name}</span>
        </button>
      </motion.div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-4 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FolderTreeProps {
  path: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  level?: number;
}

function FolderTree({
  path,
  currentPath,
  onNavigate,
  level = 0,
}: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(false);

  const loadFolders = async () => {
    if (level > 2) return; // Limit initial depth
    try {
      setIsLoading(true);
      const entries = await readDir(path);
      const folderList = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory)
          .map(async (entry) => ({
            name: entry.name,
            path: await join(path, entry.name),
          }))
      );

      setFolders(folderList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Error loading folders:", err, { path });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, [path]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  if (isLoading) {
    return <div className="py-1 px-2 text-xs text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-0.5">
      {folders.map((folder) => (
        <TreeNode
          key={folder.path}
          name={folder.name}
          path={folder.path}
          icon={<Folder className="w-4 h-4" />}
          isActive={currentPath === folder.path}
          hasChildren={true}
          isExpanded={expandedFolders.has(folder.path)}
          onNavigate={onNavigate}
          onToggle={() => toggleFolder(folder.path)}
        >
          {expandedFolders.has(folder.path) && (
            <FolderTree
              path={folder.path}
              currentPath={currentPath}
              onNavigate={onNavigate}
              level={level + 1}
            />
          )}
        </TreeNode>
      ))}
    </div>
  );
}

interface TreeViewProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function TreeView({ currentPath, onNavigate }: TreeViewProps) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [expandedDrives, setExpandedDrives] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadDrives = async () => {
      try {
        const driveList = await invoke<DriveInfo[]>("list_drives");
        const sortedDrives = [...driveList].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setDrives(sortedDrives);
      } catch (err) {
        console.error("Error loading drives:", err);
      }
    };

    loadDrives();
  }, []);

  const getDriveIcon = (type: string) => {
    return (
      <HardDrive
        className={`w-4 h-4 ${
          type === "fixed"
            ? "text-primary-500"
            : type === "removable"
            ? "text-green-500"
            : type === "network"
            ? "text-blue-500"
            : type === "cdRom"
            ? "text-amber-500"
            : "text-gray-400"
        }`}
        weight="fill"
      />
    );
  };

  const toggleDrive = (drivePath: string) => {
    setExpandedDrives((prev) => {
      const next = new Set(prev);
      if (next.has(drivePath)) {
        next.delete(drivePath);
      } else {
        next.add(drivePath);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="px-3">
        <TreeNode
          name="Home"
          path="/"
          icon={<House className="w-4 h-4" />}
          isActive={currentPath === "/"}
          onNavigate={onNavigate}
        />
      </div>

      <div className="space-y-1">
        <div className="px-3 py-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Drives
          </h3>
        </div>
        <div className="space-y-0.5 px-3">
          {drives.map((drive) => (
            <TreeNode
              key={drive.path}
              name={
                drive.volumeName
                  ? `${drive.name} (${drive.volumeName})`
                  : drive.name
              }
              path={drive.path}
              icon={getDriveIcon(drive.driveType)}
              isActive={currentPath === drive.path}
              hasChildren={true}
              isExpanded={expandedDrives.has(drive.path)}
              onNavigate={onNavigate}
              onToggle={() => toggleDrive(drive.path)}
            >
              {expandedDrives.has(drive.path) && (
                <FolderTree
                  path={drive.path}
                  currentPath={currentPath}
                  onNavigate={onNavigate}
                />
              )}
            </TreeNode>
          ))}
        </div>
      </div>
    </div>
  );
}
