Portfolio server

This repository contains a simple Node.js/Express portfolio server that serves a static HTML site and provides two API endpoints:

- GET /api/github — fetches GitHub profile + repos for the configured username (GITHUB_USERNAME env or default in code)
- POST /api/contact — contact form endpoint which validates input and (optionally) sends email via Gmail using nodemailer when GMAIL_USER and GMAIL_APP_PASSWORD are set

Requirements
- Node.js 18+ and npm

Setup
1. Install Node.js (LTS 18+): https://nodejs.org/
2. In the project folder, install dependencies:

   npm install

3. Create a .env file in the project root with any of the following variables as needed:

   PORT=3000
   GITHUB_USERNAME=heauriee6367-spec
   GMAIL_USER=youremail@gmail.com
   GMAIL_APP_PASSWORD=your_app_password  # or an app password
   CONTACT_TO_EMAIL=yourdest@example.com

Run locally

   npm start

The server will start at http://localhost:3000 and serve the static site index.html.

Testing the endpoints (example curl)

Health check:

   curl http://localhost:3000/health

Fetch GitHub (replace username if using different env):

   curl http://localhost:3000/api/github

Contact form (example):

   curl -X POST http://localhost:3000/api/contact \
     -H "Content-Type: application/json" \
     -d '{"name":"Tester","email":"test@example.com","subject":"Hello","message":"This is a test"}'

Notes
- The contact endpoint will return an error if GMAIL_USER/GMAIL_APP_PASSWORD are not configured. For development you can inspect server logs and index.html form which submits to /api/contact.
- The server uses node's global fetch API; Node 18+ is recommended.
