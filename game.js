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

// ---- Visual skins / themes (Unit 3) ------------------------------------
// Each skin defines a palette, canvas backgrounds and its own way to paint
// one cell via drawCell(context, x, y, colorIndex, size). The ghost's alpha
// is handled by drawBlock() (globalAlpha is set/reset outside).

function roundedRectPath(context, px, py, w, h, r) {
  context.moveTo(px + r, py);
  context.lineTo(px + w - r, py);
  context.arcTo(px + w, py, px + w, py + r, r);
  context.lineTo(px + w, py + h - r);
  context.arcTo(px + w, py + h, px + w - r, py + h, r);
  context.lineTo(px + r, py + h);
  context.arcTo(px, py + h, px, py + h - r, r);
  context.lineTo(px, py + r);
  context.arcTo(px, py, px + r, py, r);
}

// Shared round-bore rendering for the tuerca (NUT) so every skin's hole
// stays visually in sync: a filled disc plus a ring stroke.
function drawNutBore(context, cx, cy, r, fillStyle, strokeStyle) {
  context.fillStyle = fillStyle;
  context.beginPath();
  context.arc(cx, cy, r, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = strokeStyle;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(cx, cy, r, 0, Math.PI * 2);
  context.stroke();
}

const SKINS = {
  retro: {
    label: 'Retro',
    palette: COLORS,
    boardBg: '#1a1a25',
    gridStroke: '#22222e',
    drawCell(context, x, y, colorIndex, size) {
      const color = this.palette[colorIndex];
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      // highlight
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      if (colorIndex === NUT) {
        drawNutBore(context, x * size + size / 2, y * size + size / 2,
          size * 0.24, '#1a1a25', 'rgba(0,0,0,0.35)');
      }
    },
  },

  neon: {
    label: 'Neon',
    palette: [
      null,
      '#00e5ff', '#ffe600', '#d500f9', '#00e676',
      '#ff1744', '#2979ff', '#ff9100', '#c0c8d0',
    ],
    boardBg: '#05050a',
    gridStroke: '#153447',
    drawCell(context, x, y, colorIndex, size) {
      const color = this.palette[colorIndex];
      const px = x * size + 1, py = y * size + 1, s = size - 2;
      context.shadowColor = color;
      context.shadowBlur = 12;
      context.fillStyle = color;
      context.fillRect(px, py, s, s);
      context.shadowBlur = 0;
      context.fillStyle = 'rgba(255,255,255,0.18)';
      context.fillRect(px, py, s, 4);
      if (colorIndex === NUT) {
        drawNutBore(context, x * size + size / 2, y * size + size / 2,
          size * 0.26, '#05050a', color);
      }
    },
  },

  pastel: {
    label: 'Pastel',
    palette: [
      null,
      '#a0e7e5', '#fbe7a1', '#d9b8f0', '#b8e6c1',
      '#f7b8b8', '#b8d0f0', '#f8d0a8', '#cfd8dc',
    ],
    boardBg: '#e8e4f0',
    gridStroke: '#d0c8e0',
    drawCell(context, x, y, colorIndex, size) {
      const color = this.palette[colorIndex];
      const px = x * size + 2, py = y * size + 2, s = size - 4;
      const r = Math.min(8, s / 3);
      context.fillStyle = color;
      context.beginPath();
      if (context.roundRect) context.roundRect(px, py, s, s, r);
      else roundedRectPath(context, px, py, s, s, r);
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.30)';
      context.fillRect(px + 3, py + 3, s - 6, 3);
      if (colorIndex === NUT) {
        drawNutBore(context, x * size + size / 2, y * size + size / 2,
          size * 0.24, this.boardBg, 'rgba(0,0,0,0.18)');
      }
    },
  },

  pixel: {
    label: 'Pixel art',
    palette: [
      null,
      '#3ec6d6', '#e6c33f', '#a85cc0', '#6cbf6c',
      '#d95c5c', '#6ba8e6', '#e69a3c', '#9aa5ad',
    ],
    boardBg: '#12121a',
    gridStroke: '#2c2c3a',
    drawCell(context, x, y, colorIndex, size) {
      const color = this.palette[colorIndex];
      const px = x * size + 1, py = y * size + 1, s = size - 2;
      context.fillStyle = color;
      context.fillRect(px, py, s, s);
      // deterministic checkerboard dither texture
      const d = 3;
      context.fillStyle = 'rgba(0,0,0,0.18)';
      for (let iy = 0; iy < s; iy += d) {
        for (let ix = 0; ix < s; ix += d) {
          if (((ix / d) + (iy / d)) % 2 === 0) {
            context.fillRect(px + ix, py + iy, Math.min(d, s - ix), Math.min(d, s - iy));
          }
        }
      }
      context.fillStyle = 'rgba(255,255,255,0.10)';
      context.fillRect(px, py, s, 3);
      if (colorIndex === NUT) {
        const cx = x * size + size / 2;
        const cy = y * size + size / 2;
        const hs = size * 0.36;
        context.fillStyle = this.boardBg;
        context.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
        context.strokeStyle = 'rgba(0,0,0,0.45)';
        context.lineWidth = 2;
        context.strokeRect(cx - hs / 2, cy - hs / 2, hs, hs);
      }
    },
  },
};

let currentSkin = SKINS.retro;

function isSkin(name) {
  return Object.prototype.hasOwnProperty.call(SKINS, name);
}

function applySkin(name) {
  const key = isSkin(name) ? name : 'retro';
  currentSkin = SKINS[key];
  canvas.style.background = currentSkin.boardBg;
  nextCanvas.style.background = currentSkin.boardBg;
  document.body.dataset.skin = key;
}

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
const restartBtn = document.getElementById('restart-btn');
const skinSelect = document.getElementById('skin-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

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
  clearLines();
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
  context.globalAlpha = alpha ?? 1;
  currentSkin.drawCell(context, x, y, colorIndex, size);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = currentSkin.gridStroke;
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
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
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
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
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

// ---- Skin: persisted load and live switching (Unit 3) ----
function loadSkin() {
  let saved = 'retro';
  try {
    const v = localStorage.getItem('tetris.skin');
    if (v && isSkin(v)) saved = v;
  } catch (e) { /* localStorage unavailable */ }
  applySkin(saved);
  if (skinSelect) skinSelect.value = saved;
}

if (skinSelect) {
  skinSelect.addEventListener('change', () => {
    const name = skinSelect.value;
    applySkin(name);
    try {
      localStorage.setItem('tetris.skin', name);
    } catch (e) { /* localStorage unavailable */ }
    draw();
    if (next) drawNext();
  });
}

loadSkin();
init();
