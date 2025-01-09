import { ReactNode } from "react";
import { motion } from "motion/react";
import { House, Folder, Image, MusicNote } from "@phosphor-icons/react";

interface MainLayoutProps {
  children: ReactNode;
  onOutsideClick?: () => void;
}

export function MainLayout({ children, onOutsideClick }: MainLayoutProps) {
  const handleContainerClick = (event: React.MouseEvent) => {
    // Only trigger if clicking directly on the container or sidebar elements
    if (
      event.target === event.currentTarget ||
      (event.currentTarget as HTMLElement).contains(event.target as HTMLElement)
    ) {
      onOutsideClick?.();
    }
  };

  return (
    <div className="h-screen w-full bg-surface-50 flex">
      {/* Slim modern sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-56 h-screen bg-white border-r border-surface-200 p-3"
      >
        <div className="mb-6 px-3">
          <h1 className="text-lg font-semibold text-gray-900">Explorer</h1>
        </div>
        <nav className="space-y-1">
          <NavItem icon={<House />} label="Home" active />
          <NavItem icon={<Folder />} label="Documents" />
          <NavItem icon={<Image />} label="Pictures" />
          <NavItem icon={<MusicNote />} label="Music" />
        </nav>
      </motion.div>

      <main className="flex-1 flex flex-col p-4 overflow-hidden">
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
      className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer
        ${
          active
            ? "bg-primary-50 text-primary-600"
            : "hover:bg-surface-50 text-gray-600"
        }`}
    >
      <span className={active ? "text-primary-500" : "text-gray-500"}>
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </motion.div>
  );
}
