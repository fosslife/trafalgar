import { MenuAction } from "@/components/FileExplorer";
import { FileItem } from "@/lib/fileUtils";
import { useHotkeys } from "@mantine/hooks";

interface UseFileExplorerShortcutsProps {
  selectedItems: Set<string>;
  handleMenuAction: (action: MenuAction) => void;
  fileItems: FileItem[];
  refreshDirectory: () => void;
  confirmDelete: (files: FileItem[]) => void;
  handleStartRename: (item: FileItem) => void;
  handleSelectAll: () => void;
}

export function useFileExplorerShortcuts({
  selectedItems,
  handleMenuAction,
  fileItems,
  refreshDirectory,
  confirmDelete,
  handleStartRename,
  handleSelectAll,
}: UseFileExplorerShortcutsProps) {
  useHotkeys([
    [
      "mod+C",
      () => {
        if (selectedItems.size > 0) {
          handleMenuAction("copy");
        }
      },
    ],
    [
      "mod+X",
      () => {
        if (selectedItems.size > 0) {
          handleMenuAction("cut");
        }
      },
    ],
    [
      "mod+V",
      () => {
        handleMenuAction("paste");
      },
    ],
    // Add more shortcuts as needed
    ["mod+A", handleSelectAll],
    [
      "delete",
      () => {
        if (selectedItems.size > 0) {
          handleMenuAction("delete");
        }
      },
    ],
    [
      "F5",
      () => {
        refreshDirectory();
      },
    ],
    [
      "delete",
      () => {
        if (selectedItems.size > 0) {
          const selectedFiles = fileItems.filter((item) =>
            selectedItems.has(item.name),
          );
          confirmDelete(selectedFiles);
        }
      },
    ],
    [
      "F2",
      () => {
        if (selectedItems.size === 1) {
          const selectedItem = fileItems.find((item) =>
            selectedItems.has(item.name),
          );
          if (selectedItem) {
            handleStartRename(selectedItem);
          }
        }
      },
    ],
  ]);
}
