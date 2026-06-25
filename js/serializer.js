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

export function spliceKeymap(parsed, newMacros) {
  const { source, macrosBlock, insertionPoint } = parsed;
  const serialized = serializeMacros(newMacros);

  if (macrosBlock) {
    const before = source.slice(0, macrosBlock.start);
    const after = source.slice(macrosBlock.end);
    if (serialized === '') {
      const trimmedBefore = before.replace(/\n+$/, '\n');
      return trimmedBefore + after.replace(/^\n+/, '\n');
    }
    return before + serialized + after;
  }

  if (insertionPoint != null) {
    return source.slice(0, insertionPoint) +
           '\n\n' + serialized + '\n' +
           source.slice(insertionPoint);
  }

  return source;
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
