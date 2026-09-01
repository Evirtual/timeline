// Every event claims a source. This checks they all still resolve, because a
// timeline whose citations 404 is worse than one with no citations at all.
//
//   npm run check:sources
//
// Kept out of `npm test` on purpose: it needs the network, and a flaky host
// should not fail a build. Run it after adding a batch of events.
import { readFile } from "node:fs/promises";

const raw = JSON.parse(
  await readFile(new URL("../content/ai.json", import.meta.url), "utf8"),
);
const urls = [...new Set(raw.events.map((e) => e.source))];

console.log(`Checking ${urls.length} sources from ${raw.events.length} events...\n`);

// Sequential with a small pause. Firing fifty parallel requests gets you
// rate-limited by Wikipedia and tells you nothing about whether the links work.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
for (const url of urls) {
  results.push(
    await (async () => {
      try {
        // An honest bot user-agent gets through where a spoofed browser one
        // does not: Cloudflare 403s a fake Chrome string and Meta 400s it,
        // while both serve a plain curl request. Node own default is blocked.
        const res = await fetch(url, {
          redirect: "follow",
          headers: { "user-agent": "curl/8.4.0" },
        });
        return { url, status: res.status, ok: res.ok };
      } catch (error) {
        return { url, status: 0, ok: false, error: String(error) };
      }
    })(),
  );
  await sleep(120);
}

for (const r of [...results].sort((a, b) => a.status - b.status)) {
  console.log(`${String(r.status).padEnd(4)} ${r.url}`);
}

const broken = results.filter((r) => !r.ok);
if (broken.length > 0) {
  console.error(`\n${broken.length} source(s) did not resolve.`);
  process.exit(1);
}
console.log(`\nAll ${urls.length} sources resolve.`);
