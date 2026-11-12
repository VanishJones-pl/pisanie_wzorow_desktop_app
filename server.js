const http = require('http');
const fs = require('fs');
const path = require('path');
const ort = require('onnxruntime-node');

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const MODELS_DIR = path.join(ROOT_DIR, 'models');
const MODEL_NAME = 'pix2text-mfr-1.5';
const RUNTIME_URL_FILE = path.join(ROOT_DIR, '.runtime-url');

const IS_STANDALONE = process.argv.includes('--standalone');
const PREFERRED_PORT = Number(process.env.PORT || 4821);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const modelState = {
  ready: false,
  loading: true,
  error: null,
  loadTimeMs: null,
};

let processor = null;
let tokenizer = null;
let encoderSession = null;
let decoderSession = null;
let transformersModule = null;
let inferenceChain = Promise.resolve();
let shutdownTimer = null;

/**
 * Cleans noisy font/spacing tokens emitted by TrOCR-based formula OCR
 * while preserving genuine LaTeX commands and mathematical structure.
 */
function cleanLatex(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.trim();

  // Strip surrounding math delimiters if the model emitted them.
  s = s.replace(/^\$\$|\$\$$/g, '').replace(/^\$|\$$/g, '').trim();

  // Remove thin negative/positive spacing commands that clutter copied LaTeX.
  s = s.replace(/\\!|\\,|\\:|\\;/g, ' ');

  // Collapse spaces between braces/commands emitted by XLMRoberta tokenizer spacing.
  s = s.replace(/\s*\{\s*/g, '{').replace(/\s*\}\s*/g, '}');
  s = s.replace(/\s*\^\s*/g, '^').replace(/\s*_\s*/g, '_');

  // Unwrap single-character or symbol font wrappers like \mathrm{x}, \mathsf{a}, \boldsymbol{y}.
  const fontCmds = ['mathrm', 'mathsf', 'mathtt', 'mathbf', 'boldsymbol', 'mathit', 'textbf'];
  for (const cmd of fontCmds) {
    const re = new RegExp(`\\\\${cmd}\\{([A-Za-z0-9\\\\+\\-=().,]+)\\}`, 'g');
    let prev;
    do {
      prev = s;
      s = s.replace(re, (match, inner) => {
        // Keep multi-letter upright words (e.g. \mathrm{max}, \mathrm{sin}) intact.
        if (/^[A-Za-z]{2,}$/.test(inner)) return match;
        return inner;
      });
    } while (s !== prev);
  }

  // Re-insert clean spacing after commands before identifiers, e.g. \frac{a}{b}
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

async function loadModel() {
  const start = Date.now();
  modelState.loading = true;
  modelState.error = null;

  try {
    transformersModule = await import('@huggingface/transformers');
    const { env, AutoImageProcessor, AutoTokenizer } = transformersModule;

    env.localModelPath = MODELS_DIR;
    env.allowRemoteModels = false;
    env.allowLocalModels = true;

    const modelDir = path.join(MODELS_DIR, MODEL_NAME);
    const encPath = path.join(modelDir, 'onnx', 'encoder_model.onnx');
    const decPath = path.join(modelDir, 'onnx', 'decoder_model.onnx');

    if (!fs.existsSync(encPath) || !fs.existsSync(decPath)) {
      throw new Error(`Brak plików modelu w folderze: ${modelDir}`);
    }

    const [proc, tok, enc, dec] = await Promise.all([
      AutoImageProcessor.from_pretrained(MODEL_NAME),
      AutoTokenizer.from_pretrained(MODEL_NAME),
      ort.InferenceSession.create(encPath),
      ort.InferenceSession.create(decPath),
    ]);

    processor = proc;
    tokenizer = tok;
    encoderSession = enc;
    decoderSession = dec;

    modelState.ready = true;
    modelState.loading = false;
    modelState.loadTimeMs = Date.now() - start;
    console.log(`[OCR] Model ${MODEL_NAME} załadowany offline w ${modelState.loadTimeMs} ms`);
  } catch (err) {
    modelState.loading = false;
    modelState.ready = false;
    modelState.error = err.message || String(err);
    console.error('[OCR] Błąd ładowania modelu:', err);
  }
}

async function runInference(imageBase64) {
  if (!modelState.ready) {
    if (modelState.loading) {
      throw new Error('Model OCR jeszcze się ładuje, spróbuj za chwilę.');
    }
    throw new Error(modelState.error || 'Model OCR nie jest dostępny.');
  }

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const { RawImage } = transformersModule;

  let img = await RawImage.fromBlob(new Blob([buffer], { type: 'image/png' }));
  if (img.channels !== 3) {
    img = img.rgb();
  }

  const t0 = Date.now();
  const inputs = await processor(img);
  const pv = inputs.pixel_values;
  const encOut = await encoderSession.run({
    pixel_values: new ort.Tensor('float32', pv.data, pv.dims),
  });
  const hiddenStates = encOut.last_hidden_state;

  // Greedy autoregressive decoding with repetition guard.
  const ids = [1n]; // bos_token_id = 1
  const EOS_ID = 2;
  const MAX_TOKENS = 192;
  let repeatCount = 0;
  let lastToken = -1;

  for (let step = 0; step < MAX_TOKENS; step++) {
    const decOut = await decoderSession.run({
      input_ids: new ort.Tensor('int64', BigInt64Array.from(ids), [1, ids.length]),
      encoder_hidden_states: hiddenStates,
    });

    const logits = decOut.logits;
    const vocabSize = logits.dims[2];
    const offset = (ids.length - 1) * vocabSize;

    let bestId = 0;
    let bestVal = -Infinity;
    for (let v = 0; v < vocabSize; v++) {
      const val = logits.data[offset + v];
      if (val > bestVal) {
        bestVal = val;
        bestId = v;
      }
    }

    ids.push(BigInt(bestId));
    if (bestId === EOS_ID) break;

    if (bestId === lastToken) {
      repeatCount++;
      if (repeatCount >= 12) break;
    } else {
      repeatCount = 0;
      lastToken = bestId;
    }
  }

  const rawLatex = tokenizer.decode(ids.map(Number), { skip_special_tokens: true }).trim();
  const latex = cleanLatex(rawLatex);

  return {
    latex,
    rawLatex,
    durationMs: Date.now() - t0,
  };
}

function resolveSafePath(baseDir, reqPath) {
  const cleanPath = decodeURIComponent(reqPath.split('?')[0]);
  const fullPath = path.normalize(path.join(baseDir, cleanPath));
  if (!fullPath.startsWith(baseDir)) return null;
  return fullPath;
}

function serveFile(res, filePath) {
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Nie znaleziono pliku');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
}

function readJsonBody(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Obraz jest zbyt duży (limit 15 MB).'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error('Nieprawidłowy format JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  // Cancel pending standalone shutdown if client reconnects/reloads.
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }

  const urlPath = (req.url || '/').split('?')[0];

  if (req.method === 'GET' && urlPath === '/api/status') {
    return sendJson(res, 200, { ...modelState, model: MODEL_NAME, standalone: IS_STANDALONE });
  }

  if (req.method === 'POST' && urlPath === '/api/recognize') {
    try {
      const body = await readJsonBody(req);
      if (!body.imageBase64 || typeof body.imageBase64 !== 'string') {
        return sendJson(res, 400, { error: 'Brak danych obrazu (imageBase64).' });
      }
      const result = await (inferenceChain = inferenceChain.then(
        () => runInference(body.imageBase64),
        () => runInference(body.imageBase64)
      ));
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { error: err.message || 'Błąd rozpoznawania wzoru.' });
    }
  }

  if (req.method === 'POST' && urlPath === '/api/shutdown') {
    sendJson(res, 200, { ok: true });
    if (IS_STANDALONE) {
      shutdownTimer = setTimeout(() => {
        cleanupRuntimeFile();
        process.exit(0);
      }, 1500);
    }
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    return res.end('Method Not Allowed');
  }

  if (urlPath.startsWith('/vendor/katex/')) {
    const rel = urlPath.slice('/vendor/katex/'.length);
    return serveFile(res, resolveSafePath(path.join(ROOT_DIR, 'node_modules', 'katex', 'dist'), rel));
  }

  if (urlPath.startsWith('/vendor/temml/')) {
    const rel = urlPath.slice('/vendor/temml/'.length);
    return serveFile(res, resolveSafePath(path.join(ROOT_DIR, 'node_modules', 'temml', 'dist'), rel));
  }

  const relPublic = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  return serveFile(res, resolveSafePath(PUBLIC_DIR, relPublic));
});

function cleanupRuntimeFile() {
  try {
    if (fs.existsSync(RUNTIME_URL_FILE)) fs.unlinkSync(RUNTIME_URL_FILE);
  } catch (_) {}
}

process.on('SIGINT', () => {
  cleanupRuntimeFile();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanupRuntimeFile();
  process.exit(0);
});

function startListening(port) {
  server.listen(port, '127.0.0.1', () => {
    const addr = server.address();
    const url = `http://127.0.0.1:${addr.port}`;
    try {
      fs.writeFileSync(RUNTIME_URL_FILE, url, 'utf8');
    } catch (_) {}
    console.log(`Serwer uruchomiony pod adresem: ${url}`);
    loadModel();
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && PREFERRED_PORT !== 0) {
    startListening(0);
  } else {
    console.error('Błąd serwera:', err);
    process.exit(1);
  }
});

startListening(PREFERRED_PORT);
