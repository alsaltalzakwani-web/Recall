# Recall

A spaced-repetition review scheduler for students. Subjects → lessons → 1/3/7/14/28-day
review checkpoints, with auto-calculated next review dates and multi-select "completed with"
tags. Checkpoints are marked off in order — only the next due one can be checked, and only
the most recently checked one can be undone. No accounts — all data is saved locally in the
browser (per device).

Built in the Etqan visual style: cream background, terracotta accent, sage green, and the
Doran typeface, branded with the Etqan logo. Arabic-only, full RTL, with an Eastern/Western
numerals (١٢٣ / 123) toggle.

## Running locally

It's a static site — no build step. Serve the folder with any static file server, e.g.:

```
npx serve .
```

or just open `index.html` directly in a browser (local storage still works from `file://`).

## Deploying

This repo includes `.github/workflows/deploy.yml`, which publishes the site to GitHub Pages
automatically on every push to the repository's default branch. One-time setup:

1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to the **Actions** tab, open the most recent "Deploy Recall to GitHub Pages" run,
   and click **Re-run all jobs**.

This step has to be done by a repo admin from the web UI — the workflow's own token is not
permitted to create the Pages site, so the deploy fails at "Setup Pages" until Pages is
switched on.

The live URL will be **https://alsaltalzakwani-web.github.io/Recall/** (also shown on the
finished workflow run and in Settings → Pages).

## Project structure

```
index.html          Page shell + header (Etqan logo, tagline, numerals toggle)
css/style.css        Etqan-branded styles, RTL via CSS logical properties
js/i18n.js           Arabic strings + locale-aware number/date formatting
js/storage.js        localStorage read/write helpers
js/app.js            App state, rendering, and event wiring
assets/etqan-logo.jpg Etqan brand logo, shown in the header
assets/fonts/         Doran webfont (woff2, 5 weights)
```

## Data

Subjects and lessons are stored under the `recall.subjects.v1` key in `localStorage`;
the numerals preference under `recall.settings.v1`. Nothing leaves the browser —
clearing site data or switching browsers/devices starts fresh.
