import { Box, Stack, Alert } from "@mantine/core";
import { useDirectory } from "@/hooks/useDirectory";
import { IconAlertCircle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

import { DirEntry } from "@tauri-apps/plugin-fs";
import { NavigationBar } from "./NavigationBar";
import { useNavigate } from "react-router-dom";

import { useEffect, useState } from "react";
import {
  copyToClipboard,
  createNewFile,
  createNewFolder,
  cutToClipboard,
  deleteFiles,
  FileItem,
  isValidFileName,
  moveToTrash,
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

interface FileExplorerProps {
  currentPath: string;
  onPathChange: (newPath: string) => void;
}

export type MenuAction = "copy" | "cut" | "paste" | "delete" | "moveToTrash" | "rename" | "newFolder" | "newFile";

export function FileExplorer({ currentPath, onPathChange }: FileExplorerProps) {
  const { entries, isLoading, error, refresh: refreshDirectory } = useDirectory(currentPath);
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [lastSelectedItem, setLastSelectedItem] = useState<string | null>(null);
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<FileItem[]>([]);
  const [deleteModal, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const ref = useClickOutside(() => {
    if (!contextMenuPosition) {
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

  const handleDoubleClick = (item: FileItem) => {
    if (item.isDirectory) {
      const newPath = currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`;
      onPathChange(newPath);
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
  });

  const [viewMode, setViewMode] = useLocalStorage<"list" | "grid">({
    key: "viewMode",
    defaultValue: "grid",
  });

  if (isLoading) {
    return <Box p="md">{/* don't show anything, not even loader or spinner */}</Box>;
  }

  if (error) {
    return (
      <Alert variant="light" color="red" title="Error" icon={<IconAlertCircle size={16} />}>
        {error.message}
      </Alert>
    );
  }

  return (
    <Stack
      flex={1}
      gap={0}
      onClick={handleBackgroundClick}
      h="100%"
      onContextMenu={(e) => handleContextMenu(e)}
      ref={ref}
    >
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
      {fileItems.length === 0 ? (
        <Box p="md">Empty directory</Box>
      ) : viewMode === "list" ? (
        <ListView
          handleDoubleClick={handleDoubleClick}
          handleRowClick={handleRowClick}
          fileItems={fileItems}
          selectedItems={selectedItems}
          editingItem={editingItem}
          editValue={editValue}
          handleRenameSubmit={handleRenameSubmit}
          setEditingItem={setEditingItem}
          setEditValue={setEditValue}
        />
      ) : (
        <GridView
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
