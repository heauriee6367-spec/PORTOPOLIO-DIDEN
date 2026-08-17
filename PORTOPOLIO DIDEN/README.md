Portfolio server

This repository contains a simple Node.js portfolio site with Vercel serverless API routes.

API endpoints (must live in `api/` folder):
- GET /api/health — health check
- GET /api/github — fetches GitHub profile + repos
- POST /api/contact — contact form (sends email via Gmail when configured)

Requirements
- Node.js 18+ and npm

Setup (local)
1. Install dependencies:

   npm install

2. Create a `.env` file:

   PORT=3000
   GITHUB_USERNAME=heauriee6367-spec
   GMAIL_USER=your-gmail@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password
   CONTACT_TO_EMAIL=diden6367@gmail.com

3. Run locally:

   npm start

Deploy on Vercel
1. In Vercel project settings, set **Root Directory** to `PORTOPOLIO DIDEN`.
2. Ensure API files are in `PORTOPOLIO DIDEN/api/` (not at project root).
3. Add these **Environment Variables** in Vercel → Settings → Environment Variables:

   | Variable | Value |
   |----------|-------|
   | GMAIL_USER | your Gmail address |
   | GMAIL_APP_PASSWORD | Gmail App Password (16 chars) |
   | CONTACT_TO_EMAIL | diden6367@gmail.com |
   | GITHUB_USERNAME | heauriee6367-spec |

4. Gmail App Password setup:
   - Enable 2-Step Verification on your Google account
   - Go to https://myaccount.google.com/apppasswords
   - Create an app password for "Mail"
   - Use that 16-character password as GMAIL_APP_PASSWORD (not your regular Gmail password)

5. Redeploy after adding env vars.

6. Test endpoints:
   - https://your-site.vercel.app/api/health
   - https://your-site.vercel.app/api/github

Important
- Do NOT put `contact.js`, `github.js`, or `health.js` at the project root. They must be inside the `api/` folder for Vercel to recognize them.
- If `/api/contact` returns 404, the `api/` folder structure is wrong or Root Directory is misconfigured.
