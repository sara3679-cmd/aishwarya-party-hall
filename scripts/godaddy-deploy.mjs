import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, cpSync } from "node:fs";
import { resolve, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const root = resolve(import.meta.dirname, "..");
const deployRoot = join(root, "deploy", "godaddy-full-app");
const outputZip = join(root, "deploy", "aishwarya-godaddy-one-click.zip");
const publish = process.argv.includes("--publish");

function loadPrivateEnvironment() {
  const file = join(root, ".env.godaddy.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals < 1) continue;
    const key = trimmed.slice(0, equals).trim();
    const value = trimmed.slice(equals + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function syncProjectFiles() {
  const replace = (source, destination) => {
    rmSync(destination, { recursive: true, force: true });
    cpSync(source, destination, { recursive: true });
  };

  mkdirSync(deployRoot, { recursive: true });
  replace(join(root, "components"), join(deployRoot, "components"));
  replace(join(root, "lib"), join(deployRoot, "lib"));
  replace(join(root, "public"), join(deployRoot, "public"));

  // Keep GoDaddy's MySQL API routes, but refresh all UI and page code.
  for (const name of [
    "admin",
    "catering",
    "privacy",
    "globals.css",
    "site-improvements.css",
    "layout.tsx",
    "page.tsx",
    "robots.ts",
    "sitemap.ts",
    "admin-auth.ts"
  ]) {
    const source = join(root, "app", name);
    if (existsSync(source)) replace(source, join(deployRoot, "app", name));
  }
}

function createZip() {
  rmSync(outputZip, { force: true });
  execFileSync("zip", ["-qr", outputZip, ".", "-x", "node_modules/*", ".next/*", ".env*", "*.log", "public/images/pamphlets/*", "public/images/catalog/*", "public/images/catering/ai/*.png"], {
    cwd: deployRoot,
    stdio: "inherit"
  });
}

async function api(path, options = {}) {
  const response = await fetch(`https://api.godaddy.com/v1/hosting/nodejs${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GODADDY_PAT}`,
      ...options.headers
    }
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }
  if (!response.ok) throw new Error(`GoDaddy API ${response.status}: ${body.detail || body.error || body.message || text}`);
  return body;
}

async function poll(label, readStatus, isComplete) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const value = await readStatus();
    const state = JSON.stringify(value);
    if (/failed|error/i.test(state)) throw new Error(`${label} failed: ${state}`);
    if (isComplete(value)) return value;
    process.stdout.write(`\r${label}… ${attempt + 1}`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 5000));
  }
  throw new Error(`${label} timed out.`);
}

loadPrivateEnvironment();
const appId = process.env.GODADDY_APP_ID || "s9rxiphgty";
if (!process.env.GODADDY_PAT || process.env.GODADDY_PAT.includes("paste_your")) {
  throw new Error("Create .env.godaddy.local from .env.godaddy.example and add your GoDaddy Personal Access Token.");
}

console.log("1/5 Syncing the VS Code project to the GoDaddy application copy…");
syncProjectFiles();
console.log("2/5 Running the GoDaddy production build check…");
execFileSync("npm", ["run", "build"], { cwd: deployRoot, stdio: "inherit" });
console.log("3/5 Creating a deployment ZIP…");
createZip();

console.log("4/5 Uploading to GoDaddy Preview…");
const form = new FormData();
form.append("zipFile", new Blob([readFileSync(outputZip)], { type: "application/zip" }), "aishwarya-party-hall.zip");
const upload = await api(`/apps/${appId}/source`, { method: "POST", body: form });
const jobId = upload.jobId || upload.job?.id;
if (!jobId) throw new Error(`GoDaddy did not return an upload job ID: ${JSON.stringify(upload)}`);
await poll(
  "Processing Preview upload",
  () => api(`/apps/${appId}/source/status?jobId=${encodeURIComponent(jobId)}`),
  (value) => /complete|completed|success|succeeded|ready/i.test(String(value.status))
);
console.log("\nPreview upload is ready.");

if (!publish) {
  console.log("Finished. Review Preview in GoDaddy before publishing.");
  process.exit(0);
}

const rl = createInterface({ input, output });
const answer = await rl.question("Publish this update to www.aishwaryapartyhall.in? Type PUBLISH: ");
rl.close();
if (answer.trim() !== "PUBLISH") {
  console.log("Live publishing cancelled. Preview remains uploaded.");
  process.exit(0);
}

console.log("5/5 Publishing to the live website…");
const deployment = await api(`/apps/${appId}/deployments`, { method: "POST" });
const deploymentId = deployment.deploymentId || deployment.id;
await poll(
  "Publishing Live",
  () => api(`/apps/${appId}/deployments?limit=20`),
  (value) => {
    const items = value.deployments || [];
    const current = items.find((item) => !deploymentId || item.id === deploymentId || item.deploymentId === deploymentId);
    return current && /complete|completed|success|succeeded|healthy|active|published/i.test(String(current.status));
  }
);
console.log("\nPublished successfully: https://www.aishwaryapartyhall.in/");
