// date-display: fmtDate(), parseDue() and fmtDateText() from index.html, run as written, in a
// child process per time zone (TZ is read when the process starts).
// Run: node --test tests/date-display.test.mjs   (Node 20 or later; nothing to install)
// Approved maintenance, 5 Oct 2026 (Vantage Proposal Gate A): a date-only value (YYYY-MM-DD) was
// read as midnight UTC, so anyone west of UTC saw every RFP date one day early.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/\r\n/g, "\n");
const fnSrc = (name) => {
  const m = HTML.match(new RegExp("\\nfunction " + name + "\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n|\\nfunction " + name + "\\([^)]*\\) \\{[^\\n]*\\}\\n"));
  assert.ok(m, "index.html carries " + name + "()");
  return m[0];
};
const SRC = "const esc = (s) => String(s);\n" + fnSrc("parseDue") + fnSrc("fmtDate") + fnSrc("fmtDateText");

function run(tz, expr) {
  const code = SRC + "\nprocess.stdout.write(JSON.stringify(" + expr + "));";
  return JSON.parse(execFileSync(process.execPath, ["-e", code], { env: { ...process.env, TZ: tz }, encoding: "utf8" }));
}

for (const tz of ["America/New_York", "America/Los_Angeles", "Pacific/Auckland"]) {
  test("date-display: " + tz + " shows 2026-10-16 as Oct 16 and 2026-11-06 as Nov 6", () => {
    const [a, b, ta, tb, zone] = run(tz, "[fmtDate('2026-10-16'), fmtDate('2026-11-06'), fmtDateText('2026-10-16'), fmtDateText('2026-11-06'), Intl.DateTimeFormat().resolvedOptions().timeZone]");
    assert.equal(zone, tz, "the child really runs in " + tz);
    assert.equal(a, "Fri, Oct 16, 2026");
    assert.equal(b, "Fri, Nov 6, 2026");
    assert.equal(ta, "Oct 16");
    assert.equal(tb, "Nov 6");
  });
}

test("date-display: a datetime with a time keeps today's behaviour", () => {
  const [got, want] = run("America/New_York", "[fmtDate('2026-10-16T17:00:00Z'), new Date('2026-10-16T17:00:00Z').toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })]");
  assert.equal(got, want);
});

test("date-display: empty and unreadable values are as before", () => {
  const [empty, junk] = run("America/New_York", "[fmtDate(''), fmtDate('sometime in Q4')]");
  assert.equal(empty, "TBD");
  assert.equal(junk, "sometime in Q4");
});
