const API = 'https://api.github.com';

export class GitHubClient {
  constructor() {
    this.token = localStorage.getItem('gh_pat') || '';
    this.owner = localStorage.getItem('gh_owner') || 'jprabadi-ship-it';
    this.repo = localStorage.getItem('gh_repo') || 'conductor-private';
    this.fileSha = null;
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('gh_pat', token);
  }

  setRepo(owner, repo) {
    this.owner = owner;
    this.repo = repo;
    localStorage.setItem('gh_owner', owner);
    localStorage.setItem('gh_repo', repo);
  }

  get hasToken() {
    return this.token.length > 0;
  }

  async _fetch(path, opts = {}) {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...opts.headers
      }
    });
    if (res.status === 401) throw new Error('Authentication failed — check your PAT');
    if (res.status === 404) throw new Error('Not found — check repo/branch name');
    if (res.status === 409 || res.status === 422) throw new Error('Conflict — file was modified externally. Re-fetch and try again.');
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async listBranches() {
    const branches = await this._fetch(`/repos/${this.owner}/${this.repo}/branches?per_page=100`);
    return branches.map(b => b.name).sort();
  }

  async fetchKeymap(branch) {
    const data = await this._fetch(
      `/repos/${this.owner}/${this.repo}/contents/config/monokey.keymap?ref=${encodeURIComponent(branch)}`
    );
    this.fileSha = data.sha;
    return atob(data.content.replace(/\n/g, ''));
  }

  async commitKeymap(branch, content, message) {
    const encoded = btoa(unescape(encodeURIComponent(content)));
    const data = await this._fetch(
      `/repos/${this.owner}/${this.repo}/contents/config/monokey.keymap`,
      {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: encoded,
          sha: this.fileSha,
          branch
        })
      }
    );
    this.fileSha = data.content.sha;
    return data;
  }
}
