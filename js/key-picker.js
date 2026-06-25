import { KEY_CATEGORIES, MACRO_ACTIONS } from './key-codes.js';

let pickerEl = null;
let resolveCallback = null;

export function initKeyPicker() {
  pickerEl = document.getElementById('key-picker-modal');
  pickerEl.addEventListener('click', e => {
    if (e.target === pickerEl) closePicker(null);
  });
}

export function pickKey() {
  return new Promise(resolve => {
    resolveCallback = resolve;
    renderPicker();
    pickerEl.classList.add('active');
  });
}

function closePicker(result) {
  pickerEl.classList.remove('active');
  if (resolveCallback) {
    resolveCallback(result);
    resolveCallback = null;
  }
}

function renderPicker() {
  pickerEl.innerHTML = `
    <div class="picker-content">
      <div class="picker-header">
        <h3>Select Key</h3>
        <button class="btn-close" onclick="this.closest('.modal').classList.remove('active')">&times;</button>
      </div>
      <div class="picker-search">
        <input type="text" id="key-search" placeholder="Search keys..." autofocus>
      </div>
      <div class="picker-categories">
        ${KEY_CATEGORIES.map(cat => `
          <div class="key-category">
            <h4>${cat.name}</h4>
            <div class="key-grid">
              ${cat.keys.map(k => `
                <button class="key-btn" data-key="${k}">${k}</button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  pickerEl.querySelector('.btn-close').onclick = () => closePicker(null);

  pickerEl.querySelectorAll('.key-btn').forEach(btn => {
    btn.onclick = () => closePicker(btn.dataset.key);
  });

  const search = pickerEl.querySelector('#key-search');
  search.oninput = () => {
    const q = search.value.toLowerCase();
    pickerEl.querySelectorAll('.key-btn').forEach(btn => {
      btn.style.display = btn.dataset.key.toLowerCase().includes(q) ? '' : 'none';
    });
    pickerEl.querySelectorAll('.key-category').forEach(cat => {
      const visible = cat.querySelectorAll('.key-btn[style=""],.key-btn:not([style])');
      const anyVisible = Array.from(cat.querySelectorAll('.key-btn')).some(b => b.style.display !== 'none');
      cat.style.display = anyVisible ? '' : 'none';
    });
  };

  setTimeout(() => search.focus(), 50);
}
