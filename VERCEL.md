# Deploy Lumi's Atelier to Vercel

The frontend builds with Vite into `dist`. Requests to `/api/*` are rewritten to the Node.js Vercel Function in `api/archive.js`. Shared state uses durable Upstash Redis storage; Vercel does not use the local preview's `.data/archive.json` file.

## GitHub dashboard route

1. Open [Vercel New Project](https://vercel.com/new), connect GitHub, and import `antar-dev1902/lumi_Atelier`.
2. Keep the root directory at `./`. The checked-in `vercel.json` specifies Vite, `npm ci`, `npm run build`, and output directory `dist`.
3. In the project's Storage/Marketplace, connect an Upstash Redis database. Choose a plan without a paid commitment unless you decide otherwise. Apply its environment variables to Production and Preview.
4. Confirm the project has one supported credential pair from the table below. Credentials stay in the dashboard's server-side environment settings.
5. Deploy, or redeploy if storage was added after the first deployment. Git pushes to the configured production branch can then trigger subsequent production builds.

| Supported pair | URL variable | Read/write token variable |
| --- | --- | --- |
| Upstash | `UPSTASH_REDIS_REST_URL` | `UPSTASH_REDIS_REST_TOKEN` |
| KV integration | `KV_REST_API_URL` | `KV_REST_API_TOKEN` |

Use a standard read/write token. Do not put these credentials into source files or prefix them with `VITE_`. `PATCH_REDIS_PREFIX` is optional and defaults to `lumi-atelier`.

## CLI route

From the project root, with Vercel CLI available:

```sh
vercel login
vercel link
```

Connect Redis in the dashboard as described above, then deploy:

```sh
vercel deploy --prod
```

## Verify production

- `/api/health` returns HTTP 200 with `{"ok":true,"storage":"redis"}`.
- Post a marked test note from one browser profile and read it from another.
- Reloading with the same visitor identity does not increase the visitor counter.
- Check Lumi, all three catalogues, and narration on phone and laptop layouts.
- Open the production link in an incognito window to verify the intended public access before submitting it.

Records are separated by `PATCH_REDIS_PREFIX` and `VERCEL_ENV`, so Preview and Production do not share notes. Favourites and preferences remain in browser storage. Existing local QA notes are not migrated to the online database.

Missing or unreachable storage returns an explicit service error. The frontend's personal-device guestbook fallback remains labelled; it is not a shared guestbook.

Run `npm run test:vercel` for function contract checks and `npm run build` for the frontend. Live Redis verification requires configured database variables; live Vercel verification requires a successful deployment.
