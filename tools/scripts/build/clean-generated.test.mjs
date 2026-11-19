import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { cleanGenerated } from "./clean-generated.mjs";

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "project-clean-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q"], { cwd: root });
  const put = (file) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), "keep");
  };
  return { root, put };
}

test("preview and cleanup preserve dependencies, source and original data", (t) => {
  const { root, put } = fixture(t);
  const outputs = [
    ".build/cache/compiled",
    "dist/server.js",
    "test-results/result",
    "tsconfig.tsbuildinfo",
  ];
  const originals = [
    ".next/tracked.txt",
    "src/page.tsx",
    "node_modules/dep/index.js",
    ".env",
    "data/backup.db",
  ];
  for (const file of [...outputs, ...originals]) put(file);
  cleanGenerated({ root, dryRun: true, native: false });
  for (const file of outputs)
    assert.ok(existsSync(path.join(root, file)), file);
  cleanGenerated({ root, native: false });
  for (const file of outputs)
    assert.equal(existsSync(path.join(root, file)), false, file);
  for (const file of originals)
    assert.equal(readFileSync(path.join(root, file), "utf8"), "keep", file);
  assert.doesNotThrow(() => cleanGenerated({ root, native: false }));
});

test("tracked and linked outputs fail before deleting any directory", (t) => {
  const { root, put } = fixture(t);
  put(".build/cache/compiled");
  execFileSync("git", ["add", "-f", ".build/cache/compiled"], { cwd: root });
  assert.throws(
    () => cleanGenerated({ root, native: false }),
    /tracked output/,
  );
  execFileSync(
    "git",
    ["update-index", "--force-remove", ".build/cache/compiled"],
    { cwd: root },
  );
  const output = ".build/cache/compiled".split("/")[0];
  rmSync(path.join(root, output), { recursive: true });
  put("outside/original");
  symlinkSync(path.join(root, "outside"), path.join(root, output));
  assert.throws(() => cleanGenerated({ root, native: false }), /linked output/);
  assert.ok(existsSync(path.join(root, "outside/original")));
});

test("cleanup rejects outputs held open by another process", async (t) => {
  if (process.platform === "win32") return t.skip("POSIX open-file inspection");
  const { root, put } = fixture(t);
  put(".build/cache/compiled");
  const child = spawn(process.execPath, [
    "-e",
    'require("node:fs").openSync(process.argv[1], "r"); process.stdout.write("ready"); setInterval(() => {}, 1000);',
    path.join(root, ".build/cache/compiled"),
  ]);
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    child.stdout.once("data", resolve);
    child.once("error", reject);
  });
  assert.throws(
    () => cleanGenerated({ root, native: false }),
    /Output is open/,
  );
  assert.ok(existsSync(path.join(root, ".build/cache/compiled")));
});
