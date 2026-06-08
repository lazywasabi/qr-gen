# AGENTS.md

## Project Overview

This repository is a static Thai web app for generating QR codes. The main use case is mobile-first: open the page on a phone, generate or pre-fill a QR code, and show it to another person to scan. PromptPay remains the default mode, and the app also supports general-purpose text/URL QR codes.

- App entry point: `index.html`
- Supporting files: `styles.css` and `app.js`
- Language: Thai user-facing UI
- Architecture: static HTML/CSS/JavaScript with separate same-folder CSS and JS files
- Package manager preference: use `pnpm` for Node/package commands, never `npm`
- Visual style: clean, modern, minimal, mobile-first
- Runtime assets: `index.html` loads Google Fonts, `qrcodejs@1.0.0`, and Lucide static SVGs from CDNs, plus local favicon and PromptPay icon assets.
- Icons: use static Lucide assets, for example `https://cdn.jsdelivr.net/npm/lucide-static@1.17.0/icons/check.svg`
- PromptPay implementation reference: use the project-local `promptpay-qr` skill at `.codex/skills/promptpay-qr` for EMV TLV fields, PromptPay identifier rules, amount behavior, CRC rules, and validation expectations.

## Current Behavior

- Supports two QR modes:
  - PromptPay: accepts a Thai mobile number or Thai national ID / tax ID, with optional amount.
  - Generic: accepts freeform text or a URL.
- If PromptPay amount is omitted, the payer's banking app should prompt for the amount.
- Supports URL prefill via query params:
  - `?id=0812345678`
  - `?id=0812345678&amount=199.00`
  - `?text=https://example.com`
- Updates the URL as values change so the current QR can be shared or copied.
- Provides mobile-oriented actions for download, native share when available, copy link, and edit/done mode.
- In edit mode, the app hides download/share/copy actions and shows icon-only QR type toggles for PromptPay and generic QR.

## Development Workflow

- No install step is required for the current app.
- Open `index.html` directly in a browser for quick manual checks. A network connection is needed for CDN-loaded QR generation, icons, and fonts unless those assets are cached.
- If a local HTTP server is needed, prefer a `pnpm` command such as `pnpm dlx serve .` or another lightweight static server available in the workspace.
- Keep the app static and no-build unless the user explicitly asks for a build system or the app clearly outgrows this structure.
- After UI changes, check both a narrow mobile viewport and a desktop viewport. The mobile QR display is the primary experience.

## Design Guidelines

- Keep all visible UI text in Thai.
- Design mobile first. Prioritize fast entry, clear QR display, and easy showing/scanning on a phone.
- Avoid marketing-page structure; the first screen should be the usable QR tool.
- Keep the QR code large, centered, high contrast, and free from overlapping UI.
- Use icon buttons for compact actions. Prefer Lucide static SVG files loaded with `<img>`.
- The PromptPay type toggle uses the local `thai-qr-payment-icon-bw.svg` asset.
- Keep the visual direction clean, modern, minimal, and practical.
- Avoid adding decorative complexity that competes with the QR code.

## Validation Expectations

- For PromptPay validation and payload expectations, use `.codex/skills/promptpay-qr/references/promptpay-emv.md`.
- Generic text should be non-empty and limited to 300 characters.
- In generic view mode, show the text below the QR; if it is an absolute `http`/`https` URL, render it as a clickable link.
- For filenames, use `qr-code.png` for generic QR, `qr-promptpay-[id].png` for PromptPay without amount, and `qr-promptpay-[id]-[amount].png` for PromptPay with amount.

## Code Style

- Keep JavaScript small and direct. Prefer local helper functions over adding dependencies.
- Keep CSS in `styles.css` and preserve mobile-first media queries.
- Keep JavaScript in `app.js`; avoid adding dependencies unless requested.
- Use semantic HTML and accessible labels for inputs/buttons.
- Keep comments short and only for non-obvious payment-spec or browser-behavior details.
- Do not introduce a framework, bundler, TypeScript, or package manifest unless the user asks or the app clearly outgrows a no-build static page.

## Maintenance Rule

Update this `AGENTS.md` whenever:

- The app's structure changes, especially if setup or asset loading changes.
- Setup, run, test, build, or dependency commands change.
- PromptPay QR generation rules, supported identifiers, URL parameters, or amount behavior change. Update the `promptpay-qr` skill at the same time.
- Design direction, language, icon source, or mobile-first usage assumptions change.
- Any instruction in this file becomes outdated or misleading.

Treat this file as living project memory for future agents.
