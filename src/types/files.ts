export interface FileItem {
  name: string;
  path: string;
  fileType: "file" | "directory" | "symlink";
  size: number;
  modified: number;
}
