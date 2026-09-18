import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { lstat, mkdir, readdir, readlink, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve(process.argv[2] || "");
const outputRoot = path.resolve(process.argv[3] || "");
if (!sourceRoot || !outputRoot || sourceRoot === outputRoot || outputRoot.startsWith(`${sourceRoot}${path.sep}`) === false) {
  throw new Error("Usage: node organize-family-photos.mjs <source> <output-inside-source>");
}

const imageExt = new Set(["jpg", "jpeg", "png", "heic", "gif", "tif", "tiff", "bmp", "webp"]);
const videoExt = new Set(["mov", "mp4", "mpg", "mpeg", "avi", "m4v"]);
const audioExt = new Set(["amr", "m4a", "mp3", "wav", "aac"]);
const documentExt = new Set(["doc", "docx", "pdf", "psd", "dps", "lnk"]);
const ignoredNames = new Set([".DS_Store", ".localized", ".picasa.ini", "Thumbs.db"]);
const files = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (full === outputRoot || full.startsWith(`${outputRoot}${path.sep}`)) continue;
    if (entry.isDirectory()) await walk(full);
    else if (entry.isFile() && !ignoredNames.has(entry.name)) {
      const info = await stat(full);
      files.push({ full, rel: path.relative(sourceRoot, full), size: info.size, mtime: info.mtime });
    }
  }
}

function clean(value) {
  return value.replace(/^\d+[.)]?\s*/, "").replace(/[\\/:*?\"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "Unsorted";
}

function yearFor(file) {
  const candidates = file.rel.match(/(?:19|20)\d{2}/g) || [];
  const plausible = candidates.map(Number).find((year) => year >= 1900 && year <= new Date().getFullYear() + 1);
  return String(plausible || file.mtime.getFullYear() || "Unknown Year");
}

function typeFor(file) {
  const ext = path.extname(file.rel).slice(1).toLowerCase();
  if (imageExt.has(ext)) return "Photos";
  if (videoExt.has(ext)) return "Videos";
  if (audioExt.has(ext)) return "Audio";
  if (documentExt.has(ext)) return "Documents";
  return "Other Files";
}

function eventFor(file) {
  const parts = path.dirname(file.rel).split(path.sep).filter(Boolean);
  const useful = parts.filter((part) => !/^(photos?|videos?|\d+[.)]?\s*(function|trip|collection|party hall|old collection))$/i.test(part));
  return clean(useful.at(-1) || "Loose Files");
}

function csv(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function uniqueLink(targetDir, file) {
  await mkdir(targetDir, { recursive: true });
  const parsed = path.parse(file.full);
  let candidate = path.join(targetDir, parsed.base);
  let index = 2;
  while (existsSync(candidate)) {
    try {
      if ((await lstat(candidate)).isSymbolicLink() && (await readlink(candidate)) === file.full) return candidate;
    } catch {}
    candidate = path.join(targetDir, `${parsed.name} (${index++})${parsed.ext}`);
  }
  await symlink(file.full, candidate);
  return candidate;
}

await walk(sourceRoot);
await mkdir(outputRoot, { recursive: true });
const manifest = [["Year", "Type", "Event", "Original path", "Organized link", "Bytes"]];
const emptyFiles = [];
const bySize = new Map();

for (const file of files) {
  const year = yearFor(file);
  const type = typeFor(file);
  const event = eventFor(file);
  const targetDir = path.join(outputRoot, year, type, event);
  const link = await uniqueLink(targetDir, file);
  manifest.push([year, type, event, file.full, link, file.size]);
  if (file.size === 0) emptyFiles.push(file.full);
  if (file.size > 0) {
    const group = bySize.get(file.size) || [];
    group.push(file);
    bySize.set(file.size, group);
  }
}

const duplicateRows = [["Status", "Bytes", "SHA-256", "Path"]];
for (const [size, group] of bySize) {
  if (group.length < 2) continue;
  const hashes = new Map();
  for (const file of group) {
    const hash = await new Promise((resolve, reject) => {
      const digest = createHash("sha256");
      createReadStream(file.full).on("data", (chunk) => digest.update(chunk)).on("end", () => resolve(digest.digest("hex"))).on("error", reject);
    });
    const matches = hashes.get(hash) || [];
    matches.push(file);
    hashes.set(hash, matches);
  }
  for (const [hash, matches] of hashes) {
    if (matches.length < 2) continue;
    for (const file of matches) duplicateRows.push(["Exact duplicate; review only", size, hash, file.full]);
  }
}

await mkdir(path.join(outputRoot, "_Review"), { recursive: true });
await writeFile(path.join(outputRoot, "_Photo Index.csv"), manifest.map((row) => row.map(csv).join(",")).join("\n") + "\n");
await writeFile(path.join(outputRoot, "_Review", "Exact Duplicates.csv"), duplicateRows.map((row) => row.map(csv).join(",")).join("\n") + "\n");
await writeFile(path.join(outputRoot, "_Review", "Empty Files.txt"), emptyFiles.join("\n") + (emptyFiles.length ? "\n" : ""));
await writeFile(path.join(outputRoot, "README.txt"), [
  "ORGANIZED FAMILY PHOTOS — NON-DESTRUCTIVE VIEW",
  "",
  "Files in this folder are symbolic links to your originals.",
  "No original photo or video was moved, renamed, or deleted.",
  "Do not delete originals unless you have a verified backup.",
  "Review exact duplicates manually before any deletion.",
  "",
  `Indexed files: ${files.length}`,
  `Exact duplicate entries: ${Math.max(0, duplicateRows.length - 1)}`,
  `Empty files: ${emptyFiles.length}`,
].join("\n") + "\n");

console.log(JSON.stringify({ indexed: files.length, duplicateEntries: duplicateRows.length - 1, emptyFiles: emptyFiles.length, outputRoot }, null, 2));
