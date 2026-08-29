import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
for (const line of readFileSync(resolve(root, ".env.godaddy.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}

const appId = process.env.GODADDY_APP_ID || "s9rxiphgty";
const zipPath = resolve(root, "deploy", "aishwarya-db-restore.zip");
const api = async (path, options = {}) => {
  const response = await fetch(`https://api.godaddy.com/v1/hosting/nodejs${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.GODADDY_PAT}`, ...options.headers },
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) throw new Error(`GoDaddy API ${response.status}: ${data.detail || data.error || data.message || "Unknown error"}`);
  return data;
};

const form = new FormData();
form.append("zipFile", new Blob([readFileSync(zipPath)], { type: "application/zip" }), "aishwarya-db-restore.zip");
const upload = await api(`/apps/${appId}/source`, { method: "POST", body: form });
const jobId = upload.jobId || upload.job?.id;
if (!jobId) throw new Error("GoDaddy did not return an upload job ID");

for (let attempt = 0; attempt < 120; attempt += 1) {
  const status = await api(`/apps/${appId}/source/status?jobId=${encodeURIComponent(jobId)}`);
  const value = String(status.status || "");
  if (/failed|error/i.test(value)) throw new Error(`Preview upload failed: ${value}`);
  if (/complete|success|ready/i.test(value)) {
    console.log("Restore package uploaded to GoDaddy Preview.");
    process.exit(0);
  }
  await new Promise((resolveWait) => setTimeout(resolveWait, 3000));
}
throw new Error("GoDaddy Preview upload timed out");
