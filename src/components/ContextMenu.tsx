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

interface ContextMenuProps {
  onNewFolder: () => void;
  onNewFile: () => void;
  onRename: () => void;
}

export function ContextMenu({
  onNewFolder,
  onNewFile,
  onRename,
}: ContextMenuProps) {
  const { menuState, closeMenu } = useContextMenu();
  const {
    copy,
    cut,
    paste,
    delete: deleteFiles,
    clipboardFiles,
  } = useFileOperations();

  const handleCopy = () => {
    if (menuState.targetFile) {
      copy([menuState.targetFile], menuState.path);
      closeMenu();
    }
  };

  const handleCut = () => {
    if (menuState.targetFile) {
      cut([menuState.targetFile], menuState.path);
      closeMenu();
    }
  };

  const handlePaste = async () => {
    await paste(menuState.path);
    closeMenu();
  };

  const handleDelete = async () => {
    if (menuState.targetFile) {
      const confirmMessage = `Are you sure you want to delete "${menuState.targetFile}"?`;
      if (window.confirm(confirmMessage)) {
        await deleteFiles([menuState.targetFile], menuState.path);
        closeMenu();
      }
    }
  };

  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
    disabled = false,
    destructive = false,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
  }) => (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center space-x-2 px-3 py-2 text-sm
        ${
          disabled
            ? "text-gray-300 cursor-not-allowed"
            : destructive
            ? "text-red-600 hover:bg-red-50"
            : "text-gray-700 hover:bg-surface-50"
        }
        transition-colors`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </motion.button>
  );

  return (
    <AnimatePresence>
      {menuState.isOpen && (
        <motion.div
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
          className="bg-white rounded-xl shadow-lg border border-surface-200 py-1.5 min-w-[220px]
            backdrop-blur-xl bg-white/95"
        >
          {menuState.type === "default" ? (
            <>
              <div className="px-3 pb-2 mb-1 border-b border-surface-200">
                <h3 className="text-xs font-medium text-gray-400">
                  Create New
                </h3>
              </div>
              <MenuItem
                icon={FolderPlus}
                label="New Folder"
                onClick={onNewFolder}
              />
              <MenuItem icon={FilePlus} label="New File" onClick={onNewFile} />
              <div className="my-1.5 border-b border-surface-200" />
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
              <MenuItem icon={PencilSimple} label="Rename" onClick={onRename} />
              <div className="my-1.5 border-b border-surface-200" />
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
  );
}
