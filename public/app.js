(function () {
  const SYMBOLS = [
    { label: 'u/v', insert: '\\frac{}{}', cursorOffset: -3, title: 'Ułamek' },
    { label: '√', insert: '\\sqrt{}', cursorOffset: -1, title: 'Pierwiastek' },
    { label: 'xⁿ', insert: '^{}', cursorOffset: -1, title: 'Indeks górny / potęga' },
    { label: 'xₙ', insert: '_{}', cursorOffset: -1, title: 'Indeks dolny' },
    { label: 'Δ', insert: '\\Delta ', title: 'Delta (przyrost / błąd graniczny)' },
    { label: '∂', insert: '\\partial ', title: 'Pochodna cząstkowa' },
    { label: 'σ', insert: '\\sigma ', title: 'Sigma (odchylenie standardowe)' },
    { label: 'μ', insert: '\\mu ', title: 'Mi (średnia / mikro)' },
    { label: 'ε', insert: '\\varepsilon ', title: 'Epsilon (błąd względny / przenikalność)' },
    { label: 'δ', insert: '\\delta ', title: 'Delta mała' },
    { label: 'ρ', insert: '\\rho ', title: 'Ro (gęstość / rezystywność)' },
    { label: 'ω', insert: '\\omega ', title: 'Omega (częstość kołowa)' },
    { label: 'λ', insert: '\\lambda ', title: 'Lambda (długość fali)' },
    { label: 'φ', insert: '\\varphi ', title: 'Fi (kąt / faza)' },
    { label: 'π', insert: '\\pi ', title: 'Pi' },
    { label: '±', insert: '\\pm ', title: 'Plus-minus (niepewność)' },
    { label: '·', insert: '\\cdot ', title: 'Mnożenie (kropka)' },
    { label: '×', insert: '\\times ', title: 'Mnożenie (krzyżyk)' },
    { label: '≈', insert: '\\approx ', title: 'W przybliżeniu' },
    { label: 'x̄', insert: '\\bar{x}', title: 'Średnia arytmetyczna' },
    { label: '∑', insert: '\\sum_{i=1}^{n} ', title: 'Suma' },
    { label: '∫', insert: '\\int_{}^{} ', cursorOffset: -4, title: 'Całka oznaczona' },
    { label: '( )', insert: '\\left(  \\right)', cursorOffset: -8, title: 'Duże nawiasy' },
  ];

  const TEMPLATES = [
    {
      title: 'Niepewność standardowa typu A',
      latex: 'u_A(x) = \\sqrt{\\frac{1}{n(n-1)} \\sum_{i=1}^{n} (x_i - \\bar{x})^2}',
    },
    {
      title: 'Niepewność standardowa typu B (rozkład prostokątny)',
      latex: 'u_B(x) = \\frac{\\Delta_g x}{\\sqrt{3}}',
    },
    {
      title: 'Niepewność złożona (prawo przenoszenia niepewności)',
      latex: 'u_c(y) = \\sqrt{\\sum_{i=1}^{k} \\left(\\frac{\\partial f}{\\partial x_i} u(x_i)\\right)^2}',
    },
    {
      title: 'Niepewność złożona dla funkcji dwóch zmiennych f(a, b)',
      latex: 'u_c(y) = \\sqrt{\\left(\\frac{\\partial f}{\\partial a} u(a)\\right)^2 + \\left(\\frac{\\partial f}{\\partial b} u(b)\\right)^2}',
    },
    {
      title: 'Niepewność rozszerzona i zapis wyniku',
      latex: 'U(y) = k \\cdot u_c(y), \\quad y = \\bar{y} \\pm U(y)',
    },
    {
      title: 'Średnia arytmetyczna pomiarów',
      latex: '\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i',
    },
    {
      title: 'Błąd względny procentowy',
      latex: '\\delta = \\frac{|x - x_0|}{x_0} \\cdot 100\\%',
    },
    {
      title: 'Odchylenie standardowe próby',
      latex: 's = \\sqrt{\\frac{1}{n-1} \\sum_{i=1}^{n} (x_i - \\bar{x})^2}',
    },
    {
      title: 'Energia kinetyczna i potencjalna',
      latex: 'E = \\frac{1}{2} m v^2 + m g h',
    },
    {
      title: 'Równanie stanu gazu doskonałego',
      latex: 'p V = n R T',
    },
    {
      title: 'Okres wahadła matematycznego',
      latex: 'T = 2\\pi \\sqrt{\\frac{l}{g}}',
    },
  ];

  const HISTORY_KEY = 'wzornik_offline_history_v1';
  const MAX_HISTORY = 30;

  // DOM Elements
  const canvasWrap = document.getElementById('canvasWrap');
  const canvas = document.getElementById('drawCanvas');
  const ctx = canvas.getContext('2d');
  const placeholder = document.getElementById('canvasPlaceholder');
  const ocrSpinner = document.getElementById('ocrSpinner');
  const modelStatus = document.getElementById('modelStatus');
  const modelStatusText = document.getElementById('modelStatusText');
  const inferenceMeta = document.getElementById('inferenceMeta');

  const toolPen = document.getElementById('toolPen');
  const toolEraser = document.getElementById('toolEraser');
  const strokeWidthSelect = document.getElementById('strokeWidth');
  const bgPatternSelect = document.getElementById('bgPattern');
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const btnClear = document.getElementById('btnClear');
  const autoRecognizeCheckbox = document.getElementById('autoRecognize');
  const btnRecognize = document.getElementById('btnRecognize');

  const mathPreview = document.getElementById('mathPreview');
  const katexError = document.getElementById('katexError');
  const symbolBar = document.getElementById('symbolBar');
  const latexInput = document.getElementById('latexInput');
  const showRawToggle = document.getElementById('showRawToggle');
  const unicodeOutput = document.getElementById('unicodeOutput');

  const btnCopyUnicode = document.getElementById('btnCopyUnicode');
  const btnCopyMathML = document.getElementById('btnCopyMathML');
  const btnCopyLatex = document.getElementById('btnCopyLatex');
  const btnCopyDollars = document.getElementById('btnCopyDollars');
  const btnCopyImage = document.getElementById('btnCopyImage');

  const btnTemplates = document.getElementById('btnTemplates');
  const btnHistory = document.getElementById('btnHistory');
  const historyCount = document.getElementById('historyCount');
  const sideDrawer = document.getElementById('sideDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerBody = document.getElementById('drawerBody');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  const toastEl = document.getElementById('toast');

  // App State
  let strokes = []; // [{ points: [{ x, y, p }], width }]
  let pastedImage = null; // HTMLImageElement if pasted/dropped
  let undoStack = [];
  let redoStack = [];
  let activeTool = 'pen';
  let isDrawing = false;
  let activePointerId = null;
  let currentStroke = null;
  let erasedDuringDrag = false;

  let modelReady = false;
  let isStandalone = false;
  let pendingAutoRecognize = false;
  let autoTimer = null;
  let requestSeq = 0;
  let lastCleanedLatex = '';
  let lastRawLatex = '';
  let toastTimer = null;

  // Helpers
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2300);
  }

  function snapshotState() {
    return {
      strokes: strokes.map((s) => ({
        width: s.width,
        points: s.points.map((pt) => ({ ...pt })),
      })),
      pastedImage,
    };
  }

  function pushUndoSnapshot() {
    undoStack.push(snapshotState());
    if (undoStack.length > 60) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    btnUndo.disabled = undoStack.length === 0;
    btnRedo.disabled = redoStack.length === 0;
    const hasContent = strokes.length > 0 || Boolean(pastedImage);
    placeholder.classList.toggle('hidden', hasContent);
  }

  function resizeCanvas() {
    const rect = canvasWrap.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const w = Math.max(Math.floor(rect.width), 1);
    const h = Math.max(Math.floor(rect.height), 1);
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawCanvas();
    }
  }

  function drawStrokeOnContext(targetCtx, stroke, offsetX = 0, offsetY = 0) {
    const pts = stroke.points;
    if (!pts.length) return;

    targetCtx.save();
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    targetCtx.strokeStyle = '#0f172a';
    targetCtx.fillStyle = '#0f172a';

    if (pts.length === 1) {
      targetCtx.beginPath();
      targetCtx.arc(pts[0].x - offsetX, pts[0].y - offsetY, stroke.width * 0.5, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.restore();
      return;
    }

    const hasPressure = pts.some((pt) => pt.p > 0 && Math.abs(pt.p - 0.5) > 0.03);
    if (!hasPressure) {
      targetCtx.lineWidth = stroke.width;
      targetCtx.beginPath();
      targetCtx.moveTo(pts[0].x - offsetX, pts[0].y - offsetY);
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) * 0.5 - offsetX;
        const midY = (pts[i].y + pts[i + 1].y) * 0.5 - offsetY;
        targetCtx.quadraticCurveTo(pts[i].x - offsetX, pts[i].y - offsetY, midX, midY);
      }
      const last = pts[pts.length - 1];
      targetCtx.lineTo(last.x - offsetX, last.y - offsetY);
      targetCtx.stroke();
    } else {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const p = (a.p + b.p) * 0.5;
        targetCtx.lineWidth = stroke.width * (0.55 + 0.75 * p);
        targetCtx.beginPath();
        targetCtx.moveTo(a.x - offsetX, a.y - offsetY);
        targetCtx.lineTo(b.x - offsetX, b.y - offsetY);
        targetCtx.stroke();
      }
    }

    targetCtx.restore();
  }

  function redrawCanvas() {
    const rect = canvasWrap.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (pastedImage) {
      const pad = 20;
      const maxW = Math.max(rect.width - pad * 2, 50);
      const maxH = Math.max(rect.height - pad * 2, 50);
      const scale = Math.min(maxW / pastedImage.width, maxH / pastedImage.height, 1);
      const drawW = pastedImage.width * scale;
      const drawH = pastedImage.height * scale;
      const dx = (rect.width - drawW) * 0.5;
      const dy = (rect.height - drawH) * 0.5;
      ctx.drawImage(pastedImage, dx, dy, drawW, drawH);
    }

    for (const s of strokes) {
      drawStrokeOnContext(ctx, s);
    }
    if (currentStroke) {
      drawStrokeOnContext(ctx, currentStroke);
    }
    updateHistoryButtons();
  }

  function getCanvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      p: e.pointerType === 'pen' ? e.pressure : 0.5,
    };
  }

  function distanceToSegmentSq(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return (px - ax) ** 2 + (py - ay) ** 2;
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    return (px - projX) ** 2 + (py - projY) ** 2;
  }

  function eraseAtPoint(pt) {
    const thresholdSq = 14 * 14;
    let removed = false;
    const kept = [];
    for (const s of strokes) {
      let hit = false;
      const pts = s.points;
      if (pts.length === 1) {
        const dSq = (pt.x - pts[0].x) ** 2 + (pt.y - pts[0].y) ** 2;
        if (dSq <= thresholdSq) hit = true;
      } else {
        for (let i = 1; i < pts.length; i++) {
          if (distanceToSegmentSq(pt.x, pt.y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) <= thresholdSq) {
            hit = true;
            break;
          }
        }
      }
      if (hit) removed = true;
      else kept.push(s);
    }
    if (removed) {
      if (!erasedDuringDrag) {
        pushUndoSnapshot();
        erasedDuringDrag = true;
      }
      strokes = kept;
      redrawCanvas();
      scheduleAutoRecognize();
    }
  }

  function scheduleAutoRecognize() {
    clearTimeout(autoTimer);
    if (!autoRecognizeCheckbox.checked) return;
    if (strokes.length === 0 && !pastedImage) return;
    autoTimer = setTimeout(() => {
      recognizeCurrentCanvas();
    }, 850);
  }

  // Export tightly-cropped pure black-on-white PNG for accurate TrOCR recognition
  function exportCanvasForOcr() {
    if (strokes.length === 0 && !pastedImage) return null;

    if (pastedImage && strokes.length === 0) {
      const off = document.createElement('canvas');
      const pad = 20;
      off.width = pastedImage.width + pad * 2;
      off.height = pastedImage.height + pad * 2;
      const octx = off.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, off.width, off.height);
      octx.drawImage(pastedImage, pad, pad);
      return off.toDataURL('image/png');
    }

    const rect = canvasWrap.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (pastedImage) {
      const pad = 20;
      const maxW = Math.max(rect.width - pad * 2, 50);
      const maxH = Math.max(rect.height - pad * 2, 50);
      const scale = Math.min(maxW / pastedImage.width, maxH / pastedImage.height, 1);
      const drawW = pastedImage.width * scale;
      const drawH = pastedImage.height * scale;
      const dx = (rect.width - drawW) * 0.5;
      const dy = (rect.height - drawH) * 0.5;
      minX = Math.min(minX, dx);
      minY = Math.min(minY, dy);
      maxX = Math.max(maxX, dx + drawW);
      maxY = Math.max(maxY, dy + drawH);
    }

    for (const s of strokes) {
      const r = s.width + 2;
      for (const pt of s.points) {
        if (pt.x - r < minX) minX = pt.x - r;
        if (pt.y - r < minY) minY = pt.y - r;
        if (pt.x + r > maxX) maxX = pt.x + r;
        if (pt.y + r > maxY) maxY = pt.y + r;
      }
    }

    if (!Number.isFinite(minX)) return null;

    const margin = 24;
    const cropW = Math.max(Math.ceil(maxX - minX + margin * 2), 64);
    const cropH = Math.max(Math.ceil(maxY - minY + margin * 2), 64);
    const offsetX = minX - margin;
    const offsetY = minY - margin;

    // Upscale small handwriting so thin strokes remain crisp at 384x384 encoder input
    const scale = cropH < 120 ? 2 : 1;
    const off = document.createElement('canvas');
    off.width = Math.round(cropW * scale);
    off.height = Math.round(cropH * scale);
    const octx = off.getContext('2d');
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, off.width, off.height);
    octx.scale(scale, scale);

    if (pastedImage) {
      const pad = 20;
      const maxW = Math.max(rect.width - pad * 2, 50);
      const maxH = Math.max(rect.height - pad * 2, 50);
      const imgScale = Math.min(maxW / pastedImage.width, maxH / pastedImage.height, 1);
      const drawW = pastedImage.width * imgScale;
      const drawH = pastedImage.height * imgScale;
      const dx = (rect.width - drawW) * 0.5;
      const dy = (rect.height - drawH) * 0.5;
      octx.drawImage(pastedImage, dx - offsetX, dy - offsetY, drawW, drawH);
    }

    for (const s of strokes) {
      drawStrokeOnContext(octx, s, offsetX, offsetY);
    }
    return off.toDataURL('image/png');
  }

  async function recognizeCurrentCanvas() {
    const dataUrl = exportCanvasForOcr();
    if (!dataUrl) {
      showToast('Najpierw napisz lub wklej wzór na płótnie.');
      return;
    }

    if (!modelReady) {
      pendingAutoRecognize = true;
      showToast('Model OCR kończy ładowanie — rozpoznam za chwilę.');
      return;
    }

    const mySeq = ++requestSeq;
    ocrSpinner.classList.remove('hidden');
    btnRecognize.disabled = true;

    try {
      const res = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const json = await res.json();
      if (mySeq !== requestSeq) return;

      if (!res.ok) {
        throw new Error(json.error || 'Błąd rozpoznawania');
      }

      lastCleanedLatex = json.latex || '';
      lastRawLatex = json.rawLatex || '';
      const activeLatex = showRawToggle.checked ? lastRawLatex : lastCleanedLatex;
      latexInput.value = activeLatex;
      inferenceMeta.textContent = `Rozpoznano w ${(json.durationMs / 1000).toFixed(2)} s`;
      renderOutputs(activeLatex);
      saveHistoryEntry(activeLatex);
    } catch (err) {
      if (mySeq === requestSeq) {
        showToast(err.message || 'Nie udało się rozpoznać wzoru.');
      }
    } finally {
      if (mySeq === requestSeq) {
        ocrSpinner.classList.add('hidden');
        btnRecognize.disabled = false;
      }
    }
  }

  function renderOutputs(latex) {
    const trimmed = (latex || '').trim();
    if (!trimmed) {
      mathPreview.innerHTML = '<span class="preview-empty">Tutaj pojawi się rozpoznany wzór...</span>';
      katexError.classList.add('hidden');
      unicodeOutput.textContent = '—';
      return;
    }

    try {
      window.katex.render(trimmed, mathPreview, {
        displayMode: true,
        throwOnError: true,
        strict: false,
      });
      katexError.classList.add('hidden');
    } catch (err) {
      katexError.textContent = 'Sprawdź składnię LaTeX';
      katexError.classList.remove('hidden');
      try {
        window.katex.render(trimmed, mathPreview, {
          displayMode: true,
          throwOnError: false,
          strict: false,
        });
      } catch (_) {
        mathPreview.textContent = trimmed;
      }
    }

    const unicode = window.latexToUnicode ? window.latexToUnicode(trimmed) : trimmed;
    unicodeOutput.textContent = unicode || '—';
  }

  // Clipboard helpers
  async function copyText(text, successMsg) {
    if (!text) {
      showToast('Brak wzoru do skopiowania.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMsg);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(successMsg);
    }
  }

  async function copyMathMLForWord() {
    const latex = latexInput.value.trim();
    if (!latex) {
      showToast('Brak wzoru do skopiowania.');
      return;
    }
    try {
      const mml = window.temml.renderToString(latex, { xml: true, displayMode: true });
      await copyText(mml, 'Skopiowano MathML! W Wordzie wciśnij Ctrl+V.');
    } catch (err) {
      showToast('Nie można wygenerować MathML — popraw składnię LaTeX.');
    }
  }

  async function copyCanvasPng() {
    const dataUrl = exportCanvasForOcr();
    if (!dataUrl) {
      showToast('Płótno jest puste — brak obrazu do skopiowania.');
      return;
    }
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('Skopiowano rysunek wzoru (PNG) do schowka.');
    } catch (_) {
      showToast('Twoja przeglądarka zablokowała kopiowanie obrazu — użyj kopiowania tekstu.');
    }
  }

  // History persistence
  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistoryEntry(latex) {
    const clean = (latex || '').trim();
    if (!clean) return;
    let items = loadHistory().filter((item) => item.latex !== clean);
    items.unshift({
      latex: clean,
      unicode: window.latexToUnicode ? window.latexToUnicode(clean) : clean,
      ts: Date.now(),
    });
    if (items.length > MAX_HISTORY) items = items.slice(0, MAX_HISTORY);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch (_) {}
    updateHistoryCount();
  }

  function updateHistoryCount() {
    historyCount.textContent = String(loadHistory().length);
  }

  function openDrawer(mode) {
    drawerBody.innerHTML = '';
    if (mode === 'templates') {
      drawerTitle.textContent = 'Szablony: Fizyka i Metrologia';
      for (const tpl of TEMPLATES) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'drawer-item';

        const title = document.createElement('div');
        title.className = 'drawer-item-title';
        title.textContent = tpl.title;

        const mathDiv = document.createElement('div');
        mathDiv.className = 'drawer-item-math';
        window.katex.render(tpl.latex, mathDiv, { displayMode: false, throwOnError: false });

        const code = document.createElement('div');
        code.className = 'drawer-item-code';
        code.textContent = tpl.latex;

        btn.append(title, mathDiv, code);
        btn.addEventListener('click', () => {
          latexInput.value = tpl.latex;
          lastCleanedLatex = tpl.latex;
          lastRawLatex = tpl.latex;
          renderOutputs(tpl.latex);
          closeDrawer();
          showToast('Wstawiono szablon — możesz go edytować lub skopiować.');
        });
        drawerBody.appendChild(btn);
      }
    } else {
      drawerTitle.textContent = 'Historia rozpoznanych wzorów';
      const items = loadHistory();
      if (items.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'meta-text';
        empty.textContent = 'Brak zapisanych wzorów w historii.';
        drawerBody.appendChild(empty);
      } else {
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'btn btn-danger-soft';
        clearBtn.textContent = 'Wyczyść całą historię';
        clearBtn.addEventListener('click', () => {
          localStorage.removeItem(HISTORY_KEY);
          updateHistoryCount();
          openDrawer('history');
        });
        drawerBody.appendChild(clearBtn);

        for (const item of items) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'drawer-item';

          const date = document.createElement('div');
          date.className = 'drawer-item-title';
          date.textContent = new Date(item.ts).toLocaleString('pl-PL');

          const mathDiv = document.createElement('div');
          mathDiv.className = 'drawer-item-math';
          window.katex.render(item.latex, mathDiv, { displayMode: false, throwOnError: false });

          const code = document.createElement('div');
          code.className = 'drawer-item-code';
          code.textContent = item.unicode || item.latex;

          btn.append(date, mathDiv, code);
          btn.addEventListener('click', () => {
            latexInput.value = item.latex;
            lastCleanedLatex = item.latex;
            lastRawLatex = item.latex;
            renderOutputs(item.latex);
            closeDrawer();
            showToast('Przywrócono wzór z historii.');
          });
          drawerBody.appendChild(btn);
        }
      }
    }

    sideDrawer.classList.remove('hidden');
    drawerBackdrop.classList.remove('hidden');
    sideDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    sideDrawer.classList.add('hidden');
    drawerBackdrop.classList.add('hidden');
    sideDrawer.setAttribute('aria-hidden', 'true');
  }

  // Insert symbol snippet into LaTeX textarea
  function insertSymbol(sym) {
    const start = latexInput.selectionStart ?? latexInput.value.length;
    const end = latexInput.selectionEnd ?? latexInput.value.length;
    const val = latexInput.value;
    latexInput.value = val.slice(0, start) + sym.insert + val.slice(end);
    const nextPos = start + sym.insert.length + (sym.cursorOffset || 0);
    latexInput.focus();
    latexInput.setSelectionRange(nextPos, nextPos);
    renderOutputs(latexInput.value);
  }

  function buildSymbolBar() {
    for (const sym of SYMBOLS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'symbol-chip';
      btn.textContent = sym.label;
      btn.title = `${sym.title} (${sym.insert.trim()})`;
      btn.addEventListener('click', () => insertSymbol(sym));
      symbolBar.appendChild(btn);
    }
  }

  // Image paste / drop support
  function loadExternalImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        pushUndoSnapshot();
        pastedImage = img;
        strokes = [];
        redrawCanvas();
        recognizeCurrentCanvas();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // Pointer drawing events
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    clearTimeout(autoTimer);
    canvas.setPointerCapture(e.pointerId);
    activePointerId = e.pointerId;
    isDrawing = true;
    const pt = getCanvasPoint(e);

    if (activeTool === 'eraser') {
      erasedDuringDrag = false;
      eraseAtPoint(pt);
    } else {
      pushUndoSnapshot();
      currentStroke = {
        width: Number(strokeWidthSelect.value) || 4,
        points: [pt],
      };
      redrawCanvas();
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDrawing || e.pointerId !== activePointerId) return;
    const pt = getCanvasPoint(e);
    if (activeTool === 'eraser') {
      eraseAtPoint(pt);
    } else if (currentStroke) {
      const pts = currentStroke.points;
      const prev = pts[pts.length - 1];
      if (!prev || (pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2 >= 2) {
        pts.push(pt);
        redrawCanvas();
      }
    }
  });

  function finishPointer(e) {
    if (!isDrawing || e.pointerId !== activePointerId) return;
    isDrawing = false;
    activePointerId = null;

    if (activeTool === 'pen' && currentStroke) {
      strokes.push(currentStroke);
      currentStroke = null;
      redrawCanvas();
      scheduleAutoRecognize();
    }
    erasedDuringDrag = false;
  }

  canvas.addEventListener('pointerup', finishPointer);
  canvas.addEventListener('pointercancel', finishPointer);

  // Tool & Action bindings
  function setTool(tool) {
    activeTool = tool;
    toolPen.classList.toggle('active', tool === 'pen');
    toolEraser.classList.toggle('active', tool === 'eraser');
    canvas.classList.toggle('eraser-cursor', tool === 'eraser');
  }

  toolPen.addEventListener('click', () => setTool('pen'));
  toolEraser.addEventListener('click', () => setTool('eraser'));

  bgPatternSelect.addEventListener('change', () => {
    canvasWrap.classList.remove('bg-grid', 'bg-lines', 'bg-blank');
    canvasWrap.classList.add(`bg-${bgPatternSelect.value}`);
  });

  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(snapshotState());
    const prev = undoStack.pop();
    strokes = prev.strokes;
    pastedImage = prev.pastedImage;
    redrawCanvas();
    scheduleAutoRecognize();
  }

  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(snapshotState());
    const next = redoStack.pop();
    strokes = next.strokes;
    pastedImage = next.pastedImage;
    redrawCanvas();
    scheduleAutoRecognize();
  }

  function clearCanvas() {
    if (strokes.length === 0 && !pastedImage && !latexInput.value) return;
    clearTimeout(autoTimer);
    requestSeq++;
    if (strokes.length > 0 || pastedImage) {
      pushUndoSnapshot();
    }
    strokes = [];
    pastedImage = null;
    currentStroke = null;
    redrawCanvas();
    latexInput.value = '';
    lastCleanedLatex = '';
    lastRawLatex = '';
    inferenceMeta.textContent = '';
    renderOutputs('');
  }

  btnUndo.addEventListener('click', undo);
  btnRedo.addEventListener('click', redo);
  btnClear.addEventListener('click', clearCanvas);
  btnRecognize.addEventListener('click', recognizeCurrentCanvas);

  latexInput.addEventListener('input', () => {
    renderOutputs(latexInput.value);
  });

  showRawToggle.addEventListener('change', () => {
    if (!lastRawLatex && !lastCleanedLatex) return;
    const val = showRawToggle.checked ? lastRawLatex : lastCleanedLatex;
    latexInput.value = val;
    renderOutputs(val);
  });

  btnCopyUnicode.addEventListener('click', () => {
    const text = unicodeOutput.textContent === '—' ? '' : unicodeOutput.textContent;
    copyText(text, 'Skopiowano zwykły tekst (Unicode) do schowka!');
  });

  btnCopyMathML.addEventListener('click', copyMathMLForWord);

  btnCopyLatex.addEventListener('click', () => {
    copyText(latexInput.value.trim(), 'Skopiowano kod LaTeX do schowka!');
  });

  btnCopyDollars.addEventListener('click', () => {
    const val = latexInput.value.trim();
    copyText(val ? `$$${val}$$` : '', 'Skopiowano formułę $$...$$ do schowka!');
  });

  btnCopyImage.addEventListener('click', copyCanvasPng);

  btnTemplates.addEventListener('click', () => openDrawer('templates'));
  btnHistory.addEventListener('click', () => openDrawer('history'));
  btnCloseDrawer.addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', closeDrawer);

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const inTextarea = document.activeElement === latexInput;
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z' && !inTextarea) {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey && e.key.toLowerCase() === 'y') && !inTextarea) {
      e.preventDefault();
      redo();
    } else if (e.key === 'Escape') {
      if (!sideDrawer.classList.contains('hidden')) closeDrawer();
    }
  });

  // Paste image from clipboard (Ctrl+V)
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        loadExternalImageFile(item.getAsFile());
        break;
      }
    }
  });

  // Drag & Drop image onto canvas
  canvasWrap.addEventListener('dragover', (e) => {
    e.preventDefault();
    canvasWrap.classList.add('drag-over');
  });
  canvasWrap.addEventListener('dragleave', () => {
    canvasWrap.classList.remove('drag-over');
  });
  canvasWrap.addEventListener('drop', (e) => {
    e.preventDefault();
    canvasWrap.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) loadExternalImageFile(file);
  });

  // Poll backend OCR readiness
  async function pollStatus() {
    try {
      const res = await fetch('/api/status');
      const st = await res.json();
      isStandalone = Boolean(st.standalone);

      if (st.ready) {
        modelReady = true;
        modelStatus.className = 'status-pill status-ready';
        modelStatusText.textContent = 'Gotowe offline';
        if (pendingAutoRecognize) {
          pendingAutoRecognize = false;
          recognizeCurrentCanvas();
        }
        return;
      }

      if (st.error) {
        modelStatus.className = 'status-pill status-error';
        modelStatusText.textContent = 'Błąd modelu OCR';
        showToast(st.error);
        return;
      }
    } catch (_) {}
    setTimeout(pollStatus, 500);
  }

  window.addEventListener('pagehide', () => {
    if (isStandalone && navigator.sendBeacon) {
      navigator.sendBeacon('/api/shutdown', '{}');
    }
  });

  // Init
  buildSymbolBar();
  updateHistoryCount();
  new ResizeObserver(resizeCanvas).observe(canvasWrap);
  resizeCanvas();
  pollStatus();
})();

