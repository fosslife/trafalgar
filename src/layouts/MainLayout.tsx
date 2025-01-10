import { ReactNode, useEffect, useState } from "react";
import { motion } from "motion/react";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  House,
  Folder,
  Image,
  MusicNote,
  HardDrive,
  CaretRight,
  Star,
} from "@phosphor-icons/react";
import {
  join,
  sep,
  homeDir,
  downloadDir,
  documentDir,
  pictureDir,
} from "@tauri-apps/api/path";
import { readDir } from "@tauri-apps/plugin-fs";
import { TreeView } from "../components/TreeView";

interface MainLayoutProps {
  children: ReactNode;
  onOutsideClick?: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface Drive {
  name: string;
  path: string;
}

export function MainLayout({
  children,
  onOutsideClick,
  currentPath,
  onNavigate,
}: MainLayoutProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-60 flex-shrink-0 border-r border-surface-200 overflow-y-auto">
        <TreeView currentPath={currentPath} onNavigate={onNavigate} />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CollapsibleSection({
  title,
  children,
  open,
  onOpenChange,
}: CollapsibleSectionProps) {
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange}>
      <Collapsible.Trigger className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider hover:bg-surface-100">
        <CaretRight
          className={`w-3 h-3 mr-1 transition-transform ${
            open ? "transform rotate-90" : ""
          }`}
        />
        {title}
      </Collapsible.Trigger>
      <Collapsible.Content className="space-y-1 px-3 pb-2">
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={onClick}
      className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg
        text-sm transition-colors text-left
        ${
          active
            ? "bg-primary-50 text-primary-600"
            : "hover:bg-surface-100 text-gray-600"
        }`}
    >
      <span className={active ? "text-primary-500" : "text-gray-500"}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </motion.button>
  );
}
