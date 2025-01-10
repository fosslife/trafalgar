import { ReactNode } from "react";
import { TreeView } from "../components/TreeView";

interface MainLayoutProps {
  children: ReactNode;
  onOutsideClick?: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function MainLayout({
  children,
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
