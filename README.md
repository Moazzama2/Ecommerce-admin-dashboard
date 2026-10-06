# Admin Dashboard (React)

Web admin panel for the Ecommerce backend — login, live overview, orders,
products, categories, customers, announcements.

## Stack

| Concern | Choice |
|---|---|
| Build | Vite 7 + React 19 (JavaScript) |
| UI | MUI 7 (`@mui/material`, `@mui/x-data-grid`, `@mui/x-charts`) |
| Routing | React Router 7 |
| Server state | TanStack Query 5 |
| Client state | Zustand (session only) |
| HTTP | Axios (cookie refresh interceptor) |
| Realtime | socket.io-client (live order feed) |

## Getting started

```bash
# 1. backend (port 5000)
cd backend
npm run dev

# 2. dashboard (port 3000)
cd dashboard
npm install
npm run dev
```

Open http://localhost:3000 — the Vite proxy forwards `/api` and
`/socket.io` to `localhost:5000`, so no CORS setup is needed locally.

### Create an admin account

```bash
cd backend
node --env-file=.env src/scripts/create_admin.js you@example.com "Your Name" "some-password"
```

Running it again with an existing email just promotes that user to admin.

## Environment

`dashboard/.env`:

```
VITE_API_URL=   # empty → use the Vite proxy / same origin
```

`backend/.env` (add this):

```
CORS_ORIGINS=http://localhost:3000,https://admin.example.com
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server on :3000 with proxy + HMR |
| `npm run build` | production bundle → `dist/` |
| `npm run preview` | serve the built bundle |

## Layout

```
src/
├── api/            # one module per backend resource
│   ├── client.js   # axios instance + 401 → /refresh → replay
│   ├── token.js    # access token lives in memory only
│   └── socket.js   # shared socket.io connection
├── store/auth.js   # Zustand session store (login/bootstrap/logout)
├── routes/         # AppRoutes + RequireAuth / RequireAdmin
├── layouts/        # sidebar + topbar shell (opens the socket)
├── components/     # StatCard, StatusChip, ConfirmDialog, StateViews…
└── pages/          # Login, Overview, Orders, OrderDetail, Products,
                    # Categories, Customers, Notifications, Profile
```

## Auth flow

1. `POST /api/users/login` → access token (memory) + httpOnly refresh cookie
2. Axios interceptor: on `401` → single-flight `POST /api/users/refresh` → replay
3. Reload of the app restores the session from the cookie (silent refresh)
4. `RequireAuth` guards every screen; `RequireAdmin` checks `role === 'admin'`
5. `POST /api/users/logout` revokes the refresh token and clears the cookie

## Live order feed

The layout opens one socket (auth token sent on every reconnect). The
server puts admins in an `admins` room and emits:

- `order:new` — a customer placed an order
- `order:updated` — status changed / cancelled

Overview and Orders listen for both and invalidate their TanStack Query
caches, so tables and KPIs update without a refresh.
