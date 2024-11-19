import { createTheme, MantineColorsTuple } from "@mantine/core";

const brand: MantineColorsTuple = [
  "#e5f3ff",
  "#cde2ff",
  "#9ac2ff",
  "#64a0ff",
  "#3884fe",
  "#1d72fe",
  "#0969ff",
  "#0058e4",
  "#004ecd",
  "#0043b5",
];

const theme = createTheme({
  primaryColor: "brand",
  defaultRadius: "0",
  colors: {
    brand,
  },
});

export default theme;
