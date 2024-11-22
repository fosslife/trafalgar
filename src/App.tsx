import { Outlet } from "react-router-dom";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Sidebar } from "./components/Sidebar";
import { Box, Group } from "@mantine/core";

export function App() {
  return (
    <Group align="stretch" h="100%" wrap="nowrap">
      <PanelGroup direction="horizontal" autoSaveId="app-layout">
        <Panel defaultSize={15} maxSize={25}>
          <Sidebar />
        </Panel>
        <PanelResizeHandle style={{ backgroundColor: "gainsboro", width: 1 }} />
        <Panel>
          <Box h="100%" p="xs">
            <Outlet />
          </Box>
        </Panel>
      </PanelGroup>
    </Group>
  );
}
