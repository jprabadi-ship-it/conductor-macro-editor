import { MACRO_ACTIONS } from './key-codes.js';
import { pickKey } from './key-picker.js';

let state = null;
let onChangeCallback = null;

export function initMacroEditor(appState, onChange) {
  state = appState;
  onChangeCallback = onChange;
}

export function renderMacroList() {
  const list = document.getElementById('macro-list');
  const macros = state.macros;

  list.innerHTML = `
    <div class="panel-header">
      <h2>Macros</h2>
      <button class="btn-add" id="btn-add-macro">+ New</button>
    </div>
    <div class="macro-items">
      ${macros.map((m, i) => `
        <div class="macro-item ${state.selectedMacro === i ? 'selected' : ''}" data-idx="${i}">
          <span class="macro-name">&amp;${m.name}</span>
          <span class="macro-steps">${m.bindings.length} steps</span>
        </div>
      `).join('')}
      ${macros.length === 0 ? '<div class="empty-msg">No macros defined</div>' : ''}
    </div>
  `;

  list.querySelectorAll('.macro-item').forEach(el => {
    el.onclick = () => {
      state.selectedMacro = parseInt(el.dataset.idx);
      renderMacroList();
      renderMacroDetail();
    };
  });

  document.getElementById('btn-add-macro').onclick = addMacro;
}

function addMacro() {
  let name = 'm_new';
  let suffix = 1;
  const names = new Set(state.macros.map(m => m.name));
  while (names.has(name)) { name = `m_new_${suffix++}`; }

  state.macros.push({
    name,
    waitMs: 30,
    tapMs: 30,
    bindings: []
  });
  state.selectedMacro = state.macros.length - 1;
  state.dirty = true;
  renderMacroList();
  renderMacroDetail();
  onChangeCallback();
}

export function renderMacroDetail() {
  const detail = document.getElementById('macro-detail');
  if (state.selectedMacro == null || !state.macros[state.selectedMacro]) {
    detail.innerHTML = '<div class="empty-msg">Select a macro to edit</div>';
    return;
  }

  const macro = state.macros[state.selectedMacro];
  const assignments = state.assignments[macro.name] || [];

  detail.innerHTML = `
    <div class="panel-header">
      <h2>Edit Macro</h2>
      <button class="btn-delete" id="btn-delete-macro">Delete</button>
    </div>
    <div class="macro-props">
      <label>Name: <input type="text" id="macro-name" value="${macro.name}" pattern="[a-z_][a-z0-9_]*"></label>
      <label>Wait (ms): <input type="number" id="macro-wait" value="${macro.waitMs}" min="0" max="5000"></label>
      <label>Tap (ms): <input type="number" id="macro-tap" value="${macro.tapMs}" min="0" max="5000"></label>
    </div>
    ${assignments.length > 0 ? `
      <div class="macro-assignments">
        <h3>Assigned to:</h3>
        ${assignments.map(a => `<span class="assignment-badge">Layer ${a.layer} / Pos ${a.position}</span>`).join(' ')}
      </div>
    ` : ''}
    <div class="binding-steps">
      <h3>Steps</h3>
      <div id="steps-list">
        ${macro.bindings.map((step, i) => renderStep(step, i)).join('')}
      </div>
      <button class="btn-add-step" id="btn-add-step">+ Add Step</button>
    </div>
  `;

  document.getElementById('macro-name').onchange = e => {
    const oldName = macro.name;
    macro.name = e.target.value.replace(/[^a-z0-9_]/g, '');
    e.target.value = macro.name;
    if (state.assignments[oldName]) {
      state.assignments[macro.name] = state.assignments[oldName];
      delete state.assignments[oldName];
    }
    state.dirty = true;
    renderMacroList();
    onChangeCallback();
  };

  document.getElementById('macro-wait').onchange = e => {
    macro.waitMs = parseInt(e.target.value) || 30;
    state.dirty = true;
    onChangeCallback();
  };

  document.getElementById('macro-tap').onchange = e => {
    macro.tapMs = parseInt(e.target.value) || 30;
    state.dirty = true;
    onChangeCallback();
  };

  document.getElementById('btn-delete-macro').onclick = () => {
    if (!confirm(`Delete macro "${macro.name}"?`)) return;
    state.macros.splice(state.selectedMacro, 1);
    state.selectedMacro = null;
    state.dirty = true;
    renderMacroList();
    renderMacroDetail();
    onChangeCallback();
  };

  document.getElementById('btn-add-step').onclick = addStep;

  document.querySelectorAll('.step-action').forEach(sel => {
    sel.onchange = e => {
      const idx = parseInt(e.target.dataset.idx);
      const step = macro.bindings[idx];
      step.action = e.target.value;
      if (step.action === 'macro_wait_time') {
        delete step.behavior;
        delete step.param;
        step.ms = step.ms || 100;
      } else {
        delete step.ms;
        step.behavior = step.behavior || 'kp';
        step.param = step.param || 'SPACE';
      }
      state.dirty = true;
      renderMacroDetail();
      onChangeCallback();
    };
  });

  document.querySelectorAll('.step-pick-key').forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.idx);
      const key = await pickKey();
      if (key) {
        macro.bindings[idx].param = key;
        state.dirty = true;
        renderMacroDetail();
        onChangeCallback();
      }
    };
  });

  document.querySelectorAll('.step-wait-input').forEach(inp => {
    inp.onchange = e => {
      const idx = parseInt(e.target.dataset.idx);
      macro.bindings[idx].ms = parseInt(e.target.value) || 100;
      state.dirty = true;
      onChangeCallback();
    };
  });

  document.querySelectorAll('.step-remove').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx);
      macro.bindings.splice(idx, 1);
      state.dirty = true;
      renderMacroDetail();
      onChangeCallback();
    };
  });

  document.querySelectorAll('.step-up').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx);
      if (idx > 0) {
        [macro.bindings[idx-1], macro.bindings[idx]] = [macro.bindings[idx], macro.bindings[idx-1]];
        state.dirty = true;
        renderMacroDetail();
        onChangeCallback();
      }
    };
  });

  document.querySelectorAll('.step-down').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx);
      if (idx < macro.bindings.length - 1) {
        [macro.bindings[idx], macro.bindings[idx+1]] = [macro.bindings[idx+1], macro.bindings[idx]];
        state.dirty = true;
        renderMacroDetail();
        onChangeCallback();
      }
    };
  });
}

function renderStep(step, idx) {
  const actionOptions = MACRO_ACTIONS.map(a =>
    `<option value="${a.value}" ${step.action === a.value ? 'selected' : ''}>${a.label}</option>`
  ).join('');

  let paramHtml;
  if (step.action === 'macro_wait_time') {
    paramHtml = `<input type="number" class="step-wait-input" data-idx="${idx}" value="${step.ms}" min="1" max="10000"> ms`;
  } else {
    paramHtml = `<button class="step-pick-key btn-key" data-idx="${idx}">${step.param || '?'}</button>`;
  }

  return `
    <div class="step-row">
      <span class="step-num">${idx + 1}</span>
      <select class="step-action" data-idx="${idx}">${actionOptions}</select>
      <span class="step-param">${paramHtml}</span>
      <div class="step-controls">
        <button class="step-up" data-idx="${idx}" title="Move up">&#9650;</button>
        <button class="step-down" data-idx="${idx}" title="Move down">&#9660;</button>
        <button class="step-remove" data-idx="${idx}" title="Remove">&times;</button>
      </div>
    </div>
  `;
}

function addStep() {
  const macro = state.macros[state.selectedMacro];
  macro.bindings.push({ action: 'macro_tap', behavior: 'kp', param: 'SPACE' });
  state.dirty = true;
  renderMacroDetail();
  onChangeCallback();
}
