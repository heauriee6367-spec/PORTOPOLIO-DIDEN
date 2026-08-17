const https = require('https');

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'portfolio-site',
        Accept: 'application/vnd.github+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
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

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const username = (req.query && req.query.username) || process.env.GITHUB_USERNAME || 'heauriee6367-spec';

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

    res.status(200).json({
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
    });
  } catch (error) {
    console.error(error);
    res.status(502).json({ message: 'GitHub API unavailable' });
  }
};
