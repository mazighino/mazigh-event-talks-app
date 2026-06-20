# BigQuery Release Pulse

A highly polished web application that aggregates, parses, categorizes, and shares Google Cloud BigQuery release notes in real-time. Built with a **Python Flask** backend and a custom **vanilla CSS/JavaScript** frontend using rich dark-mode aesthetics, responsive layout, and interactive X (Twitter) sharing integrations.

## Features

- **Automatic XML Feed Parsing**: Fetches the official Google Cloud BigQuery release notes RSS/Atom feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) and parses it on the backend.
- **Granular Update Splitting**: Automatically breaks down bundled daily release entries into individual updates (e.g. splitting distinct Features, Announcements, and Issues/Fixes).
- **Interactive Stats Dashboard**: Displays real-time counts of parsed updates, new features, announcements, and issues in the current feed.
- **Client-Side Live Filtering & Search**: Offers instantaneous text search and interactive category filters (All, Features, Announcements, Issues) with smooth transitions.
- **X (Twitter) Sharing Modal**: Extracts update details, automatically cleans HTML tags, trims content to fit limits, provides a character count progress indicator, and generates direct social sharing intent links.
- **Direct Card Deep Linking**: Allows copying deep links to specific update cards (e.g., `/#card-tag_google_com_2016_bigquery-release-notes_June_15_2026_feature-0`) for targeted sharing.
- **Intelligent Back-End Caching**: Caches parsed feed items for 5 minutes (`CACHE_TTL = 300`) to guarantee instantaneous loading times, with an override trigger via the "Refresh Feed" button.

## File Structure

- [app.py](file:///C:/Users/fujitsu/agy-cli-projects/app.py): Flask application script, parsing RSS XML, cache routing, and server endpoint configurations.
- [templates/index.html](file:///C:/Users/fujitsu/agy-cli-projects/templates/index.html): HTML shell featuring structured semantics, control boards, statistics layout, and the composer modal.
- [static/css/style.css](file:///C:/Users/fujitsu/agy-cli-projects/static/css/style.css): Custom stylesheet providing dark theme palettes, glassmorphism filters, responsive grids, and visual animations.
- [static/js/app.js](file:///C:/Users/fujitsu/agy-cli-projects/static/js/app.js): Core interactive logic handling AJAX calls, stat counts, client-side queries, custom X composer rendering, and copying deep links.

## How to Run

The application runs using the `uv` Python package manager to handle managed Python versions and virtual dependencies dynamically.

To start the server manually, run:
```bash
uv run --with flask --with beautifulsoup4 --with requests python app.py
```

Then, open your web browser and navigate to:
```
http://127.0.0.1:5000
```
