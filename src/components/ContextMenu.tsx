import { useEffect, useRef } from "react";
import { useContextMenu } from "../contexts/ContextMenuContext";
import {
  FolderPlus,
  FilePlus,
  Copy,
  Scissors,
  Clipboard,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";

interface ContextMenuProps {
  clipboardFiles: { type: "copy" | "cut"; files: string[] } | null;
  onNewFolder: () => void;
  onNewFile: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function ContextMenu({
  clipboardFiles,
  onNewFolder,
  onNewFile,
  onCopy,
  onCut,
  onPaste,
  onRename,
  onDelete,
}: ContextMenuProps) {
  const { menuState, closeMenu } = useContextMenu();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeMenu]);

  if (!menuState.isOpen) return null;

  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
    disabled = false,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={() => {
        onClick();
        closeMenu();
      }}
      disabled={disabled}
      className={`w-full flex items-center space-x-2 px-3 py-2 text-sm
        ${
          disabled
            ? "text-gray-400 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-100"
        }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{
          position: "fixed",
          left: menuState.position.x,
          top: menuState.position.y,
        }}
        className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px]"
      >
        {menuState.type === "default" ? (
          <>
            <MenuItem
              icon={FolderPlus}
              label="New Folder"
              onClick={onNewFolder}
            />
            <MenuItem icon={FilePlus} label="New File" onClick={onNewFile} />
            <div className="my-1 border-b border-gray-200" />
            <MenuItem
              icon={Clipboard}
              label="Paste"
              onClick={onPaste}
              disabled={!clipboardFiles}
            />
          </>
        ) : (
          <>
            <MenuItem icon={Copy} label="Copy" onClick={onCopy} />
            <MenuItem icon={Scissors} label="Cut" onClick={onCut} />
            <MenuItem icon={PencilSimple} label="Rename" onClick={onRename} />
            <div className="my-1 border-b border-gray-200" />
            <MenuItem icon={Trash} label="Delete" onClick={onDelete} />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
