import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { FileExplorerRoute } from "./routes/FileExplorer";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true, // This will match exactly '/'
        element: <FileExplorerRoute />,
      },
      {
        path: "*", // This will match any other path
        element: <FileExplorerRoute />,
      },
    ],
  },
]);
