import { Outlet } from "react-router-dom";
import { AppShell } from "@mantine/core";
import { Sidebar } from "./components/Sidebar";

export function App() {
  return (
    <AppShell padding="md" navbar={{ width: 180, breakpoint: "sm" }}>
      <AppShell.Navbar>
        <Sidebar />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
