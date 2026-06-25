import { GitHubClient } from './github.js';
import { parseKeymap } from './parser.js';
import { spliceKeymap, generateDiff } from './serializer.js';
import { initMacroEditor, renderMacroList, renderMacroDetail } from './macro-editor.js';
import { initLayerView, renderLayerView } from './layer-view.js';
import { initKeyPicker } from './key-picker.js';
import { startDeviceFlow, pollForToken, isConfigured } from './oauth.js';

const gh = new GitHubClient();

const state = {
  macros: [],
  layers: [],
  assignments: {},
  parsed: null,
  selectedMacro: null,
  selectedLayer: 0,
  branch: '',
  dirty: false,
  originalSource: ''
};

async function init() {
  initKeyPicker();
  initMacroEditor(state, onMacroChange);
  initLayerView(state, onLayerAssign);

  setupAuth();
  setupCommit();

  window.addEventListener('beforeunload', e => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  document.getElementById('btn-cover-login').onclick = () => {
    document.getElementById('btn-login').click();
  };

  if (gh.hasToken) {
    try {
      await showLoggedInUser();
      showMainApp();
      await loadRepos();
      await loadBranches();
    } catch (e) { /* token might be expired */ }
  }
}

function setupAuth() {
  // Device Flow (primary)
  const loginBtn = document.getElementById('btn-login');
  if (isConfigured()) {
    loginBtn.onclick = startOAuthLogin;
  } else {
    loginBtn.textContent = 'PAT';
    loginBtn.onclick = showPatModal;
  }

  // PAT fallback
  document.getElementById('btn-pat-toggle').onclick = showPatModal;

  document.getElementById('btn-auth').onclick = async () => {
    const token = document.getElementById('token-input').value.trim();
    if (!token || token === '••••••••') return;
    gh.setToken(token);
    document.getElementById('pat-modal').classList.remove('active');
    try {
      await showLoggedInUser();
      await loadRepos();
      showStatus('Authenticated', 'success');
    } catch (e) {
      showStatus(e.message, 'error');
    }
  };

  document.getElementById('pat-cancel').onclick = () => {
    document.getElementById('pat-modal').classList.remove('active');
  };

  document.getElementById('device-cancel').onclick = () => {
    document.getElementById('device-flow-modal').classList.remove('active');
  };

  document.getElementById('btn-logout').onclick = () => {
    localStorage.removeItem('gh_pat');
    gh.token = '';
    document.getElementById('auth-area').style.display = '';
    document.getElementById('user-area').style.display = 'none';
    document.getElementById('repo-select').innerHTML = '<option>Select repo...</option>';
    document.getElementById('repo-select').disabled = true;
    document.getElementById('branch-select').innerHTML = '<option>Select branch...</option>';
    document.getElementById('branch-select').disabled = true;
    document.getElementById('btn-fetch').disabled = true;
    document.getElementById('cover').style.display = '';
    document.getElementById('main-app').style.display = 'none';
    showStatus('Logged out', 'info');
  };

  document.getElementById('btn-fetch').onclick = fetchKeymap;
}

function showPatModal() {
  document.getElementById('pat-modal').classList.add('active');
  document.getElementById('token-input').focus();
}

async function startOAuthLogin() {
  try {
    showStatus('Starting login...', 'info');
    const data = await startDeviceFlow();

    const modal = document.getElementById('device-flow-modal');
    const userCode = data.user_code;
    document.getElementById('device-code').textContent = userCode;
    const link = document.getElementById('device-link');
    link.href = data.verification_uri || 'https://github.com/login/device';
    const device_code = data.device_code;

    const copyBtn = document.getElementById('btn-copy-code');
    copyBtn.textContent = 'Copy';
    copyBtn.style.color = '';
    copyBtn.style.borderColor = '';
    document.getElementById('device-waiting').classList.add('polling');
    modal.classList.add('active');

    const token = await pollForToken(device_code);
    modal.classList.remove('active');

    gh.setToken(token);
    await showLoggedInUser();
    await loadRepos();
    showStatus('Logged in via GitHub', 'success');
  } catch (e) {
    document.getElementById('device-flow-modal').classList.remove('active');
    showStatus(e.message, 'error');
  }
}

async function loadRepos() {
  const repos = await gh.listRepos();
  const select = document.getElementById('repo-select');
  const saved = `${gh.owner}/${gh.repo}`;
  select.innerHTML = repos.map(r => {
    const label = r.private ? `${r.full_name} 🔒` : r.full_name;
    return `<option value="${r.full_name}" ${r.full_name === saved ? 'selected' : ''}>${label}</option>`;
  }).join('');
  select.disabled = false;

  select.onchange = async () => {
    const [owner, repo] = select.value.split('/');
    gh.setRepo(owner, repo);
    await loadBranches();
  };

  if (select.value) {
    const [owner, repo] = select.value.split('/');
    gh.setRepo(owner, repo);
    await loadBranches();
  }
}

async function showLoggedInUser() {
  const user = await gh.getUser();
  document.getElementById('auth-area').style.display = 'none';
  document.getElementById('user-area').style.display = '';
  document.getElementById('user-avatar').src = user.avatar_url;
  document.getElementById('user-name').textContent = user.login;
  showMainApp();
}

function showMainApp() {
  document.getElementById('cover').style.display = 'none';
  document.getElementById('main-app').style.display = '';
}

async function loadBranches() {
  const branches = await gh.listBranches();
  const select = document.getElementById('branch-select');
  select.innerHTML = branches.map(b =>
    `<option value="${b}" ${b.includes('dongle') ? 'selected' : ''}>${b}</option>`
  ).join('');
  select.disabled = false;
  document.getElementById('btn-fetch').disabled = false;
}

async function fetchKeymap() {
  const branch = document.getElementById('branch-select').value;
  if (!branch) return;
  state.branch = branch;

  try {
    showStatus('Fetching keymap...', 'info');
    const source = await gh.fetchKeymap(branch);
    state.originalSource = source;

    const parsed = parseKeymap(source);
    state.parsed = parsed;
    state.macros = JSON.parse(JSON.stringify(parsed.macros));
    state.layers = JSON.parse(JSON.stringify(parsed.layers));
    state.assignments = parsed.assignments;
    state.selectedMacro = state.macros.length > 0 ? 0 : null;
    state.selectedLayer = 0;
    state.dirty = false;

    renderAll();
    showStatus(`Loaded from ${branch} — ${state.macros.length} macro(s)`, 'success');
  } catch (e) {
    showStatus(e.message, 'error');
  }
}

function renderAll() {
  renderMacroList();
  renderMacroDetail();
  renderLayerView();
  renderDiff();
}

function onMacroChange() {
  state.assignments = rebuildAssignments();
  renderLayerView();
  renderDiff();
}

function onLayerAssign(layerIdx, position) {
  if (state.selectedMacro == null) {
    showStatus('Select a macro first', 'error');
    return;
  }

  const macro = state.macros[state.selectedMacro];
  const layer = state.layers[layerIdx];
  const currentBinding = layer.bindings[position];
  const macroRef = `&${macro.name}`;

  if (currentBinding === macroRef) {
    layer.bindings[position] = '&none';
  } else {
    layer.bindings[position] = macroRef;
  }

  state.dirty = true;
  state.assignments = rebuildAssignments();
  renderLayerView();
  renderMacroDetail();
  renderDiff();
}

function rebuildAssignments() {
  const assignments = {};
  const macroNames = new Set(state.macros.map(m => m.name));

  state.layers.forEach((layer, layerIdx) => {
    layer.bindings.forEach((binding, posIdx) => {
      const ref = binding.startsWith('&') ? binding.slice(1) : null;
      if (ref && macroNames.has(ref)) {
        if (!assignments[ref]) assignments[ref] = [];
        assignments[ref].push({ layer: layerIdx, layerName: layer.name, position: posIdx });
      }
    });
  });
  return assignments;
}

function renderDiff() {
  const diffEl = document.getElementById('diff-preview');
  if (!state.parsed) {
    diffEl.innerHTML = '';
    return;
  }

  const modified = spliceKeymap(state.parsed, state.macros, state.layers);
  const diffs = generateDiff(state.originalSource, modified);

  if (diffs.length === 0) {
    diffEl.innerHTML = '<div class="diff-empty">No changes</div>';
    document.getElementById('btn-commit').disabled = true;
    return;
  }

  document.getElementById('btn-commit').disabled = false;
  diffEl.innerHTML = diffs.map(d => {
    const cls = d.type === 'add' ? 'diff-add' : 'diff-remove';
    const prefix = d.type === 'add' ? '+' : '-';
    return `<div class="${cls}">${prefix} ${escHtml(d.text)}</div>`;
  }).join('');
}

function setupCommit() {
  document.getElementById('btn-commit').onclick = async () => {
    if (!state.dirty && !confirm('No changes detected. Commit anyway?')) return;

    const modified = spliceKeymap(state.parsed, state.macros, state.layers);
    const msg = document.getElementById('commit-msg').value.trim()
      || 'Update macros via conductor-macro-editor';

    try {
      showStatus('Committing...', 'info');
      await gh.commitKeymap(state.branch, modified, msg);
      state.originalSource = modified;
      state.parsed = parseKeymap(modified);
      state.dirty = false;
      renderDiff();
      const actionsUrl = `https://github.com/${gh.owner}/${gh.repo}/actions`;
      showStatus('Committed!', 'success');
      document.getElementById('commit-status').innerHTML = `<a href="${actionsUrl}" target="_blank">Actions でビルド状況を確認 →</a>`;
    } catch (e) {
      showStatus(e.message, 'error');
    }
  };
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.innerHTML = msg;
  el.className = `status status-${type}`;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', init);
