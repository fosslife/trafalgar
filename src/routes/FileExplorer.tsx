import { useNavigate, useParams } from "react-router-dom";
import { FileExplorer as FileExplorerComponent } from "@/components/FileExplorer";

export function FileExplorerRoute() {
  const navigate = useNavigate();
  // '*' is the key for catch-all params in react-router
  const { "*": currentPath = "" } = useParams();

  const handlePathChange = (newPath: string) => {
    // Remove leading slash as react-router will add it
    navigate(newPath.replace(/^\//, ""));
  };

  return (
    <FileExplorerComponent
      currentPath={currentPath ? `/${currentPath}` : "/"}
      onPathChange={handlePathChange}
    />
  );
}
