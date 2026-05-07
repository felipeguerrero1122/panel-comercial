# Panel Comercial

App web local para administrar:
- Locales
- Tareas de mantenimiento
- Incidentes

## Como usarla

1. Abre una terminal en esta carpeta.
2. Ejecuta:

```bash
npm install
npm start
```

3. Abre en el navegador:

```text
http://localhost:3000
```

## Que hace

- Guarda datos reales en SQLite
- Permite crear, editar, eliminar y cambiar estado
- Incluye filtros y buscador
- Exporta la informacion a JSON

## Archivos importantes

- `INDEX.html`: interfaz
- `server.js`: servidor Express y API
- `panel-comercial.db`: base de datos SQLite, se crea automaticamente al iniciar

## Publicarla sin depender de tu PC

Este proyecto ya quedo preparado para Render usando:

- Web Service `Node`
- Base de datos `Postgres`
- Variable `DATABASE_URL` entregada por Render

Pasos:

1. Sube esta carpeta a GitHub.
2. En Render crea primero una base `Postgres`.
3. Luego crea un `Web Service` desde este repositorio.
4. En el servicio web agrega la variable `DATABASE_URL` con la `Internal Database URL` de Postgres.
5. Cuando termine el deploy, la app quedara disponible en una URL publica.

Nota:

- En local la app sigue usando SQLite.
- En Render usara Postgres automaticamente cuando exista `DATABASE_URL`.
