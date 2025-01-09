import { motion, AnimatePresence } from "motion/react";
import { MenuItem } from "../contexts/ContextMenuContext";
import { Menu } from "./Menu";

interface ContextMenuProps {
  show: boolean;
  position: { x: number; y: number };
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({
  show,
  position,
  items,
  onClose,
}: ContextMenuProps) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <div className="fixed inset-0" onClick={onClose} />
          <motion.div
            key="context-menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48 z-50"
            style={{ left: position.x, top: position.y }}
          >
            {items.map((item) => (
              <div key={item.id}>
                {item.divider ? (
                  <Menu.Divider />
                ) : (
                  <Menu.Item
                    icon={item.icon}
                    label={item.label}
                    shortcut={item.shortcut}
                    onClick={() => {
                      item.onClick();
                      onClose();
                    }}
                    disabled={item.disabled}
                  />
                )}
              </div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
