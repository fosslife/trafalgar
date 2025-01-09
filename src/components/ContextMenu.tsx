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
      onClick={() => {
        onClick();
        closeMenu();
      }}
      disabled={disabled}
      className={`w-full flex items-center space-x-2.5 px-3 py-2 text-sm
        transition-colors
        ${
          disabled
            ? "text-gray-300 cursor-not-allowed"
            : destructive
            ? "text-red-600 hover:bg-red-50"
            : "text-gray-700 hover:bg-surface-50"
        }`}
    >
      <Icon
        className={`w-4 h-4 ${
          disabled
            ? "text-gray-300"
            : destructive
            ? "text-red-500"
            : "text-gray-400"
        }`}
      />
      <span>{label}</span>
    </motion.button>
  );

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
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
              <h3 className="text-xs font-medium text-gray-400">Create New</h3>
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
              onClick={onPaste}
              disabled={!clipboardFiles}
            />
          </>
        ) : (
          <>
            <MenuItem icon={Copy} label="Copy" onClick={onCopy} />
            <MenuItem icon={Scissors} label="Cut" onClick={onCut} />
            <MenuItem icon={PencilSimple} label="Rename" onClick={onRename} />
            <div className="my-1.5 border-b border-surface-200" />
            <MenuItem
              icon={Trash}
              label="Delete"
              onClick={onDelete}
              destructive
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
