export function parseKeymap(source) {
  const macrosBlock = findBlock(source, 'macros');
  const keymapBlock = findBlock(source, 'keymap');

  const macros = macrosBlock ? parseMacros(source, macrosBlock) : [];
  const layers = keymapBlock ? parseLayers(source, keymapBlock) : [];
  const assignments = findMacroAssignments(layers, macros);

  return {
    source,
    macrosBlock,
    keymapBlock,
    macros,
    layers,
    assignments,
    insertionPoint: macrosBlock ? null : findInsertionPoint(source)
  };
}

function findBlock(source, name) {
  const pat = new RegExp(`^([ \\t]*)${name}\\s*\\{`, 'm');
  const match = pat.exec(source);
  if (!match) return null;

  const blockStart = match.index;
  const braceStart = source.indexOf('{', match.index);
  let depth = 0;
  let braceEnd = -1;

  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) { braceEnd = i; break; }
    }
  }

  if (braceEnd === -1) return null;

  let end = braceEnd + 1;
  if (end < source.length && source[end] === ';') end++;

  return { start: blockStart, end, indent: match[1] || '' };
}

function parseMacros(source, block) {
  const inner = source.slice(block.start, block.end);
  const macros = [];
  const macroPattern = /(\w+):\s+\1\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;

  let m;
  while ((m = macroPattern.exec(inner)) !== null) {
    const name = m[1];
    const body = m[2];
    macros.push({
      name,
      waitMs: extractProp(body, 'wait-ms') || 30,
      tapMs: extractProp(body, 'tap-ms') || 30,
      bindings: parseBindings(body)
    });
  }
  return macros;
}

function extractProp(body, prop) {
  const m = new RegExp(`${prop}\\s*=\\s*<(\\d+)>`).exec(body);
  return m ? parseInt(m[1]) : null;
}

function parseBindings(body) {
  const bindingsMatch = /bindings\s*\n?\s*=([\s\S]*?);/.exec(body);
  if (!bindingsMatch) return [];

  const raw = bindingsMatch[1];
  const steps = [];
  const stepPattern = /<&(\w+)\s*(?:&(\w+)\s+(\w+))?(?:\s+(\d+))?>/g;

  let s;
  while ((s = stepPattern.exec(raw)) !== null) {
    const action = s[1];
    if (action === 'macro_wait_time') {
      const ms = s[2] || s[3] || s[4];
      steps.push({ action, ms: parseInt(ms) || 100 });
    } else {
      steps.push({ action, behavior: s[2] || 'kp', param: s[3] || '' });
    }
  }

  if (steps.length === 0) {
    const waitPattern = /<&macro_wait_time\s+(\d+)>/g;
    let w;
    while ((w = waitPattern.exec(raw)) !== null) {
      steps.push({ action: 'macro_wait_time', ms: parseInt(w[1]) });
    }
  }

  return steps;
}

function parseLayers(source, block) {
  const inner = source.slice(block.start, block.end);
  const layers = [];

  const bindingsPattern = /\bbindings\s*=\s*</g;
  let m;
  while ((m = bindingsPattern.exec(inner)) !== null) {
    const before = inner.slice(0, m.index);
    if (before.lastIndexOf('sensor-') >= 0 &&
        before.lastIndexOf('sensor-') > before.lastIndexOf('\n')) {
      continue;
    }

    const contentStart = m.index + m[0].length;
    const closeIdx = inner.indexOf('>', contentStart);
    if (closeIdx === -1) continue;

    const bindingsRaw = inner.slice(contentStart, closeIdx).trim();
    const bindings = parseLayerBindings(bindingsRaw);
    if (bindings.length === 0) continue;

    const layerNameMatch = /(\w+)\s*\{[^{}]*$/.exec(before);
    const name = layerNameMatch ? layerNameMatch[1] : `layer_${layers.length}`;

    if (name === 'keymap') continue;

    layers.push({ name, bindings });
  }
  return layers;
}

function parseLayerBindings(raw) {
  const bindings = [];
  const tokens = raw.split(/\s+/).filter(t => t.length > 0);

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.startsWith('&')) {
      let binding = token;
      while (i + 1 < tokens.length && !tokens[i + 1].startsWith('&')) {
        i++;
        binding += ' ' + tokens[i];
      }
      bindings.push(binding);
    }
    i++;
  }
  return bindings;
}

function findMacroAssignments(layers, macros) {
  const assignments = {};
  const macroNames = new Set(macros.map(m => m.name));

  layers.forEach((layer, layerIdx) => {
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

function findInsertionPoint(source) {
  const behaviorsBlock = findBlock(source, 'behaviors');
  if (behaviorsBlock) return behaviorsBlock.end;

  const rootMatch = /\/\s*\{/.exec(source);
  if (rootMatch) {
    const bracePos = source.indexOf('{', rootMatch.index);
    return bracePos + 1;
  }
  return source.length;
}
