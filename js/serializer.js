export function serializeMacros(macros, indent = '    ') {
  if (macros.length === 0) return '';

  const lines = [`${indent}macros {`];
  macros.forEach((macro, idx) => {
    const inner = indent + '    ';
    const deep = indent + '        ';

    lines.push(`${inner}${macro.name}: ${macro.name} {`);
    lines.push(`${deep}compatible = "zmk,behavior-macro";`);
    lines.push(`${deep}#binding-cells = <0>;`);
    lines.push(`${deep}wait-ms = <${macro.waitMs}>;`);
    lines.push(`${deep}tap-ms = <${macro.tapMs}>;`);
    lines.push(`${deep}bindings`);

    macro.bindings.forEach((step, i) => {
      const prefix = i === 0 ? `${deep}    = ` : `${deep}    , `;
      const suffix = i === macro.bindings.length - 1 ? '' : '';
      lines.push(`${prefix}${serializeStep(step)}`);
    });
    lines.push(`${deep}    ;`);

    lines.push(`${inner}};`);
    if (idx < macros.length - 1) lines.push('');
  });
  lines.push(`${indent}};`);

  return lines.join('\n');
}

function serializeStep(step) {
  if (step.action === 'macro_wait_time') {
    return `<&macro_wait_time ${step.ms}>`;
  }
  return `<&${step.action} &${step.behavior} ${step.param}>`;
}

export function spliceKeymap(parsed, newMacros, layers) {
  const { source, macrosBlock, insertionPoint } = parsed;
  const serialized = serializeMacros(newMacros);

  let result;
  if (macrosBlock) {
    const before = source.slice(0, macrosBlock.start);
    const after = source.slice(macrosBlock.end);
    if (serialized === '') {
      const trimmedBefore = before.replace(/\n+$/, '\n');
      result = trimmedBefore + after.replace(/^\n+/, '\n');
    } else {
      result = before + serialized + after;
    }
  } else if (insertionPoint != null) {
    result = source.slice(0, insertionPoint) +
             '\n\n' + serialized + '\n' +
             source.slice(insertionPoint);
  } else {
    result = source;
  }

  if (layers) {
    result = applyLayerChanges(result, parsed.layers, layers);
  }

  return result;
}

function applyLayerChanges(source, originalLayers, currentLayers) {
  const bindingsPattern = /\bbindings\s*=\s*<([\s\S]*?)>/g;
  let layerIdx = 0;
  let result = source;
  let offset = 0;

  const sensorSkip = /sensor-/;
  let match;
  const allMatches = [];

  while ((match = bindingsPattern.exec(source)) !== null) {
    const lineStart = source.lastIndexOf('\n', match.index) + 1;
    const linePrefix = source.slice(lineStart, match.index);
    if (sensorSkip.test(linePrefix)) continue;
    allMatches.push({ index: match.index, length: match[0].length, contentStart: match.index + match[0].length - match[1].length - 1, content: match[1] });
  }

  for (let i = allMatches.length - 1; i >= 0; i--) {
    const m = allMatches[i];
    if (i >= currentLayers.length) continue;

    const orig = originalLayers[i];
    const curr = currentLayers[i];
    if (!orig || !curr) continue;

    let changed = false;
    for (let j = 0; j < curr.bindings.length; j++) {
      if (!orig.bindings[j] || orig.bindings[j] !== curr.bindings[j]) {
        changed = true;
        break;
      }
    }
    if (!changed) continue;

    const newContent = formatLayerBindings(curr.bindings, m.content);
    const contentStart = m.contentStart;
    const contentEnd = contentStart + m.content.length;
    result = result.slice(0, contentStart) + newContent + result.slice(contentEnd);
  }

  return result;
}

function formatLayerBindings(bindings, originalContent) {
  const lines = originalContent.split('\n');
  const indentMatch = lines.length > 1 ? /^(\s*)/.exec(lines[1]) : null;
  const indent = indentMatch ? indentMatch[1] : '';

  const rows = [];
  for (let r = 0; r < 4; r++) {
    const start = r * 10;
    const left = bindings.slice(start, start + 5).join('  ');
    const right = bindings.slice(start + 5, start + 10).join('  ');
    rows.push(`${indent}${left}    ${right}`);
  }
  return '\n' + rows.join('\n') + '\n' + indent.replace(/  $/, '');
}

export function updateLayerBinding(source, layerIndex, position, newBinding) {
  const layerPattern = /(\w+)\s*\{[^}]*bindings\s*=\s*<([^>]*)>/g;
  let match;
  let currentLayer = 0;

  while ((match = layerPattern.exec(source)) !== null) {
    if (currentLayer === layerIndex) {
      const bindingsStart = match.index + match[0].indexOf(match[2]);
      const bindings = match[2].trim().split(/\s+/);

      if (position < bindings.length) {
        bindings[position] = newBinding;
        const newBindingsStr = formatBindings(bindings);
        return source.slice(0, bindingsStart) +
               newBindingsStr +
               source.slice(bindingsStart + match[2].length);
      }
    }
    currentLayer++;
  }
  return source;
}

function formatBindings(bindings) {
  const rows = [];
  for (let r = 0; r < 4; r++) {
    const start = r * 10;
    const left = bindings.slice(start, start + 5).join('  ');
    const right = bindings.slice(start + 5, start + 10).join('  ');
    rows.push(`${left}    ${right}`);
  }
  return '\n' + rows.join('\n') + '\n';
}

export function generateDiff(original, modified) {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');
  const diffs = [];

  const maxLen = Math.max(origLines.length, modLines.length);
  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i];
    const mod = modLines[i];
    if (orig !== mod) {
      if (orig !== undefined) diffs.push({ type: 'remove', line: i + 1, text: orig });
      if (mod !== undefined) diffs.push({ type: 'add', line: i + 1, text: mod });
    }
  }
  return diffs;
}
