# Meredith Brice Marketing — agency studio

Private studio for Meredith's marketing agency (separate from her TikTok Studio), plus two client-facing pages.

- `/` agency studio (passcode, same header `X-Studio-Key` as the TikTok Studio for now)
- `/portal/?k=<24-char key>` a client's private portal: plan, approvals, results, reports. No lead contact details, notes or fees.
- `/inquire/?c=<client key>&ref=instagram` public inquiry form for a client's bios and posts

Backend: n8n workflows in the "Meredith Brice Marketing (agency)" folder (webhooks `mbm-data`, `mbm-action`, `mbm-record`, `mbm-ai`, `mbm-portal`, `mbm-portal-action`, `mbm-form`, `mbm-lead`, plus hourly alerts and error alerts).

Nothing posts, replies or messages on its own. AI only drafts; every piece passes a compliance check and the client's approval, and Meredith posts it herself.

Build: `npm run build` → `netlify-dist` (Netlify runs this from `netlify.toml`).
