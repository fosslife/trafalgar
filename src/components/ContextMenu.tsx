import { useContextMenu } from "../contexts/ContextMenuContext";
import { useFileOperations } from "../contexts/FileOperationsContext";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderPlus,
  FilePlus,
  Copy,
  Scissors,
  Clipboard,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useRef, useLayoutEffect, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

interface ContextMenuProps {
  onNewFolder: () => void;
  onNewFile: () => void;
  onRename: () => void;
  selectedFiles: Set<string>;
}

export function ContextMenu({
  onNewFolder,
  onNewFile,
  onRename,
  selectedFiles,
}: ContextMenuProps) {
  const { menuState, closeMenu, updatePosition } = useContextMenu();
  const {
    copy,
    cut,
    paste,
    delete: deleteFiles,
    clipboardFiles,
  } = useFileOperations();
  const menuRef = useRef<HTMLDivElement>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Use layout effect to adjust position immediately after first render
  useLayoutEffect(() => {
    if (!menuRef.current || !menuState.isOpen) return;

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = menuState.position.x;
    let y = menuState.position.y;

    // Adjust horizontal position if menu would go off-screen
    if (x + menuRect.width > viewportWidth) {
      x = viewportWidth - menuRect.width - 8;
    }

    // Adjust vertical position if menu would go off-screen
    if (y + menuRect.height > viewportHeight) {
      y = viewportHeight - menuRect.height - 8;
    }

    // Ensure menu doesn't go off the left or top edge
    x = Math.max(8, x);
    y = Math.max(8, y);

    // Update position if it changed
    if (x !== menuState.position.x || y !== menuState.position.y) {
      updatePosition({ x, y });
    }
  }, [menuState.isOpen, menuState.position.x, menuState.position.y]);

  const handleCopy = () => {
    if (menuState.targetFile && menuState.path) {
      copy([menuState.targetFile], menuState.path);
      closeMenu();
    }
  };

  const handleCut = () => {
    if (menuState.targetFile && menuState.path) {
      cut([menuState.targetFile], menuState.path);
      closeMenu();
    }
  };

  const handlePaste = async () => {
    if (menuState.path) {
      await paste(menuState.path);
      closeMenu();
    }
  };

  const handleDelete = async () => {
    console.log("Delete triggered", {
      targetFile: menuState.targetFile,
      path: menuState.path,
      selectedFiles: selectedFiles,
    });

    if (menuState.path) {
      const filesToDelete =
        selectedFiles.size > 0
          ? Array.from(selectedFiles)
          : menuState.targetFile
          ? [menuState.targetFile]
          : [];

      console.log("Files to delete:", filesToDelete);

      if (filesToDelete.length === 0) {
        console.log("No files to delete");
        return;
      }

      closeMenu();

      setConfirmDialog({
        show: true,
        title: "Delete Files?",
        message:
          filesToDelete.length > 1
            ? `Are you sure you want to delete ${filesToDelete.length} items?`
            : `Are you sure you want to delete "${filesToDelete[0]}"?`,
        onConfirm: async () => {
          try {
            console.log("Delete confirmed");
            await deleteFiles(filesToDelete, menuState.path);
          } catch (error) {
            console.error("Error in delete operation:", error);
          }
          setConfirmDialog(null);
        },
      });
    }
  };

  const handleRename = () => {
    if (menuState.targetFile) {
      onRename();
      closeMenu();
    }
  };

  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
    disabled = false,
    destructive = false,
    shortcut,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
    shortcut?: string;
  }) => (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center px-3 py-2 text-sm rounded-lg
        ${
          disabled
            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
            : destructive
            ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            : "text-gray-700 dark:text-gray-200 hover:bg-surface-50 dark:hover:bg-surface-200"
        }
        transition-colors`}
    >
      <Icon className="w-4 h-4 mr-2" />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-4">
          {shortcut}
        </span>
      )}
    </motion.button>
  );

  return (
    <>
      <AnimatePresence>
        {menuState.isOpen && (
          <motion.div
            ref={menuRef}
            role="menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              left: menuState.position.x,
              top: menuState.position.y,
            }}
            className="bg-white dark:bg-surface-100 rounded-xl shadow-lg border border-surface-200 dark:border-surface-200 py-1.5 min-w-[220px]
              backdrop-blur-xl bg-white/95 dark:bg-surface-100/95"
          >
            {menuState.type === "default" ? (
              <>
                <div className="px-3 pb-2 mb-1 border-b border-surface-200 dark:border-surface-200">
                  <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500">
                    Create New
                  </h3>
                </div>
                <MenuItem
                  icon={FolderPlus}
                  label="New Folder"
                  onClick={() => {
                    onNewFolder();
                    closeMenu();
                  }}
                />
                <MenuItem
                  icon={FilePlus}
                  label="New File"
                  onClick={() => {
                    onNewFile();
                    closeMenu();
                  }}
                />
                <div className="my-1.5 border-b border-surface-200 dark:border-surface-200" />
                <MenuItem
                  icon={Clipboard}
                  label="Paste"
                  onClick={handlePaste}
                  disabled={!clipboardFiles}
                />
              </>
            ) : (
              <>
                <MenuItem icon={Copy} label="Copy" onClick={handleCopy} />
                <MenuItem icon={Scissors} label="Cut" onClick={handleCut} />
                <MenuItem
                  icon={PencilSimple}
                  label="Rename"
                  onClick={handleRename}
                />
                <div className="my-1.5 border-b border-surface-200 dark:border-surface-200" />
                <MenuItem
                  icon={Trash}
                  label="Delete"
                  onClick={handleDelete}
                  destructive
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDialog && (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
