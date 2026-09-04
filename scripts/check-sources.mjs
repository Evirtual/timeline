// Every event claims a source. This checks they all still resolve, because a
// timeline whose citations 404 is worse than one with no citations at all.
//
//   npm run check:sources
//
// Kept out of `npm test` on purpose: it needs the network, and a flaky host
// should not fail a build. Run it after adding a batch of events.
import { readFile } from "node:fs/promises";

const load = async (name) =>
  JSON.parse(await readFile(new URL(`../content/${name}`, import.meta.url), "utf8"));

const ai = await load("ai.json");
const agi = await load("agi.json");

// Both datasets, one list. The race grid has one source per event; the
// chronicle has an array, because a contested figure should cite the claim and
// the correction together.
const tagged = new Map();
const add = (url, where) => {
  if (!tagged.has(url)) tagged.set(url, new Set());
  tagged.get(url).add(where);
};
for (const e of ai.events) add(e.source, `ai:${e.id}`);
for (const m of agi.milestones) for (const s of m.sources) add(s.url, `agi:${m.id}`);

const urls = [...tagged.keys()];
console.log(
  `Checking ${urls.length} sources — ${ai.events.length} race events, ${agi.milestones.length} chronicle milestones...\n`,
);

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

// A 401/403/429 is a bot wall answering, not a missing page — ACM, Oxford
// Academic and most news publishers refuse any script on principle. Reporting
// those as failures trains everyone to ignore this script, so they get their
// own bucket: visible every run, but they do not fail it. Only a 404/410, a
// 5xx or a connection error means the citation is actually gone.
const isWall = (r) => [401, 403, 429].includes(r.status);
const walls = results.filter(isWall);
const broken = results.filter((r) => !r.ok && !isWall(r));

for (const r of [...results].sort((a, b) => a.status - b.status)) {
  const mark = r.ok ? "ok  " : isWall(r) ? "wall" : "FAIL";
  console.log(`${mark} ${String(r.status).padEnd(4)} ${r.url}`);
}

console.log(
  `\n${urls.length} sources: ${results.length - walls.length - broken.length} verified, ` +
    `${walls.length} behind a bot wall, ${broken.length} broken.`,
);

if (walls.length > 0) {
  console.log("\nBehind a wall — cannot be confirmed by machine, check by hand if in doubt:");
  for (const r of walls) console.log(`  · ${r.url}`);
}

if (broken.length > 0) {
  console.error("\nBroken:");
  for (const r of broken) {
    console.error(`  · ${[...tagged.get(r.url)].join(", ")} — ${r.url}`);
  }
  process.exit(1);
}
