import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface HeroRecord {
  id: string;
  name: string;
  wikiName: string;
  title: string;
  image: string;
  roleTh: string;
  roles: string[];
  traitTh: string;
  laneTh: string;
  lanes: string[];
  releaseDate: string;
}

const EXTRA_IMAGES: Record<string, string> = {
  "edras": "https://static.wikia.nocookie.net/strikeofkings_gamepedia_en/images/2/22/Edras.jpg/revision/latest?cb=20260124101548",
  "dyadia": "https://static.wikia.nocookie.net/strikeofkings_gamepedia_en/images/d/d1/Dyadia.jpg/revision/latest?cb=20260124100926",
  "flowborn-steady-will": "https://static.wikia.nocookie.net/strikeofkings_gamepedia_en/images/0/0a/Flowborn_ad.jpg/revision/latest?cb=20260619164732",
  "flowborn-arcane-heart": "https://static.wikia.nocookie.net/strikeofkings_gamepedia_en/images/f/ff/Flowborn_mid.jpg/revision/latest?cb=20260619164748",
  "evita": "https://static.wikia.nocookie.net/strikeofkings_gamepedia_en/images/b/b4/Evita.jpeg/revision/latest?cb=20261018161517",
};

function normalizeRoles(raw: string): string[] {
  const roles: string[] = [];
  if (raw.includes("แทงค์")) roles.push("Tank");
  if (raw.includes("ไฟต์เตอร์")) roles.push("Fighter");
  if (raw.includes("แอสซาซิน")) roles.push("Assassin");
  if (raw.includes("เมจ")) roles.push("Mage");
  if (raw.includes("แครี่")) roles.push("Marksman");
  if (raw.includes("ซัพพอร์ต")) roles.push("Support");
  return roles.length > 0 ? roles : ["Fighter"];
}

function normalizeLanes(raw: string): string[] {
  const lanes: string[] = [];
  if (raw.includes("Dark Slayer")) lanes.push("Dark Slayer");
  if (raw.includes("ป่า") || raw.includes("ฟาร์ม")) lanes.push("Jungle");
  if (raw.includes("กลาง")) lanes.push("Mid");
  if (raw.includes("Abyssal Dragon")) lanes.push("Abyssal Dragon");
  if (raw.includes("โรมมิ่ง")) lanes.push("Roam");
  return lanes.length > 0 ? lanes : ["Dark Slayer"];
}

async function fetchHeroesFromWiki(): Promise<HeroRecord[]> {
  const apiUrl =
    "https://arena-of-valor.fandom.com/th/api.php?action=parse&page=%E0%B8%AE%E0%B8%B5%E0%B9%82%E0%B8%A3%E0%B9%88&format=json";
  const res = await fetch(apiUrl, {
    headers: { "User-Agent": "RoV-Draft-Arena/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Wiki API HTTP ${res.status}`);
  }
  const data = (await res.json()) as { parse?: { text?: { "*"?: string } } };
  const html = data?.parse?.text?.["*"] || "";
  const tableMatch = html.match(/<table class="sortable fandom-table"[\s\S]*?<\/table>/);
  if (!tableMatch) {
    throw new Error("Could not locate hero table in wiki response");
  }

  const rows = tableMatch[0].split(/<tr[^>]*>/).slice(2);
  const heroes: HeroRecord[] = [];
  const seenIds = new Set<string>();

  for (const row of rows) {
    const tds = row.split(/<td[^>]*>/).slice(1);
    if (tds.length < 5) continue;

    let heroIdx = -1;
    for (let i = 0; i < tds.length - 1; i++) {
      const nextText = tds[i + 1].replace(/<[^>]+>/g, "").trim();
      if (/^(แทงค์|ไฟต์เตอร์|แอสซาซิน|เมจ|แครี่|ซัพพอร์ต)/.test(nextText)) {
        heroIdx = i;
        break;
      }
    }
    if (heroIdx === -1) continue;

    const heroTd = tds[heroIdx];
    const roleTd = tds[heroIdx + 1] || "";
    const traitTd = tds[heroIdx + 2] || "";
    const laneTd = tds[heroIdx + 3] || "";
    const dateTd = tds[heroIdx + 4] || "";

    const imgMatch = heroTd.match(
      /(?:data-src|src)="(https:\/\/static\.wikia\.nocookie\.net\/arena-of-valor\/images\/[^"]+)"/
    );

    let name = "";
    let title = "";
    const aMatch = heroTd.match(
      /<p>\s*(?:<a[^>]*>([^<]+)<\/a>|<span[^>]*>([^<]+)<\/span>)(?:<br\s*\/?>\s*<small>([^<]*)<\/small>)?/
    );
    if (aMatch) {
      name = (aMatch[1] || aMatch[2] || "").trim();
      title = (aMatch[3] || "").trim();
    } else {
      const cleanLines = heroTd
        .replace(/<[^>]+>/g, "\n")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      name = cleanLines[0] || "";
      title = cleanLines[1] || "";
    }

    if (!name) continue;

    let baseId = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (name === "Flowborn" && title) {
      baseId = `${baseId}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    }
    let id = baseId;
    let n = 2;
    while (seenIds.has(id)) {
      id = `${baseId}-${n++}`;
    }
    seenIds.add(id);

    const roleTh = roleTd.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const laneTh = laneTd.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const traitTh = traitTd.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const releaseDate = dateTd.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const displayName = name === "Flowborn" ? `Flowborn (${roleTh})` : name;

    heroes.push({
      id,
      name: displayName,
      wikiName: name,
      title,
      image: (imgMatch ? imgMatch[1].replace(/&amp;/g, "&") : "") || EXTRA_IMAGES[id] || "",
      roleTh,
      roles: normalizeRoles(roleTh),
      traitTh,
      laneTh,
      lanes: normalizeLanes(laneTh),
      releaseDate,
    });
  }

  return heroes;
}

function loadBundledHeroes(): HeroRecord[] {
  const filePath = path.resolve(__dirname, "src/data/heroes.json");
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as HeroRecord[];
}

let cachedHeroes: HeroRecord[] | null = null;
let lastSyncedAt = 0;

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.get("/api/heroes", async (req, res) => {
    const forceRefresh = req.query.refresh === "1" || req.query.refresh === "true";
    const now = Date.now();
    const cacheValid = cachedHeroes && now - lastSyncedAt < 1000 * 60 * 30;

    if (!forceRefresh && cacheValid && cachedHeroes) {
      res.json({
        source: "wiki-cache",
        syncedAt: new Date(lastSyncedAt).toISOString(),
        count: cachedHeroes.length,
        heroes: cachedHeroes,
      });
      return;
    }

    try {
      const liveHeroes = await fetchHeroesFromWiki();
      if (liveHeroes.length >= 100) {
        cachedHeroes = liveHeroes;
        lastSyncedAt = now;
        res.json({
          source: "wiki-live",
          syncedAt: new Date(lastSyncedAt).toISOString(),
          count: liveHeroes.length,
          heroes: liveHeroes,
        });
        return;
      }
      throw new Error("Incomplete hero list returned from wiki");
    } catch {
      const fallback = cachedHeroes || loadBundledHeroes();
      res.json({
        source: "bundled-snapshot",
        syncedAt: lastSyncedAt ? new Date(lastSyncedAt).toISOString() : null,
        count: fallback.length,
        heroes: fallback,
      });
    }
  });

  if (process.env.NODE_ENV === "production") {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`RoV Draft Arena server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
