'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const NUT = 8;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#b0bec5', // Tuerca - metal
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // Tuerca (nut) - centro 0 = hueco permanente
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const overlayNameForm = document.getElementById('overlay-nameform');
const overlayNameInput = document.getElementById('overlay-name');
const overlaySaveBtn = document.getElementById('overlay-save');
const overlayRecords = document.getElementById('overlay-records');
const restartBtn = document.getElementById('restart-btn');
const startScreen = document.getElementById('start-screen');
const startRecords = document.getElementById('start-records');
const playBtn = document.getElementById('play-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let combo, maxCombo;
let started = false; // pasa a true cuando init() arrancó una partida; controla input y pausa

/* ---- Records locales (localStorage) ---- */
const RECORDS_KEY = 'tetris.records';

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]
  ));
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return { top: [], bestCombo: 0, maxLines: 0 };
    const parsed = JSON.parse(raw);
    const top = Array.isArray(parsed && parsed.top) ? parsed.top : [];
    return {
      top: top
        .filter(e => e && typeof e === 'object')
        .map(e => ({
          name: typeof e.name === 'string' ? e.name : 'Anónimo',
          score: Number(e.score) || 0,
          lines: Number(e.lines) || 0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
      bestCombo: Number(parsed && parsed.bestCombo) || 0,
      maxLines: Number(parsed && parsed.maxLines) || 0,
    };
  } catch (e) {
    return { top: [], bestCombo: 0, maxLines: 0 };
  }
}

function persistRecords(data) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(data));
  } catch (e) {
    /* almacenamiento no disponible: se ignora */
  }
}

function qualifies(scoreVal) {
  const { top } = loadRecords();
  return top.length < 5 || scoreVal > top[top.length - 1].score;
}

function saveRecordEntry(name, scoreVal, linesVal, comboVal) {
  const data = loadRecords();
  const entry = { name, score: scoreVal, lines: linesVal };
  data.top.push(entry);
  data.top.sort((a, b) => b.score - a.score);
  data.top = data.top.slice(0, 5);
  data.bestCombo = Math.max(data.bestCombo, comboVal || 0);
  data.maxLines = Math.max(data.maxLines, linesVal || 0);
  persistRecords(data);
  return data.top.indexOf(entry);
}

function resetRecords() {
  try {
    localStorage.removeItem(RECORDS_KEY);
  } catch (e) {
    /* almacenamiento no disponible: se ignora */
  }
}

function renderRecordsTable(container, opts) {
  const highlightIndex = opts && typeof opts.highlightIndex === 'number' ? opts.highlightIndex : -1;
  const data = loadRecords();
  const rows = data.top.map((e, i) => {
    const cls = i === highlightIndex ? 'record-row highlight' : 'record-row';
    return `<tr class="${cls}"><td>${i + 1}</td><td>${escapeHtml(e.name)}</td>` +
      `<td>${e.score.toLocaleString()}</td><td>${e.lines}</td></tr>`;
  }).join('');
  const body = rows || '<tr><td colspan="4" class="record-empty">Sin registros</td></tr>';
  container.innerHTML =
    '<table class="records-table">' +
      '<thead><tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Líneas</th></tr></thead>' +
      `<tbody>${body}</tbody>` +
    '</table>' +
    `<p class="records-stats">Mejor combo: ${data.bestCombo} &middot; Máx. líneas: ${data.maxLines}</p>`;
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  const cleared = clearLines();
  if (cleared >= 1) {
    combo++;
    maxCombo = Math.max(maxCombo, combo);
  } else {
    combo = 0;
  }
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  if (colorIndex === NUT) {
    const cx = x * size + size / 2;
    const cy = y * size + size / 2;
    // hueco interior: círculo del color de fondo del tablero
    context.fillStyle = '#1a1a25';
    context.beginPath();
    context.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
    context.fill();
    // aro metálico alrededor del hueco
    context.strokeStyle = 'rgba(0,0,0,0.35)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = '#22222e';
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  if (gameOver) return; // con el juego terminado no se dibuja ghost ni pieza activa

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  draw(); // repinta el tablero final sin la pieza que no pudo entrar
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;

  if (qualifies(score)) {
    overlayNameForm.classList.remove('hidden');
    overlayNameInput.value = '';
    renderRecordsTable(overlayRecords, { highlightIndex: -1 });
    const submit = () => {
      const idx = saveRecordEntry(overlayNameInput.value.trim() || 'Anónimo', score, lines, maxCombo);
      overlayNameForm.classList.add('hidden');
      renderRecordsTable(overlayRecords, { highlightIndex: idx });
    };
    overlaySaveBtn.onclick = submit;
    overlayNameInput.onkeydown = ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); submit(); }
    };
    setTimeout(() => overlayNameInput.focus(), 0);
  } else {
    overlayNameForm.classList.add('hidden');
    renderRecordsTable(overlayRecords, { highlightIndex: -1 });
  }

  overlay.classList.remove('hidden');
}

function togglePause() {
  if (!started || gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (!gameOver && !paused) animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  combo = 0;
  maxCombo = 0;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  // limpia cualquier resto del game-over anterior (form de nombre / tabla / handlers)
  overlayNameForm.classList.add('hidden');
  overlayNameInput.onkeydown = null;
  overlaySaveBtn.onclick = null;
  overlayRecords.innerHTML = '';
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  started = true;
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (!started) return; // la partida aún no arrancó (pantalla de inicio)
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

playBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  init();
});

resetRecordsBtn.addEventListener('click', () => {
  resetRecords();
  renderRecordsTable(startRecords, { highlightIndex: -1 });
});

// El juego no arranca solo: la pantalla de inicio queda visible y "Jugar" llama a init().
renderRecordsTable(startRecords, { highlightIndex: -1 });
