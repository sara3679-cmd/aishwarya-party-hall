import { existsSync } from "node:fs";
import { lstat, mkdir, readdir, readlink, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve(process.argv[2] || "");
const outputRoot = path.resolve(process.argv[3] || "");
if (!process.argv[2] || !process.argv[3] || sourceRoot === outputRoot) {
  throw new Error("Usage: node create-people-albums.mjs <source> <output>");
}

const people = [
  { name: "Soundara Pandian", terms: ["soundara pandian", "soundarapandian"] },
  { name: "Vasantha", terms: ["vasantha"] },
  { name: "Saravanan", terms: ["saravanan"] },
  { name: "Sona", terms: ["sona"] },
  { name: "Aishwarya", terms: ["aishwarya"] },
  { name: "Kirthick", terms: ["kirthick"] },
];
const mediaExt = new Set(["jpg", "jpeg", "png", "heic", "gif", "tif", "tiff", "bmp", "webp", "mov", "mp4", "mpg", "mpeg", "avi", "m4v"]);
const ignoredRoots = new Set(["Organized Family Photos", "Organized Family Albums"]);
const totals = Object.fromEntries(people.map(({ name }) => [name, 0]));

function clean(value) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "Unsorted";
}

function metadata(file, info) {
  const rel = path.relative(sourceRoot, file);
  const yearMatch = rel.match(/(?:19|20)\d{2}/);
  const year = yearMatch?.[0] || String(info.mtime.getFullYear());
  const folders = path.dirname(rel).split(path.sep).filter(Boolean);
  const event = clean(folders.at(-1) || "Loose Files");
  return { rel, year, event };
}

async function uniqueLink(targetDir, file) {
  await mkdir(targetDir, { recursive: true });
  const parsed = path.parse(file);
  let candidate = path.join(targetDir, parsed.base);
  let suffix = 2;
  while (existsSync(candidate)) {
    try {
      if ((await lstat(candidate)).isSymbolicLink() && (await readlink(candidate)) === file) return;
    } catch {}
    candidate = path.join(targetDir, `${parsed.name} (${suffix++})${parsed.ext}`);
  }
  await symlink(file, candidate);
}

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (dir === sourceRoot && ignoredRoots.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (full === outputRoot || full.startsWith(`${outputRoot}${path.sep}`)) continue;
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!entry.isFile() || !mediaExt.has(path.extname(entry.name).slice(1).toLowerCase())) continue;
    const info = await stat(full);
    const { rel, year, event } = metadata(full, info);
    const searchable = rel.toLocaleLowerCase("en");
    for (const person of people) {
      if (!person.terms.some((term) => searchable.includes(term))) continue;
      await uniqueLink(path.join(outputRoot, person.name, year, event), full);
      totals[person.name] += 1;
    }
  }
}

await mkdir(outputRoot, { recursive: true });
for (const { name } of people) await mkdir(path.join(outputRoot, name), { recursive: true });
await walk(sourceRoot);
await writeFile(path.join(outputRoot, "README.txt"), [
  "PEOPLE ALBUMS — NON-DESTRUCTIVE LINKED VIEW",
  "",
  "These albums use names already present in folder paths and filenames.",
  "They do not use facial recognition, so review the matches before relying on them.",
  "Original photos and videos were not moved, renamed, edited, or deleted.",
  "",
  ...people.map(({ name }) => `${name}: ${totals[name]} matched files`),
].join("\n") + "\n");

console.log(JSON.stringify({ outputRoot, totals }, null, 2));
