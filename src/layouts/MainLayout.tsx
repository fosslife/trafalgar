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
    <div className="h-screen w-full bg-white flex">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 h-screen border-r border-gray-200 p-4 bg-gray-50"
      >
        <nav className="space-y-2">
          <NavItem icon={<House weight="fill" />} label="Home" />
          <NavItem icon={<Folder weight="fill" />} label="Documents" />
          <NavItem icon={<Image weight="fill" />} label="Pictures" />
          <NavItem icon={<MusicNote weight="fill" />} label="Music" />
        </nav>
      </motion.div>

      {/* Main content - make it flex and fill available space */}
      <main className="flex-1 flex flex-col p-3">{children}</main>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
}

function NavItem({ icon, label }: NavItemProps) {
  return (
    <motion.div
      whileHover={{ x: 5 }}
      className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-white cursor-pointer"
    >
      <span className="text-gray-600">{icon}</span>
      <span className="text-gray-700 text-sm">{label}</span>
    </motion.div>
  );
}
