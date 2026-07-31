# IvyVideo front-end

React 19 + TypeScript + Vite SPA for the IvyVideo video hosting platform.

See the [root README](../README.md) for setup and deployment instructions.

## Local development

```sh
npm install
npm run dev
```

Set `VITE_API_URL` (defaults to `http://localhost:8000`) to point at the API:

```
VITE_API_URL=http://localhost:8000
```

## Scripts

- `npm run dev` — dev server with hot reload
- `npm run build` — type-check + production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — ESLint
