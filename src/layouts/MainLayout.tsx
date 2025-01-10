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
  const [drives, setDrives] = useState<Drive[]>([]);
  const [quickAccessPaths, setQuickAccessPaths] = useState<{
    home: string;
    documents: string;
    pictures: string;
    downloads: string;
  }>({
    home: "",
    documents: "",
    pictures: "",
    downloads: "",
  });

  // Add state for open sections
  const [openSections, setOpenSections] = useState<{
    [key: string]: boolean;
  }>({
    quickAccess: true,
    drives: true,
    favorites: true,
  });

  // Load drives on Windows
  useEffect(() => {
    const loadDrives = async () => {
      try {
        // On Windows, we can read the root directory to get drives
        const entries = await readDir(sep());
        const driveList = entries
          .filter((entry) => entry.isDirectory)
          .map((entry) => ({
            name: entry.name.replace(":\\", ":"),
            path: entry.name,
          }));
        setDrives(driveList);
      } catch (error) {
        console.error("Error loading drives:", error);
      }
    };

    loadDrives();
  }, []);

  // Load quick access paths
  useEffect(() => {
    const loadQuickAccessPaths = async () => {
      try {
        const [home, documents, pictures, downloads] = await Promise.all([
          homeDir(),
          documentDir(),
          pictureDir(),
          downloadDir(),
        ]);

        setQuickAccessPaths({
          home,
          documents,
          pictures,
          downloads,
        });
      } catch (error) {
        console.error("Error loading quick access paths:", error);
      }
    };

    loadQuickAccessPaths();
  }, []);

  const handleNavigation = (path: string) => {
    onNavigate(path);
  };

  return (
    <div className="flex flex-1 min-h-0">
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-48 bg-surface-50 border-r border-surface-200 flex flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto">
          {/* Quick Access Section */}
          <CollapsibleSection
            title="Quick Access"
            open={openSections.quickAccess}
            onOpenChange={(open) =>
              setOpenSections((prev) => ({ ...prev, quickAccess: open }))
            }
          >
            <NavItem
              icon={<House />}
              label="Home"
              active={currentPath === quickAccessPaths.home}
              onClick={() => handleNavigation(quickAccessPaths.home)}
            />
            <NavItem
              icon={<Folder />}
              label="Documents"
              active={currentPath === quickAccessPaths.documents}
              onClick={() => handleNavigation(quickAccessPaths.documents)}
            />
            <NavItem
              icon={<Image />}
              label="Pictures"
              active={currentPath === quickAccessPaths.pictures}
              onClick={() => handleNavigation(quickAccessPaths.pictures)}
            />
            <NavItem
              icon={<MusicNote />}
              label="Downloads"
              active={currentPath === quickAccessPaths.downloads}
              onClick={() => handleNavigation(quickAccessPaths.downloads)}
            />
          </CollapsibleSection>

          {/* Drives Section */}
          <CollapsibleSection
            title="Drives"
            open={openSections.drives}
            onOpenChange={(open) =>
              setOpenSections((prev) => ({ ...prev, drives: open }))
            }
          >
            {drives.map((drive) => (
              <NavItem
                key={drive.path}
                icon={<HardDrive />}
                label={drive.name}
                active={currentPath.startsWith(drive.path)}
                onClick={() => handleNavigation(drive.path)}
              />
            ))}
          </CollapsibleSection>

          {/* Favorites Section */}
          <CollapsibleSection
            title="Favorites"
            open={openSections.favorites}
            onOpenChange={(open) =>
              setOpenSections((prev) => ({ ...prev, favorites: open }))
            }
          >
            <NavItem
              icon={<Star />}
              label="Downloads"
              onClick={() => handleNavigation(quickAccessPaths.downloads)}
            />
            {/* Add more favorites as needed */}
          </CollapsibleSection>
        </div>
      </motion.div>

      <main className="flex-1 min-w-0 bg-white" onClick={onOutsideClick}>
        {children}
      </main>
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
