# About the project

IvyVideo (IvyHosting) is a **video hosting platform MVP**, inspired by
[Vimeo](https://vimeo.com/) and [PandaVideo](https://www.pandavideo.com.br/).
It is a portfolio project of Pedro Paulo Arimura.

It implements the full loop: **create an account → upload a video → browse the
library → watch it in a streaming player**.

## Technologies

| Layer     | Stack                                             |
| --------- | ------------------------------------------------- |
| Front-end | React 19 + TypeScript + Vite + React Router 7     |
| Back-end  | Python (FastAPI)                                  |
| Database  | PostgreSQL (SQLite fallback for local dev)        |
| Storage   | S3-compatible object storage (R2 / B2, local fallback) |
| Auth      | JWT (PyJWT) + PBKDF2 password hashing             |

## Features

- Sign up / sign in with JWT auth (`localStorage` token)
- Protected upload route
- Video library (public feed, newest first)
- Watch page with a streaming player (HTTP Range requests → seek works)
- Delete your own videos
- Streaming works with a video that has `faststart` (moov atom first)

## Project structure

```
├── api/          # (placeholder for future API gateway / docs)
├── back-end/     # FastAPI application
│   ├── main.py           # app entry, CORS, routers
│   ├── config.py         # env-based configuration
│   ├── database.py       # PostgreSQL / SQLite adapter + schema
│   ├── auth.py           # JWT + password hashing + dependencies
│   ├── storage.py        # S3-compatible / local disk storage
│   └── routers/          # /auth and /videos endpoints
└── front-end/    # React SPA
    └── src/
        ├── pages/        # home, signin, signup, upload, watch
        ├── components/   # header, layout, video card, guards
        ├── services/     # axios API layer (auth, videos)
        └── utils/        # helpers
```

## API endpoints

| Method | Path                  | Description                          |
| ------ | --------------------- | ------------------------------------ |
| POST   | `/auth/signup`        | Create an account, returns JWT       |
| POST   | `/auth/signin`        | Sign in, returns JWT                 |
| GET    | `/auth/me`            | Current user (Bearer token)          |
| POST   | `/videos/upload`      | Upload a video (multipart, auth)     |
| GET    | `/videos`             | List videos (public)                 |
| GET    | `/videos/{id}`        | Video metadata                       |
| GET    | `/videos/{id}/stream` | Video bytes with Range support       |
| DELETE | `/videos/{id}`        | Delete own video (auth)              |
| GET    | `/health`             | Health check                         |

## Run locally

### Back-end

```sh
cd back-end
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs on `http://localhost:8000` (docs at `/docs`). Without a
`DATABASE_URL` it uses a local SQLite file (`data/app.db`) and stores uploaded
files on the local disk (`data/files/`) — no setup needed.

### Front-end

```sh
cd front-end
npm install
npm run dev
```

The app runs on `http://localhost:5173` and calls the API at
`http://localhost:8000` by default. To point it elsewhere set
`VITE_API_URL` in a `.env` file:

```
VITE_API_URL=http://localhost:8000
```

## Deploy for free in production

The stack is designed around free tiers: **Vercel** (front-end),
**Render** (API), **Supabase** (PostgreSQL), **Cloudflare R2** or **Backblaze B2**
(video files).

### 1. Database — Supabase (free)

1. Create a project at [supabase.com](https://supabase.com) (free tier, US East).
2. In **Project Settings → Database → Connection string**, copy the
   **transaction pooler** string (host uses port `6543`), e.g.
   `postgresql://postgres.ivyabc:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres`.
   Use the pooler so Render's waking/sleeping instances don't exhaust
   connections.

### 2. Video storage — Cloudflare R2 (free tier) or Backblaze B2

> Required for durability on Render's free tier: its filesystem is ephemeral,
> so locally stored files are lost when the instance restarts/redeploys.

1. Create a bucket (e.g. `ivyvideo`). Keep it private.
2. Create an API token with read/write access to that bucket.
3. Note the endpoint URL and the access/secret keys.

If you skip this step the API falls back to local disk, which is fine for
testing but not durable on Render free tier.

### 3. Back-end — Render (free)

1. Push this repo to GitHub.
2. In [render.com](https://render.com) → **New → Blueprint**, pick the repo.
   It reads `render.yaml` (root dir `back-end`).
3. After creation, in the service → **Environment** set:
   - `DATABASE_URL` — your Supabase transaction pooler connection string
   - `S3_BUCKET`, `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
     — your storage credentials
   - `CORS_ORIGINS` — your front-end URL (e.g. `https://ivyvideo.vercel.app`)
   - `JWT_SECRET` — auto-generated by the blueprint
4. Save (redeploys automatically). The API URL is `https://<name>.onrender.com`.

Notes: the free instance sleeps after ~15 min of inactivity (first request
after a nap takes a few extra seconds).

### 4. Front-end — Vercel (free)

1. In [vercel.com](https://vercel.com) → **New Project**, import the repo.
2. Root Directory: `front-end` (framework preset: Vite).
3. Environment variable: `VITE_API_URL=https://<your-api>.onrender.com`.
4. Deploy. `vercel.json` adds the SPA rewrite so client-side routes work.

### 5. Done

Sign up at `https://<your-app>.vercel.app/signup`, upload a video, and watch it.

## Configuration reference

| Variable               | Default      | Description                                  |
| ---------------------- | ------------ | -------------------------------------------- |
| `DATABASE_URL`         | *(empty)*    | Postgres DSN (e.g. Supabase pooler); empty → SQLite fallback |
| `JWT_SECRET`           | dev secret   | Secret used to sign tokens                   |
| `JWT_EXPIRES_MINUTES`  | `10080`      | Token lifetime (7 days)                      |
| `DATA_DIR`             | `./data`     | Where SQLite + local files are stored        |
| `STORAGE`              | `auto`       | `auto` \| `local` \| `s3`                    |
| `S3_BUCKET`            | *(empty)*    | Bucket name                                  |
| `S3_ENDPOINT_URL`      | *(empty)*    | S3-compatible endpoint (R2/B2/MinIO)         |
| `S3_ACCESS_KEY_ID`     | *(empty)*    | Access key                                   |
| `S3_SECRET_ACCESS_KEY` | *(empty)*    | Secret key                                   |
| `S3_REGION`            | `auto`       | Region (R2/B2 ignore it)                     |
| `CORS_ORIGINS`         | `*`          | Comma-separated allowed origins              |
| `MAX_UPLOAD_MB`        | `500`        | Max upload size                              |
