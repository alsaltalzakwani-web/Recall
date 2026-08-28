# Recall

A spaced-repetition review scheduler for students. Subjects → lessons → 1/3/7/14/28-day
review checkpoints, with auto-calculated next review dates and multi-select "completed with"
tags. No accounts — all data is saved locally in the browser (per device).

Built in the Etqan visual style: cream background, terracotta/orange accent, sage green,
and the Doran typeface. Full Arabic RTL support with an English/Arabic toggle and an
optional Eastern Arabic numerals (٠١٢٣) toggle.

## Running locally

It's a static site — no build step. Serve the folder with any static file server, e.g.:

```
npx serve .
```

or just open `index.html` directly in a browser (local storage still works from `file://`).

## Deploying

This repo includes `.github/workflows/deploy.yml`, which publishes the site to GitHub Pages
automatically on every push to `main`. One-time setup:

1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or re-run the workflow from the **Actions** tab).

Your live URL will be `https://<owner>.github.io/<repo>/` (shown in the workflow run and in
Settings → Pages once deployed).

## Project structure

```
index.html          Page shell + header (brand, language/numerals toggles)
css/style.css        Etqan-branded styles, RTL via CSS logical properties
js/i18n.js           English/Arabic strings + locale-aware number/date formatting
js/storage.js        localStorage read/write helpers
js/app.js            App state, rendering, and event wiring
assets/fonts/         Doran webfont (woff2, 5 weights)
```

## Data

Subjects and lessons are stored under the `recall.subjects.v1` key in `localStorage`;
language/numerals preferences under `recall.settings.v1`. Nothing leaves the browser —
clearing site data or switching browsers/devices starts fresh.
