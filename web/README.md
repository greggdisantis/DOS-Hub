# DOS Hub Web Frontend

Production-ready web frontend for DOS Hub office staff using React + React Router.

## Quick Start

### Development

```bash
cd web
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

Output will be in the `dist/` directory.

## Project Structure

```
web/
├── src/
│   ├── pages/           # Page components (Login, Dashboard, etc.)
│   ├── components/      # Reusable components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and helpers
│   ├── styles/          # Global styles
│   ├── App.tsx          # Main app component with routing
│   └── main.tsx         # Entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Features

- **React Router v6** - Client-side routing
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **tRPC** - Type-safe API client
- **Authentication** - Session-based auth with cookies

## Environment Variables

Create a `.env.local` file:

```
VITE_API_URL=http://localhost:3000
```

## API Connection

The web frontend connects to the backend API at `/api`. The Vite dev server proxies requests to the backend.

In production, the backend serves the web frontend from `/` and the API from `/api`.

## Authentication

- Login with email and password
- Session token stored in HTTP-only cookies
- Protected routes redirect to login if not authenticated

## Development

### Add a New Page

1. Create a new file in `src/pages/`
2. Add a route in `src/App.tsx`
3. Use `<ProtectedRoute>` wrapper for authenticated pages

### Add a New Component

1. Create a new file in `src/components/`
2. Import and use in your pages

### Add a New Hook

1. Create a new file in `src/hooks/`
2. Export the hook and use in components

## Building for Production

```bash
npm run build
```

The built files are in `dist/` and ready to be served by the backend.

## Deployment

The web frontend is deployed as part of the backend Docker container. The backend serves the `dist/` folder as static files.

See the main project README for deployment instructions.
