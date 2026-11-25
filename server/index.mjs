import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, "solive.sqlite"));
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const readState = db.prepare("SELECT payload FROM app_state WHERE id = 1");
const writeState = db.prepare(`
  INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)
  ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
`);

function emptyState() {
  return {
    version: 1,
    company: { name: "", siret: "", address: "", city: "", email: "", phone: "" },
    chantiers: [],
    workers: [],
    library: [],
    quotes: [],
    situations: [],
    expenses: [],
    assignments: [],
  };
}

function isState(value) {
  if (!value || value.version !== 1 || !value.company || typeof value.company.name !== "string") return false;
  return ["chantiers", "workers", "library", "quotes", "situations", "expenses", "assignments"].every((key) =>
    Array.isArray(value[key]),
  );
}

function send(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/api/state") {
    const row = readState.get();
    send(response, 200, row ? JSON.parse(row.payload) : emptyState());
    return;
  }
  if (request.method === "PUT" && url.pathname === "/api/state") {
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");
      if (Buffer.byteLength(raw) > 5_000_000) {
        send(response, 413, { error: "Données trop volumineuses." });
        return;
      }
      const parsed = JSON.parse(raw);
      if (!isState(parsed)) {
        send(response, 400, { error: "État invalide." });
        return;
      }
      writeState.run(JSON.stringify(parsed), new Date().toISOString());
      send(response, 200, { ok: true });
    } catch {
      send(response, 400, { error: "JSON invalide." });
    }
    return;
  }
  send(response, 404, { error: "Introuvable." });
});

server.listen(8787, "127.0.0.1", () => {
  console.log("Solive API  http://127.0.0.1:8787");
});
