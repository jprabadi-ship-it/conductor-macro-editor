import { GitHubClient } from './github.js';
import { parseKeymap } from './parser.js';
import { spliceKeymap, generateDiff } from './serializer.js';
import { initMacroEditor, renderMacroList, renderMacroDetail } from './macro-editor.js';
import { initLayerView, renderLayerView } from './layer-view.js';
import { initKeyPicker } from './key-picker.js';

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

  if (gh.hasToken) {
    document.getElementById('token-input').value = '••••••••';
    document.getElementById('repo-input').value = `${gh.owner}/${gh.repo}`;
    await loadBranches();
  }
}

function setupAuth() {
  document.getElementById('btn-auth').onclick = async () => {
    const token = document.getElementById('token-input').value.trim();
    if (!token || token === '••••••••') return;
    gh.setToken(token);

    const repoStr = document.getElementById('repo-input').value.trim();
    if (repoStr.includes('/')) {
      const [owner, repo] = repoStr.split('/');
      gh.setRepo(owner, repo);
    }

    try {
      await loadBranches();
      showStatus('Authenticated', 'success');
    } catch (e) {
      showStatus(e.message, 'error');
    }
  };

  document.getElementById('btn-fetch').onclick = fetchKeymap;
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
      showStatus('Committed! CI build will start automatically.', 'success');
    } catch (e) {
      showStatus(e.message, 'error');
    }
  };
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status status-${type}`;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', init);
