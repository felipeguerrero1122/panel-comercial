const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : __dirname;

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

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

app.use(express.json());
app.use(express.static(__dirname));

const listLocales = db.prepare(`
  SELECT id, number, name, tenant, phone, category, status
  FROM locales
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

const insertLocale = db.prepare(`
  INSERT INTO locales (id, number, name, tenant, phone, category, status)
  VALUES (@id, @number, @name, @tenant, @phone, @category, @status)
`);
const updateLocale = db.prepare(`
  UPDATE locales
  SET number = @number,
      name = @name,
      tenant = @tenant,
      phone = @phone,
      category = @category,
      status = @status
  WHERE id = @id
`);
const deleteLocale = db.prepare(`DELETE FROM locales WHERE id = ?`);

const insertTask = db.prepare(`
  INSERT INTO tareas (id, title, area, date, status)
  VALUES (@id, @title, @area, @date, @status)
`);
const updateTask = db.prepare(`
  UPDATE tareas
  SET title = @title,
      area = @area,
      date = @date,
      status = @status
  WHERE id = @id
`);
const deleteTask = db.prepare(`DELETE FROM tareas WHERE id = ?`);

const insertIncident = db.prepare(`
  INSERT INTO incidentes (id, description, level, status, date, source)
  VALUES (@id, @description, @level, @status, @date, @source)
`);
const updateIncident = db.prepare(`
  UPDATE incidentes
  SET description = @description,
      level = @level,
      status = @status,
      date = @date,
      source = @source
  WHERE id = @id
`);
const deleteIncident = db.prepare(`DELETE FROM incidentes WHERE id = ?`);

function createId() {
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function sanitizeString(value) {
  return String(value || "").trim();
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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/state", (_req, res) => {
  res.json({
    locales: listLocales.all(),
    tareas: listTareas.all(),
    incidentes: listIncidentes.all()
  });
});

app.post("/api/locales", (req, res) => {
  const locale = validateLocale(req.body);
  if (!locale.number || !locale.name) return badRequest(res, "Numero y nombre son obligatorios.");
  insertLocale.run(locale);
  res.status(201).json(locale);
});

app.put("/api/locales/:id", (req, res) => {
  const locale = validateLocale({ ...req.body, id: req.params.id });
  if (!locale.number || !locale.name) return badRequest(res, "Numero y nombre son obligatorios.");
  const result = updateLocale.run(locale);
  if (!result.changes) return res.status(404).json({ error: "Local no encontrado." });
  res.json(locale);
});

app.patch("/api/locales/:id/status", (req, res) => {
  const status = sanitizeString(req.body.status);
  const result = db.prepare("UPDATE locales SET status = ? WHERE id = ?").run(status, req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Local no encontrado." });
  res.json({ ok: true });
});

app.delete("/api/locales/:id", (req, res) => {
  const result = deleteLocale.run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Local no encontrado." });
  res.status(204).end();
});

app.post("/api/tareas", (req, res) => {
  const task = validateTask(req.body);
  if (!task.title) return badRequest(res, "El titulo es obligatorio.");
  insertTask.run(task);
  res.status(201).json(task);
});

app.put("/api/tareas/:id", (req, res) => {
  const task = validateTask({ ...req.body, id: req.params.id });
  if (!task.title) return badRequest(res, "El titulo es obligatorio.");
  const result = updateTask.run(task);
  if (!result.changes) return res.status(404).json({ error: "Tarea no encontrada." });
  res.json(task);
});

app.patch("/api/tareas/:id/status", (req, res) => {
  const status = sanitizeString(req.body.status);
  const result = db.prepare("UPDATE tareas SET status = ? WHERE id = ?").run(status, req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Tarea no encontrada." });
  res.json({ ok: true });
});

app.delete("/api/tareas/:id", (req, res) => {
  const result = deleteTask.run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Tarea no encontrada." });
  res.status(204).end();
});

app.post("/api/incidentes", (req, res) => {
  const incident = validateIncident(req.body);
  if (!incident.description) return badRequest(res, "La descripcion es obligatoria.");
  insertIncident.run(incident);
  res.status(201).json(incident);
});

app.put("/api/incidentes/:id", (req, res) => {
  const incident = validateIncident({ ...req.body, id: req.params.id });
  if (!incident.description) return badRequest(res, "La descripcion es obligatoria.");
  const result = updateIncident.run(incident);
  if (!result.changes) return res.status(404).json({ error: "Incidente no encontrado." });
  res.json(incident);
});

app.patch("/api/incidentes/:id/status", (req, res) => {
  const status = sanitizeString(req.body.status);
  const result = db.prepare("UPDATE incidentes SET status = ? WHERE id = ?").run(status, req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Incidente no encontrado." });
  res.json({ ok: true });
});

app.delete("/api/incidentes/:id", (req, res) => {
  const result = deleteIncident.run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Incidente no encontrado." });
  res.status(204).end();
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "INDEX.html"));
});

app.listen(PORT, () => {
  console.log(`Panel comercial disponible en http://localhost:${PORT}`);
});
