// Notazione "stile LaTeX" scritta a volte dall'AI (a^{2n}, x_{n-1}, \geq, $…$) → caratteri Unicode
// leggibili su una verifica stampata (a²ⁿ, xₙ₋₁, ≥). Usata dall'export (exportTest.js).

const SUP = {
  0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹',
  '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', '*': '*', ' ': '',
  a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ',
  n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
  T: 'ᵀ',
};

const SUB = {
  0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉',
  '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎', ' ': '',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ',
  r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
};

// Comandi LaTeX più comuni nelle domande di matematica, logica e informatica teorica.
const COMMANDS = {
  leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈', equiv: '≡', sim: '∼',
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', infty: '∞', sqrt: '√',
  in: '∈', notin: '∉', ni: '∋', subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇',
  cup: '∪', cap: '∩', setminus: '∖', emptyset: '∅', varnothing: '∅',
  forall: '∀', exists: '∃', neg: '¬', lnot: '¬', land: '∧', wedge: '∧', lor: '∨', vee: '∨',
  to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', implies: '⇒',
  leftrightarrow: '↔', Leftrightarrow: '⇔', iff: '⇔', mapsto: '↦',
  sum: '∑', prod: '∏', int: '∫', partial: '∂', nabla: '∇',
  ldots: '…', cdots: '⋯', dots: '…',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η',
  theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ',
  chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  left: '', right: '',
};

const BLACKBOARD = { N: 'ℕ', Z: 'ℤ', Q: 'ℚ', R: 'ℝ', C: 'ℂ' };

// Converte tutto il gruppo o niente: se un carattere non ha la versione Unicode resta com'era.
function convert(group, table) {
  const chars = [...group];
  return chars.every(c => c in table) ? chars.map(c => table[c]).join('') : null;
}

export function prettifyMath(text) {
  if (typeof text !== 'string') return text;
  if (!text || !/[\\^_$]/.test(text)) return text;
  return text
    // \mathbb{R} → ℝ
    .replace(/\\mathbb\{([NZQRC])\}/g, (_, l) => BLACKBOARD[l])
    // \text{min}, \mathrm{d}, \mathbf{v} → solo il contenuto
    .replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\{([^{}]*)\}/g, '$1')
    // \{ \} → graffe letterali
    .replace(/\\([{}])/g, '$1')
    // \geq, \epsilon, … (solo comandi conosciuti, seguiti da una non-lettera)
    .replace(/\\([a-zA-Z]+)(?![a-zA-Z])/g, (m, name) => (name in COMMANDS ? COMMANDS[name] : m))
    // $…$ delimitatori di formula (senza spazi ai bordi, così "5$ e 10$" resta com'è)
    .replace(/\$(?=\S)([^$\n]+?)(?<=\S)\$/g, '$1')
    // a^{2n}, x_{n-1}: dopo una lettera, cifra o parentesi chiusa
    .replace(/(?<=[\p{L}\p{N})\]}*])([\^_])\{([^{}]+)\}/gu, (m, op, g) => convert(g, op === '^' ? SUP : SUB) ?? m)
    // a^2, x_1, a_i: un solo carattere non seguito da altre lettere/cifre (così nome_file resta com'è)
    .replace(/(?<=[\p{L}\p{N})\]}*])([\^_])([\p{L}\p{N}])(?![\p{L}\p{N}])/gu, (m, op, c) => convert(c, op === '^' ? SUP : SUB) ?? m);
}

// Stessa trasformazione su testo, opzioni e risposta corretta: il confronto correct_answer === opzione resta valido.
export function prettifyQuestion(q) {
  return {
    ...q,
    content: prettifyMath(q.content),
    options: Array.isArray(q.options) ? q.options.map(prettifyMath) : q.options,
    correct_answer: prettifyMath(q.correct_answer),
  };
}
