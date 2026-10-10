import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("../lib/upcoming-report-image.ts", import.meta.url), "utf8")
  .replace(/^import .*$/gm, "");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { latestBookingIdsByLocation, reportPageCount } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const row = (id, location) => ({ id, location, bookingDate: "2026-10-08", startTime: "17:00", endTime: "22:00", billNo: String(id), functionName: "Birthday", customerName: "Customer", mobile: "9999999999" });

test("identifies the latest saved booking independently for both halls", () => {
  const latest = latestBookingIdsByLocation([
    row(7, "Padi"), row(11, "Korattur"), row(15, "Padi"), row(13, "Korattur"),
  ]);
  assert.equal(latest.get("Padi"), 15);
  assert.equal(latest.get("Korattur"), 13);
});

test("paginates large reports so every booking remains readable on screen", () => {
  assert.equal(reportPageCount(0), 1);
  assert.equal(reportPageCount(28), 1);
  assert.equal(reportPageCount(29), 2);
  assert.equal(reportPageCount(57), 3);
});
