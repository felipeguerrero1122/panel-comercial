const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const hasPostgres = Boolean(process.env.DATABASE_URL);

app.use(express.json());
app.use(express.static(__dirname));

function sanitizeString(value) {
  return String(value || "").trim();
}

function createId() {
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function validateLocale(body) {
  return {
    id: sanitizeString(body.id) || createId(),
    number: sanitizeString(body.number),
    name: sanitizeString(body.name),
    tenant: sanitizeString(body.tenant),
    phone: sanitizeString(body.phone),
    category: sanitizeString(body.category),
    status: sanitizeString(body.status) || "disponible"
  };
}

function validateStorage(body) {
  return {
    id: sanitizeString(body.id) || createId(),
    name: sanitizeString(body.name),
    status: sanitizeString(body.status) || "disponible"
  };
}

function validateTask(body) {
  return {
    id: sanitizeString(body.id) || createId(),
    title: sanitizeString(body.title),
    area: sanitizeString(body.area),
    date: sanitizeString(body.date),
    status: sanitizeString(body.status) || "pendiente"
  };
}

function validateIncident(body) {
  return {
    id: sanitizeString(body.id) || createId(),
    description: sanitizeString(body.description),
    level: sanitizeString(body.level) || "bajo",
    status: sanitizeString(body.status) || "abierto",
    date: sanitizeString(body.date),
    source: sanitizeString(body.source)
  };
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function createSqliteStore() {
  const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, "panel-comercial.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS locales (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      name TEXT NOT NULL,
      tenant TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      category TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'disponible',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bodegas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'disponible',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tareas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      area TEXT DEFAULT '',
      date TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pendiente',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS incidentes (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'bajo',
      status TEXT NOT NULL DEFAULT 'abierto',
      date TEXT DEFAULT '',
      source TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const listLocales = db.prepare(`
    SELECT id, number, name, tenant, phone, category, status
    FROM locales
    ORDER BY datetime(created_at) DESC
  `);
  const listBodegas = db.prepare(`
    SELECT id, name, status
    FROM bodegas
    ORDER BY datetime(created_at) DESC
  `);
  const listTareas = db.prepare(`
    SELECT id, title, area, date, status
    FROM tareas
    ORDER BY datetime(created_at) DESC
  `);
  const listIncidentes = db.prepare(`
    SELECT id, description, level, status, date, source
    FROM incidentes
    ORDER BY datetime(created_at) DESC
  `);

  return {
    async init() {},
    async getState() {
      return {
        locales: listLocales.all(),
        bodegas: listBodegas.all(),
        tareas: listTareas.all(),
        incidentes: listIncidentes.all()
      };
    },
    async createLocale(locale) {
      db.prepare(`
        INSERT INTO locales (id, number, name, tenant, phone, category, status)
        VALUES (@id, @number, @name, @tenant, @phone, @category, @status)
      `).run(locale);
      return locale;
    },
    async updateLocale(locale) {
      const result = db.prepare(`
        UPDATE locales
        SET number = @number, name = @name, tenant = @tenant, phone = @phone, category = @category, status = @status
        WHERE id = @id
      `).run(locale);
      return result.changes > 0;
    },
    async updateLocaleStatus(id, status) {
      const result = db.prepare(`UPDATE locales SET status = ? WHERE id = ?`).run(status, id);
      return result.changes > 0;
    },
    async deleteLocale(id) {
      return db.prepare(`DELETE FROM locales WHERE id = ?`).run(id).changes > 0;
    },
    async createStorage(storage) {
      db.prepare(`
        INSERT INTO bodegas (id, name, status)
        VALUES (@id, @name, @status)
      `).run(storage);
      return storage;
    },
    async updateStorage(storage) {
      const result = db.prepare(`
        UPDATE bodegas
        SET name = @name, status = @status
        WHERE id = @id
      `).run(storage);
      return result.changes > 0;
    },
    async updateStorageStatus(id, status) {
      return db.prepare(`UPDATE bodegas SET status = ? WHERE id = ?`).run(status, id).changes > 0;
    },
    async deleteStorage(id) {
      return db.prepare(`DELETE FROM bodegas WHERE id = ?`).run(id).changes > 0;
    },
    async createTask(task) {
      db.prepare(`
        INSERT INTO tareas (id, title, area, date, status)
        VALUES (@id, @title, @area, @date, @status)
      `).run(task);
      return task;
    },
    async updateTask(task) {
      const result = db.prepare(`
        UPDATE tareas
        SET title = @title, area = @area, date = @date, status = @status
        WHERE id = @id
      `).run(task);
      return result.changes > 0;
    },
    async updateTaskStatus(id, status) {
      return db.prepare(`UPDATE tareas SET status = ? WHERE id = ?`).run(status, id).changes > 0;
    },
    async deleteTask(id) {
      return db.prepare(`DELETE FROM tareas WHERE id = ?`).run(id).changes > 0;
    },
    async createIncident(incident) {
      db.prepare(`
        INSERT INTO incidentes (id, description, level, status, date, source)
        VALUES (@id, @description, @level, @status, @date, @source)
      `).run(incident);
      return incident;
    },
    async updateIncident(incident) {
      const result = db.prepare(`
        UPDATE incidentes
        SET description = @description, level = @level, status = @status, date = @date, source = @source
        WHERE id = @id
      `).run(incident);
      return result.changes > 0;
    },
    async updateIncidentStatus(id, status) {
      return db.prepare(`UPDATE incidentes SET status = ? WHERE id = ?`).run(status, id).changes > 0;
    },
    async deleteIncident(id) {
      return db.prepare(`DELETE FROM incidentes WHERE id = ?`).run(id).changes > 0;
    }
  };
}

function createPostgresStore() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });

  async function query(text, params = []) {
    return pool.query(text, params);
  }

  return {
    async init() {
      await query(`
        CREATE TABLE IF NOT EXISTS locales (
          id TEXT PRIMARY KEY,
          number TEXT NOT NULL,
          name TEXT NOT NULL,
          tenant TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          category TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'disponible',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS bodegas (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'disponible',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS tareas (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          area TEXT DEFAULT '',
          date TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'pendiente',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS incidentes (
          id TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          level TEXT NOT NULL DEFAULT 'bajo',
          status TEXT NOT NULL DEFAULT 'abierto',
          date TEXT DEFAULT '',
          source TEXT DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    },
    async getState() {
      const [locales, bodegas, tareas, incidentes] = await Promise.all([
        query(`SELECT id, number, name, tenant, phone, category, status FROM locales ORDER BY created_at DESC`),
        query(`SELECT id, name, status FROM bodegas ORDER BY created_at DESC`),
        query(`SELECT id, title, area, date, status FROM tareas ORDER BY created_at DESC`),
        query(`SELECT id, description, level, status, date, source FROM incidentes ORDER BY created_at DESC`)
      ]);
      return {
        locales: locales.rows,
        bodegas: bodegas.rows,
        tareas: tareas.rows,
        incidentes: incidentes.rows
      };
    },
    async createLocale(locale) {
      await query(
        `INSERT INTO locales (id, number, name, tenant, phone, category, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [locale.id, locale.number, locale.name, locale.tenant, locale.phone, locale.category, locale.status]
      );
      return locale;
    },
    async updateLocale(locale) {
      const result = await query(
        `UPDATE locales SET number = $1, name = $2, tenant = $3, phone = $4, category = $5, status = $6 WHERE id = $7`,
        [locale.number, locale.name, locale.tenant, locale.phone, locale.category, locale.status, locale.id]
      );
      return result.rowCount > 0;
    },
    async updateLocaleStatus(id, status) {
      const result = await query(`UPDATE locales SET status = $1 WHERE id = $2`, [status, id]);
      return result.rowCount > 0;
    },
    async deleteLocale(id) {
      const result = await query(`DELETE FROM locales WHERE id = $1`, [id]);
      return result.rowCount > 0;
    },
    async createStorage(storage) {
      await query(
        `INSERT INTO bodegas (id, name, status) VALUES ($1, $2, $3)`,
        [storage.id, storage.name, storage.status]
      );
      return storage;
    },
    async updateStorage(storage) {
      const result = await query(
        `UPDATE bodegas SET name = $1, status = $2 WHERE id = $3`,
        [storage.name, storage.status, storage.id]
      );
      return result.rowCount > 0;
    },
    async updateStorageStatus(id, status) {
      const result = await query(`UPDATE bodegas SET status = $1 WHERE id = $2`, [status, id]);
      return result.rowCount > 0;
    },
    async deleteStorage(id) {
      const result = await query(`DELETE FROM bodegas WHERE id = $1`, [id]);
      return result.rowCount > 0;
    },
    async createTask(task) {
      await query(
        `INSERT INTO tareas (id, title, area, date, status) VALUES ($1, $2, $3, $4, $5)`,
        [task.id, task.title, task.area, task.date, task.status]
      );
      return task;
    },
    async updateTask(task) {
      const result = await query(
        `UPDATE tareas SET title = $1, area = $2, date = $3, status = $4 WHERE id = $5`,
        [task.title, task.area, task.date, task.status, task.id]
      );
      return result.rowCount > 0;
    },
    async updateTaskStatus(id, status) {
      const result = await query(`UPDATE tareas SET status = $1 WHERE id = $2`, [status, id]);
      return result.rowCount > 0;
    },
    async deleteTask(id) {
      const result = await query(`DELETE FROM tareas WHERE id = $1`, [id]);
      return result.rowCount > 0;
    },
    async createIncident(incident) {
      await query(
        `INSERT INTO incidentes (id, description, level, status, date, source) VALUES ($1, $2, $3, $4, $5, $6)`,
        [incident.id, incident.description, incident.level, incident.status, incident.date, incident.source]
      );
      return incident;
    },
    async updateIncident(incident) {
      const result = await query(
        `UPDATE incidentes SET description = $1, level = $2, status = $3, date = $4, source = $5 WHERE id = $6`,
        [incident.description, incident.level, incident.status, incident.date, incident.source, incident.id]
      );
      return result.rowCount > 0;
    },
    async updateIncidentStatus(id, status) {
      const result = await query(`UPDATE incidentes SET status = $1 WHERE id = $2`, [status, id]);
      return result.rowCount > 0;
    },
    async deleteIncident(id) {
      const result = await query(`DELETE FROM incidentes WHERE id = $1`, [id]);
      return result.rowCount > 0;
    }
  };
}

const store = hasPostgres ? createPostgresStore() : createSqliteStore();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: hasPostgres ? "postgres" : "sqlite" });
});

app.get("/api/state", async (_req, res) => {
  res.json(await store.getState());
});

app.post("/api/locales", async (req, res) => {
  const locale = validateLocale(req.body);
  if (!locale.number || !locale.name) return badRequest(res, "Numero y nombre son obligatorios.");
  res.status(201).json(await store.createLocale(locale));
});

app.put("/api/locales/:id", async (req, res) => {
  const locale = validateLocale({ ...req.body, id: req.params.id });
  if (!locale.number || !locale.name) return badRequest(res, "Numero y nombre son obligatorios.");
  const ok = await store.updateLocale(locale);
  if (!ok) return res.status(404).json({ error: "Local no encontrado." });
  res.json(locale);
});

app.patch("/api/locales/:id/status", async (req, res) => {
  const ok = await store.updateLocaleStatus(req.params.id, sanitizeString(req.body.status));
  if (!ok) return res.status(404).json({ error: "Local no encontrado." });
  res.json({ ok: true });
});

app.delete("/api/locales/:id", async (req, res) => {
  const ok = await store.deleteLocale(req.params.id);
  if (!ok) return res.status(404).json({ error: "Local no encontrado." });
  res.status(204).end();
});

app.post("/api/bodegas", async (req, res) => {
  const storage = validateStorage(req.body);
  if (!storage.name) return badRequest(res, "El nombre es obligatorio.");
  res.status(201).json(await store.createStorage(storage));
});

app.put("/api/bodegas/:id", async (req, res) => {
  const storage = validateStorage({ ...req.body, id: req.params.id });
  if (!storage.name) return badRequest(res, "El nombre es obligatorio.");
  const ok = await store.updateStorage(storage);
  if (!ok) return res.status(404).json({ error: "Bodega no encontrada." });
  res.json(storage);
});

app.patch("/api/bodegas/:id/status", async (req, res) => {
  const ok = await store.updateStorageStatus(req.params.id, sanitizeString(req.body.status));
  if (!ok) return res.status(404).json({ error: "Bodega no encontrada." });
  res.json({ ok: true });
});

app.delete("/api/bodegas/:id", async (req, res) => {
  const ok = await store.deleteStorage(req.params.id);
  if (!ok) return res.status(404).json({ error: "Bodega no encontrada." });
  res.status(204).end();
});

app.post("/api/tareas", async (req, res) => {
  const task = validateTask(req.body);
  if (!task.title) return badRequest(res, "El titulo es obligatorio.");
  res.status(201).json(await store.createTask(task));
});

app.put("/api/tareas/:id", async (req, res) => {
  const task = validateTask({ ...req.body, id: req.params.id });
  if (!task.title) return badRequest(res, "El titulo es obligatorio.");
  const ok = await store.updateTask(task);
  if (!ok) return res.status(404).json({ error: "Tarea no encontrada." });
  res.json(task);
});

app.patch("/api/tareas/:id/status", async (req, res) => {
  const ok = await store.updateTaskStatus(req.params.id, sanitizeString(req.body.status));
  if (!ok) return res.status(404).json({ error: "Tarea no encontrada." });
  res.json({ ok: true });
});

app.delete("/api/tareas/:id", async (req, res) => {
  const ok = await store.deleteTask(req.params.id);
  if (!ok) return res.status(404).json({ error: "Tarea no encontrada." });
  res.status(204).end();
});

app.post("/api/incidentes", async (req, res) => {
  const incident = validateIncident(req.body);
  if (!incident.description) return badRequest(res, "La descripcion es obligatoria.");
  res.status(201).json(await store.createIncident(incident));
});

app.put("/api/incidentes/:id", async (req, res) => {
  const incident = validateIncident({ ...req.body, id: req.params.id });
  if (!incident.description) return badRequest(res, "La descripcion es obligatoria.");
  const ok = await store.updateIncident(incident);
  if (!ok) return res.status(404).json({ error: "Incidente no encontrado." });
  res.json(incident);
});

app.patch("/api/incidentes/:id/status", async (req, res) => {
  const ok = await store.updateIncidentStatus(req.params.id, sanitizeString(req.body.status));
  if (!ok) return res.status(404).json({ error: "Incidente no encontrado." });
  res.json({ ok: true });
});

app.delete("/api/incidentes/:id", async (req, res) => {
  const ok = await store.deleteIncident(req.params.id);
  if (!ok) return res.status(404).json({ error: "Incidente no encontrado." });
  res.status(204).end();
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

store.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Panel comercial disponible en http://localhost:${PORT} usando ${hasPostgres ? "Postgres" : "SQLite"}`);
  });
}).catch((error) => {
  console.error("No se pudo iniciar la base de datos:", error);
  process.exit(1);
});

