import { motion, AnimatePresence } from "motion/react";
import {
  Copy,
  Scissors,
  Clipboard,
  Trash,
  PencilSimple,
} from "@phosphor-icons/react";

interface Position {
  x: number;
  y: number;
}

interface ContextMenuProps {
  show: boolean;
  position: Position;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onRename: () => void;
  canPaste: boolean;
  hasSelection: boolean;
}

export function ContextMenu({
  show,
  position,
  onClose,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRename,
  canPaste,
  hasSelection,
}: ContextMenuProps) {
  if (!show) return null;

  const menuItems = [
    ...(hasSelection
      ? [
          { icon: Copy, label: "Copy", onClick: onCopy },
          { icon: Scissors, label: "Cut", onClick: onCut },
          { icon: PencilSimple, label: "Rename", onClick: onRename },
          { icon: Trash, label: "Delete", onClick: onDelete },
        ]
      : []),
    { icon: Clipboard, label: "Paste", onClick: onPaste, disabled: !canPaste },
  ].filter(Boolean);

  return (
    <>
      <div className="fixed inset-0" onClick={onClose} />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48"
            style={{ left: position.x, top: position.y }}
          >
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick();
                  onClose();
                }}
                disabled={item.disabled}
                className={`w-full px-3 py-1.5 text-sm text-left flex items-center space-x-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                  item.label === "Delete" ? "text-red-600" : "text-gray-700"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
