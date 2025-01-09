import { MainLayout } from "./layouts/MainLayout";
import { BrowserRouter as Router } from "react-router";
import { FileGrid } from "./components/FileGrid";
import { Breadcrumb } from "./components/Breadcrumb";
import { useState } from "react";
import { join, normalize, sep } from "@tauri-apps/api/path";

function App() {
  const [currentPath, setCurrentPath] = useState("/");

  const handleNavigate = async (path: string) => {
    try {
      // If it's root path, use platform-specific root
      if (path === "/") {
        setCurrentPath(sep());
        return;
      }

      // If it's an absolute path (from breadcrumb), use it directly
      if (path.startsWith("/")) {
        const normalized = await normalize(path);
        setCurrentPath(
          normalized.startsWith("\\\\") ? normalized.slice(2) : normalized
        );
      } else {
        // For relative navigation (from FileGrid), join with current path
        const newPath = await join(currentPath, path);
        const normalized = await normalize(newPath);
        setCurrentPath(
          normalized.startsWith("\\\\") ? normalized.slice(2) : normalized
        );
      }
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  return (
    <Router>
      <div className="bg-red-500 min-h-screen">
        <MainLayout>
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">Files</h1>
            </div>
            <div className="mt-4">
              <Breadcrumb path={currentPath} onNavigate={handleNavigate} />
            </div>
            <FileGrid path={currentPath} onNavigate={handleNavigate} />
          </div>
        </MainLayout>
      </div>
    </Router>
  );
}

export default App;
