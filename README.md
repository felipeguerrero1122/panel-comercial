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

Este proyecto ya quedo preparado para desplegarse en Render con:

- `render.yaml`
- `DATA_DIR` para guardar la base SQLite fuera del codigo
- disco persistente en `/var/data`

Pasos:

1. Sube esta carpeta a GitHub.
2. En Render crea un nuevo servicio desde ese repositorio.
3. Render detectara `render.yaml`.
4. Cuando termine el deploy, la app quedara disponible en una URL publica.

Nota:

- Render indica que los discos persistentes solo estan disponibles en servicios pagos.
- Sin disco persistente, SQLite perderia datos en cada redeploy o reinicio.
