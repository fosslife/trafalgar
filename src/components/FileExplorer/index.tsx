import { Box, Stack, Alert, LoadingOverlay, Group } from "@mantine/core";
import { useDirectory } from "@/hooks/useDirectory";
import { IconAlertCircle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

import { DirEntry } from "@tauri-apps/plugin-fs";
import { NavigationBar } from "./NavigationBar";
import { useNavigate } from "react-router-dom";

import { useEffect, useState, useMemo } from "react";
import {
  copyToClipboard,
  createNewFile,
  createNewFolder,
  cutToClipboard,
  deleteFiles,
  FileItem,
  isValidFileName,
  moveToTrash,
  openWithDefaultApp,
  pasteFromClipboard,
  renameItem,
  transformEntries,
} from "@/lib/fileUtils";
import { useDisclosure, useClickOutside, useLocalStorage } from "@mantine/hooks";
import { DeleteModal } from "./components/modals/DeleteModal";
import { ContextMenu } from "./components/Menu/ContextMenu";
import { GridView } from "./view/GridView";
import { ListView } from "./view/ListView";
import { useFileExplorerShortcuts } from "@/hooks/useFileExplorerShortcuts";
import { join } from "@tauri-apps/api/path";
import { FilePreview } from "./components/Preview/FilePreview";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

interface FileExplorerProps {
  currentPath: string;
  onPathChange: (newPath: string) => void;
}

export type MenuAction =
  | "copy"
  | "cut"
  | "paste"
  | "delete"
  | "moveToTrash"
  | "rename"
  | "newFolder"
  | "newFile"
  | "open"
  | "preview";

export type SortField = "name" | "size" | "type" | "modified" | "created";
export type SortDirection = "asc" | "desc";

// TODO: take these somewhere in the config
const codeExtensions = [
  ".js",
  ".mjs",
  ".ts",
  ".css",
  ".json",
  ".md",
  ".py",
  ".rs",
  ".go",
  ".sh",
  ".html",
  ".xml",
  ".yaml",
  ".yml",
  ".toml",
];
const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"];
const videoExtensions = [".mp4", ".mov"];
const audioExtensions = [".mp3", ".wav"];
const pdfExtensions = [".pdf"];

export function FileExplorer({ currentPath, onPathChange }: FileExplorerProps) {
  const { entries, isLoading, error, refresh: refreshDirectory } = useDirectory(currentPath);
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [lastSelectedItem, setLastSelectedItem] = useState<string | null>(null);
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<FileItem[]>([]);
  const [deleteModal, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewFileType, setPreviewFileType] = useState<"image" | "video" | "audio" | "pdf" | "code" | null>(null);

  const ref = useClickOutside(() => {
    console.log("Click outside", previewPath, contextMenuPosition);
    if (!contextMenuPosition) {
      if (previewPath) {
        return;
      }
      setSelectedItems(new Set());
    }
  });

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const canGoBack = window.history.length > 1;
  const canGoForward =
    window.history.length > 1 && window.history.state && window.history.state.idx < window.history.length - 1;

  const handleBack = () => navigate(-1);
  const handleForward = () => navigate(1);

  useEffect(() => {
    if (entries) {
      transformEntries(entries, currentPath).then(setFileItems).catch(console.error);
    }
  }, [entries, currentPath]);

  const handleDoubleClick = async (item: FileItem) => {
    if (item.isDirectory) {
      const newPath = currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`;
      onPathChange(newPath);
    } else {
      const filePath = await join(currentPath, item.name);
      await openWithDefaultApp(filePath);
    }
  };

  // Clear selection when clicking empty space
  const handleBackgroundClick = (event: React.MouseEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
      setSelectedItems(new Set());
      setLastSelectedItem(null);
    }
  };

  const handleStartRename = (item: FileItem) => {
    setEditingItem(item.name);
    setEditValue(item.name);
  };

  const handleContextMenu = (event: React.MouseEvent, entry?: DirEntry) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });

    // If right-clicking an unselected item, select it
    if (entry && !selectedItems.has(entry.name)) {
      if (!event.ctrlKey && !event.metaKey) {
        setSelectedItems(new Set([entry.name]));
      }
    }
  };

  const closeContextMenu = () => {
    setContextMenuPosition(null);
  };

  const handleRowClick = (item: FileItem, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent bubbling to background

    setPreviewPath(null);

    if (event.shiftKey && lastSelectedItem) {
      // Range selection
      const startIdx = fileItems.findIndex((i) => i.name === lastSelectedItem);
      const endIdx = fileItems.findIndex((i) => i.name === item.name);

      if (startIdx !== -1 && endIdx !== -1) {
        const start = Math.min(startIdx, endIdx);
        const end = Math.max(startIdx, endIdx);

        const rangeSelection = new Set<string>(
          event.ctrlKey || event.metaKey
            ? selectedItems // Keep existing selection if Ctrl/Cmd is pressed
            : new Set() // Otherwise start fresh
        );

        for (let i = start; i <= end; i++) {
          rangeSelection.add(fileItems[i].name);
        }

        setSelectedItems(rangeSelection);
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Toggle selection with Ctrl/Cmd
      const newSelection = new Set(selectedItems);
      if (newSelection.has(item.name)) {
        newSelection.delete(item.name);
      } else {
        newSelection.add(item.name);
      }
      setSelectedItems(newSelection);
      setLastSelectedItem(item.name);
    } else {
      // Single click without modifiers
      if (selectedItems.size === 1 && selectedItems.has(item.name)) {
        // Clicking the only selected item again
        setSelectedItems(new Set());
        setLastSelectedItem(null);
      } else {
        // Selecting a single item
        setSelectedItems(new Set([item.name]));
        setLastSelectedItem(item.name);
        handlePreview(item);
      }
    }
  };

  const handleCreateNewItem = async (type: "file" | "folder", defaultName: string) => {
    try {
      // Find unique name if default name exists
      let newName = defaultName;
      let counter = 1;
      while (fileItems.some((item) => item.name === newName)) {
        newName = `${defaultName} (${counter})`;
        counter++;
      }

      const success =
        type === "file" ? await createNewFile(currentPath, newName) : await createNewFolder(currentPath, newName);

      if (success) {
        await refreshDirectory();
        // Start rename immediately
        setSelectedItems(new Set([newName]));
        setEditingItem(newName);
        setEditValue(newName);
      }
    } catch (error) {
      notifications.show({
        title: "Creation Failed",
        message: error instanceof Error ? error.message : "An error occurred",
        color: "red",
      });
    }
  };

  const handleMenuAction = async (action: MenuAction) => {
    const selectedFiles = fileItems.filter((item) => selectedItems.has(item.name));

    switch (action) {
      case "copy": {
        const copiedCount = await copyToClipboard(selectedFiles, currentPath);
        notifications.show({
          title: "Copy",
          message: `${copiedCount} item(s) copied to clipboard`,
          color: "blue",
        });
        break;
      }

      case "cut": {
        const cutCount = await cutToClipboard(selectedFiles, currentPath);
        notifications.show({
          title: "Cut",
          message: `${cutCount} item(s) ready to move`,
          color: "yellow",
        });
        break;
      }
      case "paste": {
        const success = await pasteFromClipboard(currentPath);
        if (success) {
          notifications.show({
            title: "Paste",
            message: "Items pasted successfully",
            color: "green",
          });
          // Refresh the directory
          await refreshDirectory();
        } else {
          notifications.show({
            title: "Paste Failed",
            message: "Could not paste items",
            color: "red",
          });
        }
        break;
      }

      case "delete": {
        confirmDelete(selectedFiles);
        break;
      }

      // In handleMenuAction:
      case "moveToTrash": {
        try {
          const success = await moveToTrash(selectedFiles, currentPath);
          if (success) {
            notifications.show({
              title: "Moved to Trash",
              message: `${selectedFiles.length} item(s) moved to trash`,
              color: "blue",
            });
            setSelectedItems(new Set());
            await refreshDirectory();
          }
        } catch (error) {
          notifications.show({
            title: "Operation Failed",
            message: error instanceof Error ? error.message : "Could not move items to trash",
            color: "red",
          });
        }
        break;
      }

      case "rename": {
        if (selectedFiles.length === 1) {
          handleStartRename(selectedFiles[0]);
        }
        break;
      }
      case "newFile": {
        handleCreateNewItem("file", "New File");
        break;
      }

      case "newFolder": {
        handleCreateNewItem("folder", "New Folder");
        break;
      }

      case "open": {
        const selectedFile = fileItems.find((item) => selectedItems.has(item.name));
        if (selectedFile && !selectedFile.isDirectory) {
          const filePath = await join(currentPath, selectedFile.name);
          const success = await openWithDefaultApp(filePath);
          if (!success) {
            notifications.show({
              title: "Error",
              message: "Failed to open file",
              color: "red",
            });
          }
        }
        break;
      }

      case "preview": {
        const selectedFile = fileItems.find((item) => selectedItems.has(item.name));
        if (selectedFile) {
          handlePreview(selectedFile);
        }
        break;
      }
    }

    setContextMenuPosition(null);
  };

  const handleDelete = async () => {
    if (filesToDelete.length === 0) return;

    try {
      const success = await deleteFiles(filesToDelete, currentPath);
      if (success) {
        notifications.show({
          title: "Delete",
          message: `${filesToDelete.length} item(s) deleted successfully`,
          color: "green",
        });
        setSelectedItems(new Set());
        await refreshDirectory();
      } else {
        notifications.show({
          title: "Delete Failed",
          message: "Could not delete some items",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Delete Failed",
        message: error instanceof Error ? error.message : "An error occurred",
        color: "red",
      });
    } finally {
      setFilesToDelete([]);
      closeDeleteModal();
    }
  };

  const handleRenameSubmit = async (item: FileItem, newName: string) => {
    if (item.name === newName || !newName) {
      setEditingItem(null);
      return;
    }

    const validation = isValidFileName(newName);
    if (!validation.valid) {
      notifications.show({
        title: "Invalid Name",
        message: validation.error,
        color: "red",
      });
      return;
    }

    try {
      const success = await renameItem(currentPath, item.name, newName);
      if (success) {
        notifications.show({
          title: "Renamed",
          message: `Successfully renamed to ${newName}`,
          color: "green",
        });
        setSelectedItems(new Set()); // Select the renamed item
        await refreshDirectory();
      } else {
        notifications.show({
          title: "Rename Failed",
          message: "Could not rename the item",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Rename Failed",
        message: error instanceof Error ? error.message : "An error occurred",
        color: "red",
      });
    }
    setEditingItem(null);
  };

  const handlePreview = async (item: FileItem) => {
    if (isPreviewable(item.name) && !item.isDirectory) {
      const filePath = await join(currentPath, item.name);
      setPreviewPath(filePath);
      const fileType = getFileType(item.name);
      setPreviewFileType(fileType);
    }
  };

  const confirmDelete = (files: FileItem[]) => {
    setFilesToDelete(files);
    openDeleteModal();
  };

  const handleSelectAll = () => {
    const allNames = fileItems.map((item) => item.name);
    setSelectedItems(new Set(allNames));
  };

  // Keyboard shortcuts using useHotkeys
  useFileExplorerShortcuts({
    selectedItems,
    handleMenuAction,
    fileItems,
    refreshDirectory,
    confirmDelete,
    handleStartRename,
    handleSelectAll,
    handlePreview,
  });

  const [viewMode, setViewMode] = useLocalStorage<"list" | "grid">({
    key: "viewMode",
    defaultValue: "grid",
  });

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedFileItems = useMemo(() => {
    return [...fileItems].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name": {
          comparison = a.name.localeCompare(b.name);
          break;
        }
        case "size": {
          // Convert size strings to numbers for comparison
          const sizeA = a.size === "--" ? -1 : parseFloat(a.size.split(" ")[0]);
          const sizeB = b.size === "--" ? -1 : parseFloat(b.size.split(" ")[0]);
          comparison = sizeA - sizeB;
          break;
        }
        case "type": {
          comparison = a.type.localeCompare(b.type);
          break;
        }
        case "modified": {
          comparison = a.modified.localeCompare(b.modified);
          break;
        }

        case "created": {
          comparison = a.created.localeCompare(b.created);
          break;
        }
      }

      // Always put directories first
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [fileItems, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      // New field, set to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const isPreviewable = (filename: string) => {
    const previewableExtensions = [
      ...codeExtensions,
      ...imageExtensions,
      ...videoExtensions,
      ...audioExtensions,
      ...pdfExtensions,
    ];

    // if a file is config file like .env or .prettierrc, it should be previewable
    if (filename.startsWith(".") && filename.length > 1) {
      return true;
    }

    const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
    return previewableExtensions.includes(ext);
  };

  if (isLoading) {
    return (
      <Box p="md">
        <LoadingOverlay />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert variant="light" color="red" title="Error" icon={<IconAlertCircle size={16} />}>
        {error.message}
      </Alert>
    );
  }

  // FIXME: ref is not working, need to figure out why.
  return (
    <Stack onClick={handleBackgroundClick} h="100%" onContextMenu={(e) => handleContextMenu(e)} ref={ref}>
      <NavigationBar
        path={currentPath}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={handleBack}
        onForward={handleForward}
        onPathChange={onPathChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <Group wrap="nowrap" h="100%">
        <PanelGroup direction="horizontal" autoSaveId="file-explorer">
          <Panel>
            {viewMode === "list" ? (
              <ListView
                sortField={sortField}
                sortDirection={sortDirection}
                handleDoubleClick={handleDoubleClick}
                handleRowClick={handleRowClick}
                fileItems={sortedFileItems}
                selectedItems={selectedItems}
                editingItem={editingItem}
                editValue={editValue}
                handleRenameSubmit={handleRenameSubmit}
                setEditingItem={setEditingItem}
                setEditValue={setEditValue}
                onSort={handleSort}
              />
            ) : (
              <GridView
                // FIXME: sorted file items for grid view?
                fileItems={fileItems}
                selectedItems={selectedItems}
                handleRowClick={handleRowClick}
                handleDoubleClick={handleDoubleClick}
                handleContextMenu={handleContextMenu}
                handleRenameSubmit={handleRenameSubmit}
                setEditingItem={setEditingItem}
                setEditValue={setEditValue}
                editingItem={editingItem}
                editValue={editValue}
              />
            )}
          </Panel>
          <PanelResizeHandle style={{ backgroundColor: "gainsboro", width: "1px" }} />
          <Panel defaultSize={25} maxSize={40}>
            {selectedItems.size === 1 && previewPath ? (
              <FilePreview fileType={previewFileType} filePath={previewPath} />
            ) : null}
          </Panel>
        </PanelGroup>
      </Group>

      <ContextMenu
        contextMenuPosition={contextMenuPosition}
        closeContextMenu={closeContextMenu}
        selectedItems={selectedItems}
        handleMenuAction={handleMenuAction}
      />

      <DeleteModal
        deleteModal={deleteModal}
        closeDeleteModal={closeDeleteModal}
        filesToDelete={filesToDelete}
        handleDelete={handleDelete}
      />
    </Stack>
  );
}

function getFileType(filePath: string) {
  const ext = `.${filePath.split(".")[1].toLowerCase()}`;

  console.log("Getting file type for", imageExtensions, ext);

  if (codeExtensions.includes(ext)) {
    console.log("Code extension");
    return "code";
  }

  if (imageExtensions.includes(ext)) {
    console.log("Image extension");
    return "image";
  }

  if (videoExtensions.includes(ext)) {
    console.log("Video extension");
    return "video";
  }

  if (audioExtensions.includes(ext)) {
    console.log("Audio extension");
    return "audio";
  }

  if (pdfExtensions.includes(ext)) {
    console.log("PDF extension");
    return "pdf";
  }

  console.log("Unknown extension");
  return null;
}
