const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const nodemailer = require('nodemailer');
require('dotenv').config();

const port = process.env.PORT || 3000;
const rootDir = __dirname;
const dataFile = path.join(rootDir, 'data', 'contact-submissions.json');

if (!fs.existsSync(path.dirname(dataFile))) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
}

function ensureDataFile() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '[]', 'utf8');
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

function readJsonFile() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeJsonFile(data) {
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON request body.'));
      }
    });
    req.on('error', reject);
  });
}

function validateContactPayload(payload) {
  const errors = [];
  if (!payload.name || payload.name.trim().length < 2) {
    errors.push('Nama minimal 2 karakter.');
  }
  if (!payload.email || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(payload.email)) {
    errors.push('Email tidak valid.');
  }
  if (!payload.subject || payload.subject.trim().length < 5) {
    errors.push('Subjek minimal 5 karakter.');
  }
  if (!payload.message || payload.message.trim().length < 10) {
    errors.push('Pesan minimal 10 karakter.');
  }
  return errors;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'portfolio-site',
        Accept: 'application/vnd.github+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`GitHub request failed with status ${res.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error('Unable to parse GitHub response.'));
        }
      });
    });

    req.setTimeout(8000, () => {
      req.destroy(new Error('GitHub request timed out.'));
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Invalid request' }));
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'POST' && requestUrl.pathname === '/api/contact') {
    try {
      const payload = await parseBody(req);
      const errors = validateContactPayload(payload);
      if (errors.length) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: errors[0] }));
        return;
      }

      const submissions = readJsonFile();
      submissions.push({
        id: `${Date.now()}`,
        name: payload.name.trim(),
        email: payload.email.trim(),
        subject: payload.subject.trim(),
        message: payload.message.trim(),
        createdAt: new Date().toISOString()
      });
      writeJsonFile(submissions);

      let message = 'Pesan diterima. Terima kasih!';
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        });

        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: process.env.CONTACT_TO_EMAIL || process.env.GMAIL_USER,
          replyTo: payload.email.trim(),
          subject: `Portofolio pesan: ${payload.subject.trim()}`,
          text: [
            `Nama: ${payload.name.trim()}`,
            `Email: ${payload.email.trim()}`,
            `Subjek: ${payload.subject.trim()}`,
            '',
            payload.message.trim()
          ].join('\n'),
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h3>Pesan dari portofolio</h3>
              <p><strong>Nama:</strong> ${payload.name.trim()}</p>
              <p><strong>Email:</strong> ${payload.email.trim()}</p>
              <p><strong>Subjek:</strong> ${payload.subject.trim()}</p>
              <hr />
              <p>${payload.message.trim().replace(/\n/g, '<br />')}</p>
            </div>
          `
        });
        message = 'Pesan berhasil dikirim. Saya akan membalas secepatnya.';
      } else {
        console.warn('Gmail credentials are not configured. Contact submission saved locally only.');
        message = 'Pesan diterima, tetapi notifikasi email belum aktif. Tambahkan GMAIL_USER dan GMAIL_APP_PASSWORD untuk mengirim lewat Gmail.';
      }

      console.log(`New contact submission: ${payload.name.trim()}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message }));
      return;
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: error.message }));
      return;
    }
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/github') {
    const username = requestUrl.searchParams.get('username') || 'heauriee6367-spec';
    try {
      const [profile, repos] = await Promise.all([
        requestJson(`https://api.github.com/users/${username}`),
        requestJson(`https://api.github.com/users/${username}/repos?per_page=6&sort=updated`)
      ]);

      const simplifiedRepos = repos.map((repo) => ({
        name: repo.name,
        description: repo.description,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        language: repo.language,
        updated_at: repo.updated_at
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        profile: {
          login: profile.login,
          name: profile.name || profile.login,
          bio: profile.bio,
          public_repos: profile.public_repos,
          followers: profile.followers,
          following: profile.following,
          avatar_url: profile.avatar_url,
          html_url: profile.html_url
        },
        repos: simplifiedRepos
      }));
      return;
    } catch (error) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'GitHub API unavailable' }));
      return;
    }
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  let requestedPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = path.join(rootDir, requestedPath);

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
});

server.listen(port, () => {
  console.log(`Portfolio server listening on http://localhost:${port}`);
});
