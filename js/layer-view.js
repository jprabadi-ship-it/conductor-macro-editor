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

  const rowSplits = [
    { left: 5, right: 5 },
    { left: 5, right: 5 },
    { left: 5, right: 5 },
    { left: 6, right: 4 },
  ];

  const leftRows = [];
  const rightRows = [];
  let pos = 0;

  for (let r = 0; r < 4; r++) {
    const split = rowSplits[r];
    const leftKeys = [];
    const rightKeys = [];

    for (let c = 0; c < split.left + split.right; c++) {
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

      const label = isMacro ? `&${ref}` : formatKeyLabel(binding);
      const keyEl = `<div class="${cls}" data-pos="${pos}" title="${binding}">${label}</div>`;

      if (c < split.left) leftKeys.push(keyEl);
      else rightKeys.push(keyEl);
      pos++;
    }

    leftRows.push(`<div class="grid-row">${leftKeys.join('')}</div>`);
    rightRows.push(`<div class="grid-row">${rightKeys.join('')}</div>`);
  }

  return `
    <div class="keyboard-split">
      <div class="keyboard-half keyboard-left">
        <span class="half-label">L</span>
        ${leftRows.join('')}
      </div>
      <div class="keyboard-half keyboard-right">
        <span class="half-label">R</span>
        <div class="right-with-trackball">
          <div class="right-keys">
            ${rightRows.join('')}
          </div>
          <div class="trackball-area">
            <div class="trackball-indicator"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function formatKeyLabel(binding) {
  if (binding === '&none') return '';
  if (binding === '&trans') return '---';

  const ltMatch = binding.match(/^&lt\s+(\d+)\s+(\w+)$/);
  if (ltMatch) return `<span class="key-hold">L${ltMatch[1]}</span>${friendlyKey(ltMatch[2])}`;

  const mtMatch = binding.match(/^&mt\s+(\w+)\s+(\w+)$/);
  if (mtMatch) return `<span class="key-hold">${friendlyMod(mtMatch[1])}</span>${friendlyKey(mtMatch[2])}`;

  const mtShiftMatch = binding.match(/^&mt_shift\s+(\w+)\s+(\w+)$/);
  if (mtShiftMatch) return `<span class="key-hold">${friendlyMod(mtShiftMatch[1])}</span>${friendlyKey(mtShiftMatch[2])}`;

  const kpMatch = binding.match(/^&kp\s+(.+)$/);
  if (kpMatch) return friendlyKey(kpMatch[1]);

  const moMatch = binding.match(/^&mo\s+(\d+)$/);
  if (moMatch) return `L${moMatch[1]}`;

  const togMatch = binding.match(/^&tog\s+(\d+)$/);
  if (togMatch) return `TG${togMatch[1]}`;

  const mkpMatch = binding.match(/^&mkp\s+(\w+)$/);
  if (mkpMatch) return mkpMatch[1];

  if (binding.startsWith('&')) return binding.slice(1);
  return binding;
}

function friendlyKey(key) {
  const map = {
    'SPACE': 'Space', 'ENTER': 'Enter', 'BSPC': 'Bksp', 'DEL': 'Del',
    'TAB': 'Tab', 'ESC': 'Esc', 'CAPS': 'Caps',
    'UP': '↑', 'DOWN': '↓', 'LEFT': '←', 'RIGHT': '→',
    'LSHIFT': 'L Shift', 'RSHIFT': 'R Shift',
    'LCTRL': 'L Ctrl', 'RCTRL': 'R Ctrl',
    'LALT': 'L Alt', 'RALT': 'R Alt',
    'LGUI': 'L Cmd', 'RGUI': 'R Cmd',
    'LANG1': 'かな', 'LANG2': '英数',
    'COMMA': ',', 'DOT': '.', 'FSLH': '/', 'BSLH': '\\',
    'SEMI': ';', 'SQT': "'", 'GRAVE': '`',
    'MINUS': '-', 'EQUAL': '=', 'PLUS': '+',
    'LBKT': '[', 'RBKT': ']', 'LPAR': '(', 'RPAR': ')',
    'EXCL': '!', 'AT': '@', 'HASH': '#', 'DLLR': '$',
    'PRCNT': '%', 'CARET': '^', 'AMPS': '&', 'STAR': '*',
    'PIPE': '|', 'UNDER': '_', 'TILDE': '~',
    'C_VOL_UP': 'Vol+', 'C_VOL_DN': 'Vol-', 'C_MUTE': 'Mute',
    'C_BRI_UP': 'Bri+', 'C_BRI_DN': 'Bri-',
    'C_NEXT': 'Next', 'C_PREV': 'Prev', 'C_PLAY_PAUSE': 'Play',
    'PG_UP': 'PgUp', 'PG_DN': 'PgDn', 'HOME': 'Home', 'END': 'End',
  };
  if (map[key]) return map[key];
  if (key.startsWith('KP_N')) return `KP ${key.slice(4)}`;
  const modCombo = key.match(/^(L[GCSA]|R[GCSA])\((.+)\)$/);
  if (modCombo) return `${friendlyMod(modCombo[1])}+${friendlyKey(modCombo[2])}`;
  return key;
}

function friendlyMod(mod) {
  const map = {
    'LSHIFT': 'LSft', 'RSHIFT': 'RSft',
    'LCTRL': 'LCtl', 'RCTRL': 'RCtl',
    'LALT': 'LAlt', 'RALT': 'RAlt',
    'LGUI': 'LGui', 'RGUI': 'RGui',
  };
  return map[mod] || mod;
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.slice(0, len - 1) + '…';
}
