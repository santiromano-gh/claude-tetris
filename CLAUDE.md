# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Vanilla-JS Tetris rendered with the HTML5 Canvas 2D API. No build step, no dependencies, no package manager, no tests. Three source files: `index.html`, `style.css`, `game.js`. UI strings are in Spanish; identifiers and comments in `game.js` are English.

## Running

Open `index.html` directly in a browser, or serve the folder statically (`python3 -m http.server 8000`, `npx serve .`). There is nothing to build or lint.

## Architecture (`game.js`)

Single-file, module-free script (`'use strict'`), all state in module-level `let` variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `animId`, ...). `init()` runs on load and on Restart; it resets every variable and starts the `requestAnimationFrame` loop.

Key pieces that span functions:

- **Board model**: `board` is a `ROWS`×`COLS` array of ints. `0` = empty; `1`–`8` index into both `COLORS` and `PIECES` (same index identifies a piece's color and its shape matrix). `createBoard()` builds it.
- **Pieces**: `PIECES[type]` is a square matrix. Rotation = transpose + row-reverse in `rotateCW()`. `tryRotate()` applies it then attempts wall kicks (`[0,-1,1,-2,2]` column offsets) via `collide()`. Index `8` is the "tuerca" (nut, `NUT` constant): a 3×3 ring whose center cell is `0`, so locking it leaves a permanent hole — `collide()`/`merge()`/`clearLines()` already skip `0` cells; `drawBlock()` has a `colorIndex === NUT` branch that punches the bore/ring detail.
- **Collision**: `collide(shape, x, y)` is the single source of truth for "can this shape sit here" — used by movement, rotation, `ghostY()`, soft/hard drop, and spawn (spawn collision triggers `endGame()`).
- **Game loop**: `loop(ts)` accumulates delta time into `dropAccum`; when it exceeds `dropInterval` the piece steps down one row or `lockPiece()` runs. `lockPiece()` = `merge()` (stamp shape into `board`) → `clearLines()` → `spawn()` (promote `next` to `current`, roll a new `next`, redraw preview).
- **Scoring / speed**: `LINE_SCORES = [0,100,300,500,800]` × `level`; soft drop +1/row, hard drop +2/cell. `level = floor(lines/10) + 1`; `dropInterval = max(100, 1000 - (level-1)*90)` — recomputed only in `clearLines()`.
- **Rendering**: everything redrawn each frame by `draw()` — grid, locked board, ghost piece (`drawBlock` with `alpha` 0.2), then the active piece. `drawNext()` renders the preview canvas separately, only on spawn.
- **Input**: one `keydown` listener. `P` toggles pause (shows the shared `#overlay` with title `PAUSA` / `GAME OVER`); arrows/`X`/`Space` mutate `current` directly and guard with `collide()`.

## Constants coupling

`COLS`, `ROWS`, `BLOCK` at the top of `game.js` must match the `<canvas id="board">` `width`/`height` in `index.html` (`width = COLS*BLOCK`, `height = ROWS*BLOCK`). Changing board size means editing both files.
