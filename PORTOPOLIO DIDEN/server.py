import json
import os
import re
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / 'data' / 'contact-submissions.json'
DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
if not DATA_FILE.exists():
    DATA_FILE.write_text('[]', encoding='utf-8')

PORT = int(os.environ.get('PORT', '3000'))

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
}


def read_submissions():
    with DATA_FILE.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def write_submissions(data):
    with DATA_FILE.open('w', encoding='utf-8') as handle:
        json.dump(data, handle, indent=2)


class PortfolioHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            self._send_json(HTTPStatus.OK, {'status': 'ok'})
            return

        if parsed.path == '/api/github':
            self._handle_github(parsed.query)
            return

        path = parsed.path
        if path == '/':
            path = '/index.html'
        file_path = ROOT / path.lstrip('/')
        if not str(file_path).startswith(str(ROOT)):
            self._send_text(HTTPStatus.FORBIDDEN, 'Forbidden')
            return

        if file_path.exists() and file_path.is_file():
            self._send_file(file_path)
        else:
            self._send_text(HTTPStatus.NOT_FOUND, 'Not Found')

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/contact':
            self._handle_contact()
            return

        self._send_text(HTTPStatus.NOT_FOUND, 'Not Found')

    def _handle_contact(self):
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length).decode('utf-8') if length else '{}'
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self._send_json(HTTPStatus.BAD_REQUEST, {'message': 'Invalid JSON request body.'})
            return

        errors = []
        if not payload.get('name', '').strip() or len(payload.get('name', '').strip()) < 2:
            errors.append('Nama minimal 2 karakter.')
        email = payload.get('email', '').strip()
        if not re.match(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
            errors.append('Email tidak valid.')
        subject = payload.get('subject', '').strip()
        if len(subject) < 5:
            errors.append('Subjek minimal 5 karakter.')
        message = payload.get('message', '').strip()
        if len(message) < 10:
            errors.append('Pesan minimal 10 karakter.')

        if errors:
            self._send_json(HTTPStatus.BAD_REQUEST, {'message': errors[0]})
            return

        submissions = read_submissions()
        submissions.append({
            'id': str(len(submissions) + 1),
            'name': payload['name'].strip(),
            'email': email,
            'subject': subject,
            'message': message,
            'createdAt': __import__('datetime').datetime.utcnow().isoformat() + 'Z'
        })
        write_submissions(submissions)
        print(f'New contact submission: {payload["name"].strip()}')
        self._send_json(HTTPStatus.CREATED, {'message': 'Pesan berhasil dikirim. Terima kasih!'})

    def _handle_github(self, query_string):
        params = parse_qs(query_string)
        username = params.get('username', ['heauriee6367-spec'])[0]
        try:
            profile_request = Request(
                f'https://api.github.com/users/{username}',
                headers={'User-Agent': 'portfolio-site', 'Accept': 'application/vnd.github+json'}
            )
            repos_request = Request(
                f'https://api.github.com/users/{username}/repos?per_page=6&sort=updated',
                headers={'User-Agent': 'portfolio-site', 'Accept': 'application/vnd.github+json'}
            )
            with urlopen(profile_request) as profile_response, urlopen(repos_request) as repos_response:
                profile = json.load(profile_response)
                repos = json.load(repos_response)
        except Exception as exc:
            self._send_json(HTTPStatus.BAD_GATEWAY, {'message': 'GitHub API unavailable'})
            return

        simplified_repos = [
            {
                'name': repo.get('name'),
                'description': repo.get('description'),
                'html_url': repo.get('html_url'),
                'stargazers_count': repo.get('stargazers_count', 0),
                'forks_count': repo.get('forks_count', 0),
                'language': repo.get('language'),
                'updated_at': repo.get('updated_at'),
            }
            for repo in repos
        ]
        self._send_json(HTTPStatus.OK, {
            'profile': {
                'login': profile.get('login'),
                'name': profile.get('name') or profile.get('login'),
                'bio': profile.get('bio'),
                'public_repos': profile.get('public_repos', 0),
                'followers': profile.get('followers', 0),
                'following': profile.get('following', 0),
                'avatar_url': profile.get('avatar_url'),
                'html_url': profile.get('html_url'),
            },
            'repositories': simplified_repos,
        })

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, file_path):
        content = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', self._mime_type(file_path))
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _send_text(self, status, text):
        body = text.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _mime_type(self, file_path):
        return MIME_TYPES.get(file_path.suffix.lower(), 'application/octet-stream')

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    server = ThreadingHTTPServer(('0.0.0.0', PORT), PortfolioHandler)
    print(f'Portfolio server listening on http://localhost:{PORT}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
