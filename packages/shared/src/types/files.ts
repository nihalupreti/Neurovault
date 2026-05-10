export interface FileNode {
  _id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  childCount?: number;
}

export interface FolderTreeResponse {
  _id?: string;
  name: string;
  type: string;
  children: FileNode[];
}
