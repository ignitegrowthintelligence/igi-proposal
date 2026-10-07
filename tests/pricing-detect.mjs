// pricing-detect: runs RX_ITEMIZE from index.html (read from the file, not copied) against the six
// phrases from the 6 Oct maintenance ask. Run: node tests/pricing-detect.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(path.join(ROOT, "index.html"), "utf8");
const m = html.match(/^const RX_ITEMIZE = (\/.*\/[a-z]*);\r?$/m);
if (!m) { console.error("RX_ITEMIZE not found"); process.exit(1); }
const RX_ITEMIZE = eval(m[1]);
const cases = [
  ["Detailed pricing by channel, including fees", true],
  ["rate card", true],
  ["cost per channel", true],
  ["No pricing required at this stage", false],
  ["Pricing will be discussed later", false],
  ["Budget is $4,000/mo.", false],
];
let fail = 0;
for (const [text, want] of cases) {
  const got = RX_ITEMIZE.test(text);
  if (got !== want) fail++;
  console.log((got === want ? "ok  " : "FAIL") + "  " + (got ? "detected    " : "not detected") + "  " + JSON.stringify(text));
}
console.log(fail ? fail + " of 6 wrong" : "6 of 6 as expected");
process.exit(fail ? 1 : 0);
