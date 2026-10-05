# Autonomic Daily

A private, local-first, installable daily symptom tracker. Data is stored in the browser using IndexedDB. No server, account, analytics, or cloud synchronization is included.

## Features

- Daily quick status and four 0–5 scores
- 72 symptoms in 14 collapsible categories
- Up to 12 pinned symptoms
- Measurements, activity, delayed worsening, cycle pattern, and notes
- Editable history
- Simple trends
- CSV, print/PDF, and JSON backup/import
- Offline-capable PWA
- GitHub Pages workflow

## Run locally

```bash
npm install
npm run dev
```

Production check:

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

1. Create an empty GitHub repository.
2. Upload this project or push it with Git.
3. In the repository, open **Settings > Pages**.
4. Under **Build and deployment**, select **GitHub Actions** as the source.
5. Push to the `main` branch. The included workflow builds and deploys the app.
6. Open the deployment URL shown on the repository's **Actions** or **Deployments** page.

`vite.config.ts` uses `base: './'`, so the built assets work from a repository subpath.

## Install on iPhone

Open the deployed site in Safari. Use **Share > Add to Home Screen**, leave **Open as Web App** enabled, then tap **Add**.

## Privacy and backups

Records remain in this browser profile on this device. Browser-data clearing, private browsing, device loss, or using another browser/device can make records unavailable. Download a JSON backup regularly from **Export**. CSV is intended for analysis, while JSON is intended for complete restoration.

## Medical notice

This project records user-entered observations. It is not a medical device and does not diagnose, interpret fluid retention, or recommend treatment.
