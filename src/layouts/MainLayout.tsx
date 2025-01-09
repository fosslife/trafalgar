import { ReactNode } from "react";
import { motion } from "motion/react";
import { House, Folder, Image, MusicNote } from "@phosphor-icons/react";

interface MainLayoutProps {
  children: ReactNode;
  onOutsideClick?: () => void;
}

export function MainLayout({ children, onOutsideClick }: MainLayoutProps) {
  const handleContainerClick = (event: React.MouseEvent) => {
    if (
      event.target === event.currentTarget ||
      (event.currentTarget as HTMLElement).contains(event.target as HTMLElement)
    ) {
      onOutsideClick?.();
    }
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-48 bg-surface-50 border-r border-surface-200 flex flex-col"
      >
        {/* Quick Access Section */}
        <div className="p-3">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Quick Access
          </h2>
          <nav className="space-y-1">
            <NavItem icon={<House />} label="Home" active />
            <NavItem icon={<Folder />} label="Documents" />
            <NavItem icon={<Image />} label="Pictures" />
            <NavItem icon={<MusicNote />} label="Music" />
          </nav>
        </div>

        {/* Drives Section */}
        <div className="p-3 border-t border-surface-200">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Drives
          </h2>
          <nav className="space-y-1">
            <NavItem icon={<Folder />} label="C:" />
            <NavItem icon={<Folder />} label="D:" />
          </nav>
        </div>

        {/* Favorites Section */}
        <div className="p-3 border-t border-surface-200">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Favorites
          </h2>
          <nav className="space-y-1">
            <NavItem icon={<Folder />} label="Downloads" />
            <NavItem icon={<Folder />} label="Projects" />
          </nav>
        </div>

        {/* Expandable space at bottom */}
        <div className="flex-1" />

        {/* Optional: Bottom section for settings/help */}
        <div className="p-3 border-t border-surface-200">
          <nav className="space-y-1">
            <NavItem icon={<Folder />} label="Settings" />
          </nav>
        </div>
      </motion.div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 bg-white" onClick={handleContainerClick}>
        {children}
      </main>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

function NavItem({ icon, label, active }: NavItemProps) {
  return (
    <motion.div
      whileHover={{ x: 2 }}
      className={`flex items-center space-x-2 px-2 py-1.5 rounded-lg cursor-pointer
        text-sm transition-colors
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
    </motion.div>
  );
}
