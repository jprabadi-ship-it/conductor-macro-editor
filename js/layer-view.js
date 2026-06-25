let state = null;
let onAssignCallback = null;

export function initLayerView(appState, onAssign) {
  state = appState;
  onAssignCallback = onAssign;
}

export function renderLayerView() {
  const container = document.getElementById('layer-view');
  const layers = state.layers;

  if (layers.length === 0) {
    container.innerHTML = '<div class="empty-msg">Load a keymap first</div>';
    return;
  }

  const currentLayer = state.selectedLayer || 0;
  const macroNames = new Set(state.macros.map(m => m.name));

  container.innerHTML = `
    <div class="panel-header">
      <h2>Layer View</h2>
      <select id="layer-select">
        ${layers.map((l, i) => `
          <option value="${i}" ${i === currentLayer ? 'selected' : ''}>
            ${i}: ${l.name}
          </option>
        `).join('')}
      </select>
    </div>
    <div class="keyboard-grid">
      ${renderGrid(layers[currentLayer], currentLayer, macroNames)}
    </div>
    <div class="layer-legend">
      <span class="legend-macro">Macro</span>
      <span class="legend-normal">Key</span>
      <span class="legend-none">None</span>
    </div>
  `;

  document.getElementById('layer-select').onchange = e => {
    state.selectedLayer = parseInt(e.target.value);
    renderLayerView();
  };

  container.querySelectorAll('.grid-key').forEach(el => {
    el.onclick = () => {
      const pos = parseInt(el.dataset.pos);
      const layer = state.selectedLayer || 0;
      onAssignCallback(layer, pos);
    };
  });
}

function renderGrid(layer, layerIdx, macroNames) {
  if (!layer) return '';

  const rows = [];
  for (let r = 0; r < 4; r++) {
    const leftKeys = [];
    const rightKeys = [];

    for (let c = 0; c < 10; c++) {
      const pos = r * 10 + c;
      const binding = layer.bindings[pos] || '&none';
      const ref = binding.startsWith('&') ? binding.slice(1) : null;
      const isMacro = ref && macroNames.has(ref);
      const isNone = binding === '&none' || binding === '&trans';
      const isSelected = state.selectedMacro != null &&
        state.macros[state.selectedMacro] &&
        ref === state.macros[state.selectedMacro].name;

      const cls = [
        'grid-key',
        isMacro ? 'key-macro' : isNone ? 'key-none' : 'key-normal',
        isSelected ? 'key-selected' : ''
      ].join(' ');

      const label = isMacro ? `&${ref}` : truncate(binding, 8);
      const keyEl = `<div class="${cls}" data-pos="${pos}" title="${binding}">${label}</div>`;

      if (c < 5) leftKeys.push(keyEl);
      else rightKeys.push(keyEl);
    }

    rows.push(`
      <div class="grid-row">
        <div class="grid-half grid-left">${leftKeys.join('')}</div>
        <div class="grid-half grid-right">${rightKeys.join('')}</div>
      </div>
    `);
  }
  return rows.join('');
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.slice(0, len - 1) + '…';
}
