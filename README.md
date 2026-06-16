# GES MARKETİM

Solar dropshipping e-commerce — **gesmarketim.com**.

Budget channel for product-only solar sales. Sister site **gespaenerji.com** handles the premium / installation channel.

---

## Stack

| Layer        | Tech                                   |
|--------------|----------------------------------------|
| Frontend     | React + Vite + TypeScript              |
| Backend      | Node + Express + TypeScript            |
| ORM          | Drizzle ORM                            |
| Database     | PostgreSQL                             |
| Deploy       | GitHub → Railway (auto-deploy on push) |
| Pkg manager  | **npm only** (no pnpm, no yarn)        |

---

## Project layout

```
gesmarketim/
├── frontend/          # React + Vite app (storefront + admin UI shell)
│   ├── src/
│   │   ├── pages/     # Home, Admin
│   │   └── ...
│   └── package.json
├── backend/           # Express API + Drizzle
│   ├── src/
│   │   ├── routes/    # health, (products, admin, ... to come)
│   │   ├── db/        # client, schema
│   │   └── index.ts
│   └── package.json
├── package.json       # npm workspaces, top-level scripts
├── .env.example       # all env vars documented in one place
└── README.md
```

---

## Quick start

```bash
# 1. Install all workspace deps
npm run install:all

# 2. Copy env files (root is the canonical reference; each workspace reads its own)
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Start a local Postgres (any way you like), put the URL into backend/.env

# 4. Run both apps in parallel
npm run dev
#   frontend → http://localhost:5173
#   backend  → http://localhost:3000  (health: /api/health)
```

---

## Scripts (root)

| Script                | What it does                                     |
|-----------------------|--------------------------------------------------|
| `npm run install:all` | Install root + frontend + backend deps           |
| `npm run dev`         | Run frontend and backend in parallel             |
| `npm run dev:frontend`| Vite dev server only                             |
| `npm run dev:backend` | Express + tsx watch only                         |
| `npm run build`       | Build both workspaces                            |
| `npm run start`       | Production start (backend serves frontend dist)  |
| `npm run db:generate` | Generate Drizzle migrations from schema          |
| `npm run db:migrate`  | Apply pending migrations                         |
| `npm run db:studio`   | Open Drizzle Studio                              |

---

## Deployment (Railway)

This monorepo is designed to deploy as a **single Railway service** for simplicity:

1. `npm run build` builds both `frontend/dist` and `backend/dist`.
2. `npm run start` boots the Express server, which serves the API under `/api/*` and the built React app under `/`.
3. Railway provides `DATABASE_URL` and `PORT` automatically when you attach a PostgreSQL plugin.

**Required Railway env vars:**

| Var                    | Notes                              |
|------------------------|------------------------------------|
| `DATABASE_URL`         | Provided by the Railway PG plugin  |
| `NODE_ENV`             | `production`                       |
| `CORS_ORIGIN`          | `https://gesmarketim.com`          |
| `ADMIN_SESSION_SECRET` | Generate a strong random string    |
| `ADMIN_USERNAME`       | Admin login                        |
| `ADMIN_PASSWORD`       | Admin password                     |

> If you later want to split frontend and backend into separate services, point each Railway service at the matching workspace directory and set its build/start commands accordingly.

---

## Conventions / non-obvious rules

- **Suppliers are admin-only.** Names like *Mexxsun* and *Enerji Pazarı* must never appear in storefront responses or HTML. *Brands* (DEYE, LEXRON, EVE) are customer-visible.
- **Bulk / seed endpoints use an allowlist filter.** Before any write that takes a multi-field payload, intersect the incoming keys with an explicit `ALLOWED_FIELDS` set. A previous deploy 500'd because of unfiltered extra fields — don't repeat it.
- **npm only.** A `pnpm-lock.yaml` or `yarn.lock` in this repo is a bug; the `.gitignore` excludes them.
---

## API surface

**Public (storefront)**

| Method & path | Purpose |
|---|---|
| `GET /api/health` | Liveness check |
| `GET /api/categories` | Active tenant categories |
| `GET /api/brands` | Customer-visible brands |
| `GET /api/products` | Product list — filters: `category`, `brand`, `inStock`, `q`, `minPrice`, `maxPrice`, `sort` (`name`/`price_asc`/`price_desc`/`newest`) |
| `GET /api/products/:slug` | Single product |
| `POST /api/orders` | Create an order from a cart (prices re-validated server-side) |
| `GET /api/orders/:number` | Order lookup for the confirmation page |

**Admin (cookie-gated — `POST /api/admin/login` first)**

`GET /stats` · products `GET/POST/PATCH/DELETE` · categories / brands / suppliers
`GET/POST/PATCH/DELETE` · orders `GET` + `PATCH` (status). Auth is a stateless
HMAC-signed session cookie keyed on `ADMIN_SESSION_SECRET` (see `src/lib/auth.ts`).

## Storefront / admin UI

- **Storefront:** home, categories, category page, product list (live search +
  category/brand/stock/price filters + sort), product detail, **cart**,
  **checkout**, **order confirmation**. Cart is localStorage-persisted.
- **Admin (`/admin`):** login → dashboard (revenue/orders/products stats),
  product CRUD with auto-priced `finalPrice`, order management with status flow,
  and catalog structure (categories / brands / suppliers).

---

## Status

> **Functional storefront + admin.** Catalog API, cart/checkout/orders, and a
> cookie-gated admin panel are implemented. Run `npm run db:migrate` then
> `npm run db:seed` to populate the tenant, taxonomy and a sample catalogue.
> Possible next steps: online payment integration, supplier sync automation,
> product image uploads, and customer accounts.
