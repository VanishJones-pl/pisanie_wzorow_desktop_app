(function (global) {
  const GREEK_AND_SYMBOLS = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
    zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
    lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ',
    rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ',
    phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
    Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    partial: '∂', nabla: '∇', infty: '∞', hbar: 'ℏ', ell: 'ℓ',
    cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓',
    approx: '≈', neq: '≠', ne: '≠', leq: '≤', le: '≤', geq: '≥', ge: '≥',
    equiv: '≡', sim: '~', simeq: '≃', propto: '∝',
    sum: '∑', prod: '∏', int: '∫', iint: '∬', iiint: '∭', oint: '∮',
    to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔',
    Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔',
    forall: '∀', exists: '∃', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆',
    cup: '∪', cap: '∩', degree: '°', circ: '°', angle: '∠', perp: '⊥', parallel: '∥',
    triangle: 'Δ', ldots: '…', cdots: '⋯',
    langle: '⟨', rangle: '⟩', lceil: '⌈', rceil: '⌉', lfloor: '⌊', rfloor: '⌋',
    percent: '%', '%': '%', '&': '&', '_': '_', '{': '{', '}': '}',
  };

  const SUPERSCRIPT_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ',
    j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ',
    t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
    '°': '°',
  };

  const SUBSCRIPT_MAP = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ',
    n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
  };

  const ACCENTS = {
    bar: '\u0304',
    overline: '\u0304',
    hat: '\u0302',
    widehat: '\u0302',
    tilde: '\u0303',
    widetilde: '\u0303',
    vec: '\u20D7',
    dot: '\u0307',
    ddot: '\u0308',
  };

  const TEXT_FUNCTIONS = new Set([
    'sin', 'cos', 'tan', 'tg', 'ctg', 'cot', 'sec', 'csc',
    'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
    'ln', 'log', 'lg', 'exp', 'lim', 'max', 'min', 'sup', 'inf',
    'det', 'dim', 'arg', 'deg', 'mod', 'gcd',
  ]);

  function readGroup(src, pos) {
    while (pos < src.length && /\s/.test(src[pos])) pos++;
    if (pos >= src.length) return { value: '', next: pos };

    if (src[pos] === '{') {
      let depth = 1;
      let i = pos + 1;
      while (i < src.length && depth > 0) {
        if (src[i] === '\\' && i + 1 < src.length) {
          i += 2;
          continue;
        }
        if (src[i] === '{') depth++;
        else if (src[i] === '}') depth--;
        i++;
      }
      return { value: src.slice(pos + 1, i - 1), next: i };
    }

    if (src[pos] === '\\') {
      const m = src.slice(pos).match(/^\\([A-Za-z]+|.)/);
      if (m) return { value: m[0], next: pos + m[0].length };
    }

    return { value: src[pos], next: pos + 1 };
  }

  function mapAllChars(str, table) {
    const out = [];
    for (const ch of str) {
      if (ch === ' ') continue;
      if (!(ch in table)) return null;
      out.push(table[ch]);
    }
    return out.join('');
  }

  function needsParensForFraction(expr) {
    return /[+\-\s]/.test(expr.trim()) && !(/^\([^()]+\)$/.test(expr.trim()));
  }

  function convert(latex) {
    if (!latex || typeof latex !== 'string') return '';
    const src = latex.trim();
    let out = '';
    let i = 0;

    while (i < src.length) {
      const ch = src[i];

      if (ch === '\\') {
        const rest = src.slice(i);
        const cmdMatch = rest.match(/^\\([A-Za-z]+|[^A-Za-z\s])/);
        if (!cmdMatch) {
          i++;
          continue;
        }
        const cmd = cmdMatch[1];
        i += cmdMatch[0].length;

        if (cmd === 'left' || cmd === 'right' || cmd === 'big' || cmd === 'Big' || cmd === 'bigg') {
          continue;
        }
        if (cmd === '!' || cmd === ',' || cmd === ':' || cmd === ';' || cmd === ' ') {
          if (cmd !== '!') out += ' ';
          continue;
        }
        if (cmd === 'quad' || cmd === 'qquad') {
          out += '  ';
          continue;
        }
        if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
          const numGroup = readGroup(src, i);
          const denGroup = readGroup(src, numGroup.next);
          i = denGroup.next;
          const num = convert(numGroup.value);
          const den = convert(denGroup.value);
          const numStr = needsParensForFraction(num) ? `(${num})` : num;
          const denStr = needsParensForFraction(den) ? `(${den})` : den;
          out += `${numStr}/${denStr}`;
          continue;
        }
        if (cmd === 'sqrt') {
          let rootIdx = '';
          while (i < src.length && /\s/.test(src[i])) i++;
          if (src[i] === '[') {
            const endBracket = src.indexOf(']', i + 1);
            if (endBracket !== -1) {
              rootIdx = convert(src.slice(i + 1, endBracket));
              i = endBracket + 1;
            }
          }
          const arg = readGroup(src, i);
          i = arg.next;
          const inner = convert(arg.value);
          const prefix = rootIdx ? `${mapAllChars(rootIdx, SUPERSCRIPT_MAP) || rootIdx + '√'}` : '';
          const radical = rootIdx ? (mapAllChars(rootIdx, SUPERSCRIPT_MAP) ? prefix + '√' : prefix) : '√';
          if (inner.length <= 2 && !/[+\-*/\s]/.test(inner)) {
            out += `${radical}${inner}`;
          } else {
            out += `${radical}(${inner})`;
          }
          continue;
        }
        if (cmd in ACCENTS) {
          const arg = readGroup(src, i);
          i = arg.next;
          const inner = convert(arg.value);
          if (inner.length === 1) {
            out += inner + ACCENTS[cmd];
          } else if (cmd === 'vec') {
            out += `${inner}⃗`;
          } else {
            out += `${inner}${ACCENTS[cmd]}`;
          }
          continue;
        }
        if (
          cmd === 'mathrm' || cmd === 'text' || cmd === 'textbf' || cmd === 'textit' ||
          cmd === 'mathsf' || cmd === 'mathtt' || cmd === 'mathbf' || cmd === 'boldsymbol' ||
          cmd === 'mathit' || cmd === 'operatorname'
        ) {
          const arg = readGroup(src, i);
          i = arg.next;
          out += cmd === 'text' || cmd === 'textbf' ? arg.value : convert(arg.value);
          continue;
        }
        if (cmd in GREEK_AND_SYMBOLS) {
          out += GREEK_AND_SYMBOLS[cmd];
          if (cmd === 'partial' || cmd === 'Delta' || cmd === 'nabla' || cmd === 'delta') {
            while (i < src.length && src[i] === ' ') i++;
          }
          continue;
        }
        if (TEXT_FUNCTIONS.has(cmd)) {
          out += cmd;
          continue;
        }
        out += cmd;
        continue;
      }

      if (ch === '^') {
        const arg = readGroup(src, i + 1);
        i = arg.next;
        const inner = convert(arg.value).trim();
        if (inner === '°') {
          out += '°';
        } else {
          const sup = mapAllChars(inner, SUPERSCRIPT_MAP);
          if (sup) out += sup;
          else if (inner.length === 1) out += `^${inner}`;
          else out += `^(${inner})`;
        }
        continue;
      }

      if (ch === '_') {
        const arg = readGroup(src, i + 1);
        i = arg.next;
        const inner = convert(arg.value).trim();
        const sub = mapAllChars(inner, SUBSCRIPT_MAP);
        if (sub) out += sub;
        else out += `_${inner}`;
        continue;
      }

      if (ch === '{' || ch === '}') {
        i++;
        continue;
      }

      out += ch;
      i++;
    }

    return out
      .replace(/\s*([=+\-±∓≈≠≤≥<>])\s*/g, ' $1 ')
      .replace(/\s*·\s*/g, ' · ')
      .replace(/\s*×\s*/g, ' × ')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\s{2,}/g, ' ');
  }

  global.latexToUnicode = convert;
})(typeof window !== 'undefined' ? window : globalThis);
