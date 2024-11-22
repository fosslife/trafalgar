import { IconClipboard, IconFolderPlus, IconTrash } from "@tabler/icons-react";

import { IconFilePlus } from "@tabler/icons-react";
import { Menu } from "@mantine/core";
import { IconCopy, IconCursorText, IconCut } from "@tabler/icons-react";
import { MenuAction } from "../..";

interface ContextMenuProps {
  contextMenuPosition: { x: number; y: number } | null;
  closeContextMenu: () => void;
  selectedItems: Set<string>;
  handleMenuAction: (action: MenuAction) => void;
}

export function ContextMenu({
  contextMenuPosition,
  closeContextMenu,
  selectedItems,
  handleMenuAction,
}: ContextMenuProps) {
  return (
    <Menu
      opened={contextMenuPosition !== null}
      onClose={closeContextMenu}
      position="right-start"
      offset={4}
      withArrow={false}
      styles={{
        dropdown: {
          position: "fixed",
          left: contextMenuPosition?.x,
          top: contextMenuPosition?.y,
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
              {selectedItems.size} item{selectedItems.size > 1 ? "s" : ""} selected
            </Menu.Label>
            <Menu.Item onClick={() => handleMenuAction("copy")} leftSection={<IconCopy size={16} />}>
              Copy
            </Menu.Item>
            <Menu.Item onClick={() => handleMenuAction("cut")} leftSection={<IconCut size={16} />}>
              Cut
            </Menu.Item>
            {selectedItems.size === 1 && (
              <Menu.Item onClick={() => handleMenuAction("rename")} leftSection={<IconCursorText size={16} />}>
                Rename
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconTrash size={16} />}
              color="red"
              onClick={() => handleMenuAction("moveToTrash")}
            >
              Move to Trash
            </Menu.Item>
            <Menu.Item onClick={() => handleMenuAction("delete")} leftSection={<IconTrash size={16} />} color="red">
              Delete
            </Menu.Item>
          </>
        ) : (
          // New item operations

          <>
            <Menu.Item onClick={() => handleMenuAction("paste")} leftSection={<IconClipboard size={16} />}>
              Paste
            </Menu.Item>
            <Menu.Label>Create New</Menu.Label>
            <Menu.Item onClick={() => handleMenuAction("newFolder")} leftSection={<IconFolderPlus size={16} />}>
              New Folder
            </Menu.Item>
            <Menu.Item onClick={() => handleMenuAction("newFile")} leftSection={<IconFilePlus size={16} />}>
              New File
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

// TODO: add "open" option when selectedfile ===1 and !folder
