import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const cargoPath = resolve(__dirname, "../src-tauri/Cargo.toml");
const version = process.env.NEW_VERSION;

if (!version) {
  console.error("No version provided");
  process.exit(1);
}

let cargoToml = readFileSync(cargoPath, "utf8");
cargoToml = cargoToml.replace(
  /version = ".*"/,
  `version = "${version.replace(/^v/, "")}"`
);

writeFileSync(cargoPath, cargoToml);
