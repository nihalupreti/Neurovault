import git, { ReadCommitResult } from "isomorphic-git";
import fs from "fs";
import path from "path";

const author = { name: "Neurovault", email: "sync@neurovault.local" };

export async function initRepo(dir: string): Promise<void> {
  await fs.promises.mkdir(dir, { recursive: true });
  await git.init({ fs, dir, defaultBranch: "main" });
}

export interface FileWrite {
  path: string;
  content: string;
}

export async function writeAndCommit(
  dir: string,
  writes: FileWrite[],
  deletes: string[],
  message: string
): Promise<string> {
  for (const file of writes) {
    const fullPath = path.join(dir, file.path);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, file.content, "utf-8");
    await git.add({ fs, dir, filepath: file.path });
  }

  for (const filepath of deletes) {
    const fullPath = path.join(dir, filepath);
    try {
      await fs.promises.unlink(fullPath);
    } catch {
      // file may already be gone
    }
    await git.remove({ fs, dir, filepath });
  }

  return git.commit({ fs, dir, message, author });
}

export async function getHeadSha(dir: string): Promise<string> {
  return git.resolveRef({ fs, dir, ref: "HEAD" });
}

export async function getLog(
  dir: string,
  ref = "HEAD",
  depth?: number
): Promise<ReadCommitResult[]> {
  return git.log({ fs, dir, ref, depth });
}

export async function readFileAtCommit(
  dir: string,
  commitSha: string,
  filepath: string
): Promise<string> {
  const { blob } = await git.readBlob({
    fs,
    dir,
    oid: commitSha,
    filepath,
  });
  return new TextDecoder().decode(blob);
}

export async function getChangedFiles(
  dir: string,
  fromSha: string,
  toSha: string
): Promise<{ path: string; action: "create" | "modify" | "delete" }[]> {
  const changes: { path: string; action: "create" | "modify" | "delete" }[] = [];

  await git.walk({
    fs,
    dir,
    trees: [git.TREE({ ref: fromSha }), git.TREE({ ref: toSha })],
    map: async (filepath, [A, B]) => {
      if (filepath === ".") return undefined;

      const aType = A ? await A.type() : undefined;
      const bType = B ? await B.type() : undefined;

      if (aType === "tree" || bType === "tree") return undefined;

      const aOid = A ? await A.oid() : undefined;
      const bOid = B ? await B.oid() : undefined;

      if (aOid === bOid) return undefined;

      if (!aOid && bOid) {
        changes.push({ path: filepath, action: "create" });
      } else if (aOid && !bOid) {
        changes.push({ path: filepath, action: "delete" });
      } else {
        changes.push({ path: filepath, action: "modify" });
      }

      return undefined;
    },
  });

  return changes;
}

export async function fileExistsAtHead(dir: string, filepath: string): Promise<boolean> {
  try {
    await readFileAtCommit(dir, await getHeadSha(dir), filepath);
    return true;
  } catch {
    return false;
  }
}

export async function readFileAtHead(dir: string, filepath: string): Promise<string> {
  return readFileAtCommit(dir, await getHeadSha(dir), filepath);
}
