import {
  Box,
  Group,
  Stack,
  Text,
  Loader,
  Alert,
  Menu,
  Table,
} from "@mantine/core";
import { useDirectory } from "@/hooks/useDirectory";
import {
  IconAlertCircle,
  IconFolder,
  IconFile,
  IconFileText,
  IconFileCode,
  IconFileZip,
  IconFileMusic,
  IconVideo,
  IconLayoutCollage,
  IconCopy,
  IconCut,
  IconFolderPlus,
  IconFilePlus,
  IconTrash,
  IconCursorText,
} from "@tabler/icons-react";
import { DirEntry } from "@tauri-apps/plugin-fs";
import { NavigationBar } from "./NavigationBar";
import { useNavigate } from "react-router-dom";

import classes from "./FileExplorer.module.css";
import { useEffect, useState } from "react";
import { FileItem, transformEntries } from "@/lib/fileUtils";

// Helper function to determine file icon
function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "txt":
    case "md":
      return <IconFileText size={16} color="#868e96" />;
    case "js":
    case "ts":
    case "jsx":
    case "tsx":
    case "py":
    case "rs":
      return <IconFileCode size={16} color="#228be6" />;
    case "zip":
    case "rar":
    case "7z":
      return <IconFileZip size={16} color="#fab005" />;
    case "mp3":
    case "wav":
    case "ogg":
      return <IconFileMusic size={16} color="#e64980" />;
    case "mp4":
    case "mkv":
    case "avi":
      return <IconVideo size={16} color="#7048e8" />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return <IconLayoutCollage size={16} color="#40c057" />;
    default:
      return <IconFile size={16} color="#868e96" />;
  }
}

interface FileExplorerProps {
  currentPath: string;
  onPathChange: (newPath: string) => void;
}

export function FileExplorer({ currentPath, onPathChange }: FileExplorerProps) {
  const { entries, isLoading, error } = useDirectory(currentPath);
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [lastSelectedItem, setLastSelectedItem] = useState<string | null>(null);
  const [fileItems, setFileItems] = useState<FileItem[]>([]);

  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const canGoBack = window.history.length > 1;
  const canGoForward =
    window.history.length > 1 &&
    window.history.state &&
    window.history.state.idx < window.history.length - 1;

  const handleBack = () => navigate(-1);
  const handleForward = () => navigate(1);

  useEffect(() => {
    if (entries) {
      transformEntries(entries, currentPath)
        .then(setFileItems)
        .catch(console.error);
    }
  }, [entries, currentPath]);

  const handleDoubleClick = (item: FileItem) => {
    if (item.isDirectory) {
      const newPath =
        currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`;
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

  if (isLoading) {
    return (
      <Box p="md">
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        variant="light"
        color="red"
        title="Error"
        icon={<IconAlertCircle size={16} />}
      >
        {error.message}
      </Alert>
    );
  }

  return (
    <Stack
      gap={0}
      onClick={handleBackgroundClick}
      onContextMenu={(e) => handleContextMenu(e)}
    >
      <NavigationBar
        path={currentPath}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={handleBack}
        onForward={handleForward}
        onPathChange={onPathChange}
      />
      <Table.ScrollContainer minWidth={700} style={{ height: "100%" }}>
        <Table highlightOnHover highlightOnHoverColor="blue.1" stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: "40%" }}>Name</Table.Th>
              <Table.Th style={{ width: "15%" }}>Size</Table.Th>
              <Table.Th style={{ width: "15%" }}>Type</Table.Th>
              <Table.Th style={{ width: "30%" }}>Modified</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {fileItems.map((item) => (
              <Table.Tr
                key={item.name}
                className={selectedItems.has(item.name) ? classes.selected : ""}
                onClick={(e) => handleRowClick(item, e)}
                onDoubleClick={() => handleDoubleClick(item)}
              >
                <Table.Td>
                  <Group gap="sm" wrap="nowrap">
                    {item.isDirectory ? (
                      <IconFolder size={16} color="#fab005" />
                    ) : (
                      getFileIcon(item.name)
                    )}
                    <Text size="sm" truncate="end">
                      {item.name}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {item.size}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {item.type}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {item.modified}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Menu
        opened={contextMenuPosition !== null}
        onClose={closeContextMenu}
        position="right-start"
        offset={4}
        withArrow={false}
        styles={{
          dropdown: {
            position: "fixed",
            left: contextMenuPosition?.x ?? 0,
            top: contextMenuPosition?.y ?? 0,
          },
        }}
      >
        <Menu.Target>
          <div style={{ display: "none" }} />
        </Menu.Target>
        <Menu.Dropdown>
          {selectedItems.size > 0 ? (
            // File/Folder operations
            <>
              <Menu.Label>
                {selectedItems.size} item{selectedItems.size > 1 ? "s" : ""}{" "}
                selected
              </Menu.Label>
              <Menu.Item leftSection={<IconCopy size={16} />}>Copy</Menu.Item>
              <Menu.Item leftSection={<IconCut size={16} />}>Cut</Menu.Item>
              <Menu.Item leftSection={<IconCursorText size={16} />}>
                Rename
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<IconTrash size={16} />} color="red">
                Delete
              </Menu.Item>
            </>
          ) : (
            // New item operations
            <>
              <Menu.Label>Create New</Menu.Label>
              <Menu.Item leftSection={<IconFolderPlus size={16} />}>
                New Folder
              </Menu.Item>
              <Menu.Item leftSection={<IconFilePlus size={16} />}>
                New File
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    </Stack>
  );
}
