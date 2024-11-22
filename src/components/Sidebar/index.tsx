import { Stack, UnstyledButton, Group, Text } from "@mantine/core";
import {
  IconHome,
  IconDownload,
  IconPhoto,
  IconMusic,
  IconMovie,
  IconFile,
  IconStar,
} from "@tabler/icons-react";

import classes from "./sidebar.module.css";

interface SidebarButtonProps {
  icon: typeof IconHome;
  color: string;
  label: string;
  onClick?: () => void;
}

function SidebarButton({
  icon: Icon,
  color,
  label,
  onClick,
}: SidebarButtonProps) {
  return (
    <UnstyledButton p="2" onClick={onClick} className={classes.button}>
      <Group>
        <Icon size={16} color={color} />
        <Text size="sm">{label}</Text>
      </Group>
    </UnstyledButton>
  );
}

export function Sidebar() {
  return (
    <Stack
      gap="xs"
      p="md"
      miw="max-content"
      style={{ position: "sticky", top: 0, flexShrink: 0 }}
    >
      <Text size="sm" fw={500} c="dimmed" mb="sm">
        Quick Access
      </Text>

      <SidebarButton icon={IconHome} color="#1c7ed6" label="Home" />
      <SidebarButton icon={IconDownload} color="#37b24d" label="Downloads" />
      <SidebarButton icon={IconPhoto} color="#f08c00" label="Pictures" />
      <SidebarButton icon={IconMusic} color="#e64980" label="Music" />
      <SidebarButton icon={IconMovie} color="#7048e8" label="Videos" />
      <SidebarButton icon={IconFile} color="#1098ad" label="Documents" />

      <Text size="sm" fw={500} c="dimmed" mt="md" mb="sm">
        Favorites
      </Text>

      <SidebarButton icon={IconStar} color="#fab005" label="Starred" />
    </Stack>
  );
}
