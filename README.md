# STRATA — Renovation & Design Studio

A premium, dark, architectural **home remodeling & renovation** website. Static site (HTML / CSS / vanilla JS) — no build step required.

## Highlights
- Dark charcoal + warm bronze theme, Cormorant Garamond + Manrope typography
- Cinematic hero with auto-switching desktop (16:9) / mobile (9:16) video
- Videos: autoplay, muted, `playsinline`, seamless loop with restart failsafe, lazy-loaded, paused off-screen for smooth scrolling
- Editorial scroll-reveal animations with a no-JS / observer failsafe (content never stays hidden)
- "Add to List" / Save feature with slide-out drawer (persists via `localStorage`)
- Fully responsive, mobile-first, zero horizontal overflow, no layout shift
- Accessible contact form with validation, `tel:` / `mailto:` links

## Structure
```
index.html          # single smooth-scroll page
css/styles.css      # theme + responsive layout
js/main.js          # video handling, reveals, save feature, form
assets/img/         # 5 project images
assets/video/       # hero, craft, living (desktop + mobile), detail
```

## Run locally
```bash
python -m http.server 8080
# open http://localhost:8080
```

## Notes
- Phone `+1 (415) 555-0142` and email `hello@stratastudio.com` are **placeholders** — replace with real details.
- Footer social icons (Google / Instagram / X) are shown but unlinked until real URLs are provided.
