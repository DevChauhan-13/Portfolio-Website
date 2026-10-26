# Devdrome — Dev Chauhan's Portfolio

A CRT-television-styled portfolio website, cloned from scratch in the spirit of
[galekto.com](https://galekto.com): barrel-warped TV bezel, film grain, scanlines,
a WebGL stable-fluids ink canvas on the landing page, slot-machine typography,
page transitions, hidden games (Snake / Pong / Space Invaders) and a UFO cursor
on the contact page.

**Live projects featured (all real):**

1. **ReLoop** — carbon-aware B2B circular-packaging exchange · [live](https://reloop-gamma.vercel.app) · [repo](https://github.com/DevChauhan-13/ReLoop)
2. **Meridian** — multi-asset portfolio optimization engine (Min-Variance / Max-Sharpe / Risk Parity) · [live](https://meridian-peach-iota.vercel.app) · [repo](https://github.com/DevChauhan-13/Meridian)
3. **ResilientQA** — self-healing Playwright test-automation framework (rule-based + Random-Forest locator healing) · [repo](https://github.com/DevChauhan-13/ResillientQA)
4. **VeriPhi** — Chrome extension for real-time LLM hallucination flagging · [site](https://veriphii.vercel.app) · [repo](https://github.com/DevChauhan-13/VeriPhi)
5. **Autonomous Disaster-Relief Robot** — RIACT conference paper (Nirma University) · [PDF](assets/RIACT-Conference-Paper.pdf)

## Structure

```
index.html            landing (fluid ink, slot name, TV preloader)
projects.html         project list + floating cursor card
artworks.html         artwork grid
contact.html          contact page + working contact form
projects/*.html       thin case-study shells (content comes from JSON)
assets/
  data/content.json   ← all project content lives here (single source of truth)
  js/                 transition, fluid sim, list/detail renderers, games, form
  css/                per-page styles
  images/             portraits, project screenshots, generated diagrams
api/contact.js        Vercel serverless function — emails the contact form to Gmail
package.json          nodemailer dependency for the contact function
robots.txt, sitemap.xml
```

## Local development

Any static server works:

```bash
python -m http.server 8123
# → http://127.0.0.1:8123
```

Note: the contact form's serverless function only runs on Vercel (`vercel dev`
if you need it locally). Locally the form falls back to opening the visitor's
mail client — by design, never a fake success.

## Deployment (Vercel)

1. Push this repo to GitHub and import it on [vercel.com](https://vercel.com) —
   the static site and the `api/` function are auto-detected; `nodemailer`
   installs from `package.json`. No build settings needed.
2. Add environment variables (Project → Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `GMAIL_USER` | your Gmail address |
   | `GMAIL_APP_PASSWORD` | 16-char Gmail **App Password** (Google Account → Security → 2-Step Verification → App passwords) |
   | `CONTACT_TO` | *(optional)* different recipient; defaults to `GMAIL_USER` |

3. **Redeploy** after adding the variables, then send yourself a test message
   from the live contact page (check spam once).

## Editing project content

All case-study text and images live in `assets/data/content.json` — each project
is one entry with a `blocks` array (`statement`, `chapter`, `imageFullBleed`,
`imageDuo`, `stats`, `process`, `keyInsight`, …). Each project also needs a thin
shell `projects/<slug>.html` (copy an existing one, change the `<title>`) and a
row in `sitemap.xml`. When changing content, bump the `content.json?v=N` cache
parameter in `assets/js/content-client.js` and the `content-client.js?v=N`
script tags in the HTML files.
