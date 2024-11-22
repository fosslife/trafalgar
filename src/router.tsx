import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { FileExplorerRoute } from "./routes/FileExplorer";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <FileExplorerRoute />,
      },
      {
        path: "*",
        element: <FileExplorerRoute />,
      },
    ],
  },
]);
