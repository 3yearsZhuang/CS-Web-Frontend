import { lstatSync, realpathSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));

export function cleanGenerated({ root = projectRoot, dryRun = false } = {}) {
  root = realpathSync(root);
  const paths = [
    ".build",
    "dist",
    "coverage",
    "test-results",
    "playwright-report",
    "tsconfig.tsbuildinfo",
  ];
  const git = spawnSync(
    "git",
    ["-c", "core.fsmonitor=false", "ls-files", "-z"],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    },
  );
  if (git.status !== 0)
    throw new Error("Cannot inspect tracked files before cleaning");
  const tracked = git.stdout.split("\0").filter(Boolean);
  for (const rel of paths) {
    if (tracked.some((file) => file === rel || file.startsWith(`${rel}/`)))
      throw new Error(`Refusing tracked output: ${rel}`);
    let parent = root;
    for (const part of rel.split("/")) {
      parent = path.join(parent, part);
      if (lstatSync(parent, { throwIfNoEntry: false })?.isSymbolicLink())
        throw new Error(`Refusing linked output: ${rel}`);
    }
  }
  const existing = paths.filter((rel) =>
    lstatSync(path.join(root, rel), { throwIfNoEntry: false }),
  );
  if (!dryRun && existing.length && process.platform !== "win32") {
    const open = spawnSync("lsof", ["-nP", "-Fpn"], {
      encoding: "utf8",
      timeout: 20_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    if (open.error || ![0, 1].includes(open.status))
      throw new Error("Cannot inspect open build outputs with lsof", {
        cause: open.error,
      });
    const absolute = existing.map((rel) => path.join(root, rel));
    let pid;
    for (const line of open.stdout.split("\n")) {
      if (line.startsWith("p")) pid = Number(line.slice(1));
      if (!line.startsWith("n") || pid === process.pid) continue;
      const file = line.slice(1).replace(/ \(deleted\)$/, "");
      if (
        absolute.some(
          (dir) => file === dir || file.startsWith(`${dir}${path.sep}`),
        )
      )
        throw new Error(
          `Output is open in process ${pid}; stop its build/runtime before cleaning`,
        );
    }
  }
  if (!dryRun)
    for (const rel of existing)
      rmSync(path.join(root, rel), { recursive: true, force: true });
  return paths;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => !["--dry-run"].includes(arg)))
      throw new Error("Usage: clean-generated.mjs [--dry-run]");
    console.log(
      cleanGenerated({ dryRun: args.includes("--dry-run") }).join("\n"),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
