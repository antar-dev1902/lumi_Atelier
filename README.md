# Lumi's Atelier

An interactive portfolio for Lumi, an original moth fashion designer. Built for Track 2 of Baby's First Website: a tiny atelier of forgotten fabrics, illustrated memories, and linen-bound collections.

Enter through a retro television, pull back the curtains, and follow Lumi from her grandmother's attic to her own studio. Her runway repair becomes the first look in a catalogue you can actually open and explore.

## Inside the atelier

- Six illustrated origin scenes with scroll-driven motion, short narration, pause, and mute controls.
- An articulated moth character that flies between the cushion and books, lands with a contact shadow, and responds to visitors.
- Three interactive collections: **Attic Reverie**, **City Lines**, and **Petal Parade**, with four locally bundled outfits in each.
- Catalogue page turns, touch swipes, keyboard navigation, original vector garment studies, editable sketch colours, and saved favourites.
- A rearrangeable worktable, lamp switch, authored studio conversation, returning-visitor greeting, and hidden first-design discovery.
- Shared guestbook notes and a deduplicated visitor counter, with an explicitly labelled device-only fallback when the API is unavailable.
- Phone, tablet, and laptop layouts; reduced-motion support; locally bundled fonts and photographs.

## Run locally

Use Node.js 22.12 or newer, or Node.js 20.19 or newer.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. This starts Vite and the local Node API together.

For the production build:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:4174**. On Windows, `START-PATCH.cmd` starts development; `START-PREVIEW.cmd` installs dependencies if needed, builds, and starts the production preview.

The local server stores notes and visitor records in `.data/archive.json` using serialized atomic writes. `PORT`, `HOST`, and `PATCH_DATA_DIR` configure the server. Local data and installed dependencies are excluded from Git.

## Deploy to Vercel

1. Import [this repository](https://github.com/antar-dev1902/lumi_Atelier) at [vercel.com/new](https://vercel.com/new).
2. Use the repository root, the **Vite** preset, `npm ci` to install, `npm run build` to build, and `dist` as the output directory. These settings are included in `vercel.json`.
3. Connect **Upstash Redis** from Vercel's Storage/Marketplace to this project. Enable its server-side variables for Production and Preview.
4. Deploy or redeploy after connecting storage.
5. Open `/api/health` on the production URL. A healthy configured backend returns `{"ok":true,"storage":"redis"}`.

The API accepts either `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or `KV_REST_API_URL` and `KV_REST_API_TOKEN`. `.env.example` contains empty placeholders only. Keep database credentials in Vercel's server-side environment settings, without a `VITE_` prefix.

Vercel serves the frontend from `dist` and rewrites `/api/*` to `api/archive.js`. Its function stores shared notes, visitor hashes, and rate limits in Redis. Preview and Production use separate namespaces. No local guestbook records are uploaded automatically. See [VERCEL.md](VERCEL.md) for the full deployment checklist.

## Stack and source

| Area | Implementation |
| --- | --- |
| Interface | React 19, JavaScript/JSX, Vite 8, custom CSS |
| Character and scenes | SVG, Canvas 2D, custom WebGL/GLSL, spring animation |
| Audio | Web Audio ambience and effects; optional browser speech narration |
| Local backend | Node.js HTTP server with JSON-file persistence |
| Vercel backend | Node.js Vercel Function with Upstash Redis REST storage |
| Browser persistence | `localStorage` for favourites, preferences, and visitor identity |
| Fonts | Fraunces, DM Sans, Space Mono, bundled locally |

```text
src/                 React interface, scenes, character, catalogues, styles
public/              Local artwork, outfit photos, fonts, and licence notices
server/index.mjs     Local production server and shared API
server/vercel-api.mjs Vercel API and Redis adapter
api/archive.js       Vercel Function entry point
scripts/             Development launcher and regression checks
ASSET_SOURCES.json   Photograph sources and licences
SUBMISSION.md        Character sheet and hackathon build description
```

Studio conversations use authored dialogue. They do not call an LLM service.

## Verification

```sh
npm run build
npm run test:api
npm run test:narration
npm run test:vercel
npm run test:ui
npm run test:mobile
npm run test:atelier
```

The API suite checks validation, duplicate visitors, compression, and persistence across server restarts. The Vercel suite checks request validation, origin checks, methods, body limits, and unavailable-storage behaviour. Its live Redis checks run only when server-side Redis variables are provided; they use an isolated QA namespace.

The browser suites check all twelve photographs, catalogue interactions, rendered Lumi visibility, narration controls, touch targets, responsive layouts, book-click flight, and reversible runway stages. They require Node.js 22+ and Chrome. Set `PATCH_CHROME_PATH` if Chrome is installed outside the script's default Windows location. `QA_SCREENSHOTS=1` enables local diagnostic captures, which are excluded from Git.

Chrome emulation does not replace physical-device testing. `test:performance` provides browser timing evidence rather than a Lighthouse score. Production Redis connectivity must be checked on the deployed Vercel project.

## Artwork and credits

Lumi, her career, and the collection narratives are fictional. The real outfit photographs illustrate the fictional collections; this project does not claim to have designed or photographed those garments. Photographer, source, and licence records are available in **Behind the studio** and [ASSET_SOURCES.json](ASSET_SOURCES.json).

Original character, studio, prop, and pose art was made with OpenAI image generation. Garment studies, interface, character articulation, and synthesized sound were developed for this project. Font licences and third-party package notices are included in `public/credits` and the bundled font directories.
