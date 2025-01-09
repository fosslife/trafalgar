import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FolderPlus, FilePlus, CaretDown } from "@phosphor-icons/react";

interface NewItemDropdownProps {
  onNewFolder: () => void;
  onNewFile: () => void;
}

export function NewItemDropdown({
  onNewFolder,
  onNewFile,
}: NewItemDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
  }) => (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={() => {
        onClick();
        setIsOpen(false);
      }}
      className="w-full flex items-center space-x-2 px-3 py-2 text-sm
        text-gray-700 hover:bg-surface-50 transition-colors"
    >
      <Icon className="w-4 h-4 text-gray-400" />
      <span>{label}</span>
    </motion.button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-surface-50 
          rounded-lg hover:bg-surface-100 transition-colors text-gray-600"
      >
        <FolderPlus className="w-4 h-4" />
        <span>New</span>
        <CaretDown
          className={`w-3 h-3 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg 
              border border-surface-200 py-1 z-50"
          >
            <MenuItem
              icon={FolderPlus}
              label="New Folder"
              onClick={onNewFolder}
            />
            <MenuItem icon={FilePlus} label="New File" onClick={onNewFile} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
