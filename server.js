/* =====================================================
   EV Scooter Poll - backend
   Zero npm dependencies: uses Node's built-in http,
   crypto (scrypt password hashing) and node:sqlite.
   Requires Node 22.5+ (22.13+ recommended).
===================================================== */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const SESSION_DAYS = 7;
/* Admin account (created automatically on first start).
   Change these here, or set ADMIN_USERNAME / ADMIN_PASSWORD env variables. */
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";

/* The original scooter poll, seeded once when the database is first set up */
const DEFAULT_POLL = {
  question: "Which is the Best EV Scooter?",
  description: "Select one scooter and submit your vote.",
  options: ["Bajaj Chetak", "TVS iQube", "Ather", "Ola Electric"]
};

/* ---------- DATABASE ---------- */

const db = new DatabaseSync(path.join(__dirname, "poll.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

const columnsOf = table => db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS polls (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    question    TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_open     INTEGER NOT NULL DEFAULT 1,
    created_by  INTEGER,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS poll_options (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id  INTEGER NOT NULL,
    label    TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
  );
`);

/* --- upgrade older databases --- */
if (!columnsOf("users").includes("role")) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
}

let legacyVotes = false;
const oldVoteCols = columnsOf("votes");
if (oldVoteCols.length && !oldVoteCols.includes("poll_id")) {
  db.exec("ALTER TABLE votes RENAME TO votes_old");
  legacyVotes = true;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id   INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    user_id   INTEGER NOT NULL,
    voted_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (poll_id, user_id),               -- one vote per user per poll
    FOREIGN KEY (poll_id)   REFERENCES polls(id)         ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES poll_options(id)  ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(id)         ON DELETE CASCADE
  );
`);

/* --- first-time setup: seed the original scooter poll (and keep old votes) --- */
if (db.prepare("PRAGMA user_version").get().user_version < 1) {
  const pollId = insertPoll(DEFAULT_POLL.question, DEFAULT_POLL.description, DEFAULT_POLL.options, null);
  if (legacyVotes) {
    db.prepare(`
      INSERT INTO votes (poll_id, option_id, user_id, voted_at)
      SELECT ?, o.id, vo.user_id, vo.voted_at
      FROM votes_old vo JOIN poll_options o ON o.poll_id = ? AND o.label = vo.candidate
    `).run(pollId, pollId);
    db.exec("DROP TABLE votes_old");
  }
  db.exec("PRAGMA user_version = 1");
}

function insertPoll(question, description, options, createdBy) {
  db.exec("BEGIN");
  try {
    const r = db.prepare("INSERT INTO polls (question, description, created_by) VALUES (?, ?, ?)")
      .run(question, description, createdBy);
    const pollId = Number(r.lastInsertRowid);
    const ins = db.prepare("INSERT INTO poll_options (poll_id, label, position) VALUES (?, ?, ?)");
    options.forEach((label, i) => ins.run(pollId, label, i));
    db.exec("COMMIT");
    return pollId;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/* ---------- HELPERS ---------- */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(password, salt, 64);
  const real = Buffer.from(hash, "hex");
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}

/* Make sure the admin account exists */
(function seedAdmin() {
  const existing = db.prepare("SELECT id, role FROM users WHERE username = ?").get(ADMIN_USERNAME);
  if (!existing) {
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')")
      .run(ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD));
  } else if (existing.role !== "admin" || process.env.ADMIN_PASSWORD) {
    /* username was taken by a normal account earlier, or a new password was supplied */
    db.prepare("UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?")
      .run(hashPassword(ADMIN_PASSWORD), existing.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existing.id);
  }
})();

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach(part => {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function getSessionUser(req) {
  const token = parseCookies(req).session;
  if (!token) return null;
  const row = db.prepare(
    `SELECT u.id, u.username, u.role, s.expires_at FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.token = ?`
  ).get(token);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return { id: row.id, username: row.username, role: row.role };
}

function send(res, status, data, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 10_000) { reject(new Error("Body too large")); req.destroy(); }
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
  });
}

function sessionCookie(token, maxAgeSeconds) {
  return `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

function getPolls(userId) {
  const polls = db.prepare(
    "SELECT id, question, description, is_open, created_at FROM polls ORDER BY id DESC"
  ).all();

  const options = db.prepare(`
    SELECT o.id, o.poll_id, o.label, COUNT(v.id) AS votes
    FROM poll_options o LEFT JOIN votes v ON v.option_id = o.id
    GROUP BY o.id ORDER BY o.poll_id, o.position, o.id
  `).all();

  const mine = {};
  db.prepare("SELECT poll_id, option_id FROM votes WHERE user_id = ?")
    .all(userId).forEach(v => { mine[v.poll_id] = v.option_id; });

  return polls.map(p => {
    const opts = options.filter(o => o.poll_id === p.id)
      .map(o => ({ id: o.id, label: o.label, votes: o.votes }));
    return {
      id: p.id,
      question: p.question,
      description: p.description,
      isOpen: !!p.is_open,
      createdAt: p.created_at,
      options: opts,
      total: opts.reduce((n, o) => n + o.votes, 0),
      myOptionId: mine[p.id] || null
    };
  });
}

/* ---------- API ROUTES ---------- */

async function handleApi(req, res, pathname) {
  const route = `${req.method} ${pathname}`;

  if (route === "POST /api/register") {
    const { username = "", password = "" } = await readBody(req);
    const name = String(username).trim();
    if (name.length < 3 || name.length > 30)
      return send(res, 400, { error: "Username must be 3-30 characters." });
    if (String(password).length < 6)
      return send(res, 400, { error: "Password must be at least 6 characters." });
    try {
      db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
        .run(name, hashPassword(String(password)));
    } catch (e) {
      if (String(e.message).includes("UNIQUE"))
        return send(res, 409, { error: "That username is already taken." });
      throw e;
    }
    return send(res, 201, { ok: true, username: name });
  }

  if (route === "POST /api/login") {
    const { username = "", password = "" } = await readBody(req);
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(String(username).trim());
    if (!user || !verifyPassword(String(password), user.password_hash))
      return send(res, 401, { error: "Invalid username or password!" });

    const token = crypto.randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
      .run(token, user.id, Date.now() + SESSION_DAYS * 86400000);
    return send(res, 200, { ok: true, username: user.username, role: user.role },
      { "Set-Cookie": sessionCookie(token, SESSION_DAYS * 86400) });
  }

  if (route === "POST /api/logout") {
    const token = parseCookies(req).session;
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
  }

  if (route === "GET /api/me") {
    const user = getSessionUser(req);
    if (!user) return send(res, 401, { error: "Not logged in" });
    return send(res, 200, { username: user.username, role: user.role });
  }

  /* ----- everything below needs a login ----- */
  const user = getSessionUser(req);
  if (!user) return send(res, 401, { error: "Please login first." });

  if (route === "GET /api/polls") {
    return send(res, 200, getPolls(user.id));
  }

  if (route === "POST /api/polls") {
    if (user.role !== "admin") return send(res, 403, { error: "Admins only." });
    const body = await readBody(req);
    const question = String(body.question || "").trim();
    const description = String(body.description || "").trim();
    const options = (Array.isArray(body.options) ? body.options : [])
      .map(o => String(o).trim()).filter(Boolean);

    if (question.length < 3 || question.length > 200)
      return send(res, 400, { error: "Question must be 3-200 characters." });
    if (description.length > 500)
      return send(res, 400, { error: "Description is too long (max 500)." });
    if (options.length < 2 || options.length > 10)
      return send(res, 400, { error: "A poll needs 2 to 10 options." });
    if (options.some(o => o.length > 100))
      return send(res, 400, { error: "Each option can be at most 100 characters." });
    if (new Set(options.map(o => o.toLowerCase())).size !== options.length)
      return send(res, 400, { error: "Options must be different from each other." });

    const id = insertPoll(question, description, options, user.id);
    return send(res, 201, { ok: true, id });
  }

  const m = pathname.match(/^\/api\/polls\/(\d+)(\/vote)?$/);
  if (m) {
    const pollId = Number(m[1]);
    const poll = db.prepare("SELECT * FROM polls WHERE id = ?").get(pollId);
    if (!poll) return send(res, 404, { error: "Poll not found." });

    if (m[2] && req.method === "POST") {
      if (user.role === "admin")
        return send(res, 403, { error: "Admins manage polls and cannot vote." });
      if (!poll.is_open)
        return send(res, 400, { error: "This poll is closed." });
      const { optionId } = await readBody(req);
      const option = db.prepare("SELECT id FROM poll_options WHERE id = ? AND poll_id = ?")
        .get(Number(optionId), pollId);
      if (!option) return send(res, 400, { error: "Invalid option." });
      try {
        db.prepare("INSERT INTO votes (poll_id, option_id, user_id) VALUES (?, ?, ?)")
          .run(pollId, option.id, user.id);
      } catch (e) {
        if (String(e.message).includes("UNIQUE"))
          return send(res, 409, { error: "You have already voted in this poll!" });
        throw e;
      }
      return send(res, 201, { ok: true });
    }

    if (!m[2] && req.method === "PATCH") {
      if (user.role !== "admin") return send(res, 403, { error: "Admins only." });
      const { isOpen } = await readBody(req);
      db.prepare("UPDATE polls SET is_open = ? WHERE id = ?").run(isOpen ? 1 : 0, pollId);
      return send(res, 200, { ok: true });
    }

    if (!m[2] && req.method === "DELETE") {
      if (user.role !== "admin") return send(res, 403, { error: "Admins only." });
      db.prepare("DELETE FROM polls WHERE id = ?").run(pollId);
      return send(res, 200, { ok: true });
    }
  }

  return send(res, 404, { error: "Not found" });
}

/* ---------- STATIC FILES ---------- */

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

function serveStatic(req, res, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

/* ---------- SERVER ---------- */

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  try {
    if (pathname.startsWith("/api/")) return await handleApi(req, res, pathname);
    serveStatic(req, res, pathname);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "Server error" });
  }
}).listen(PORT, () => {
  console.log(`Poll running at http://localhost:${PORT}`);
  console.log(`Admin login -> username: ${ADMIN_USERNAME}${process.env.ADMIN_PASSWORD ? "" : "  password: " + ADMIN_PASSWORD + "  (default - see README to change)"}`);
});
