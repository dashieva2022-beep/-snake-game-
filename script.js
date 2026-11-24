(() => {
  // Canvas and game dimensions
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const GRID = 24; // 24 x 24 grid cells
  const CELL = canvas.width / GRID;
  const BASE_SPEED = 140; // ms per tick at level 0

  // DOM elements
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');

  // Game state
  let snake = [];
  let food = null;
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let score = 0;
  let best = Number(localStorage.getItem('snake-best')) || 0;
  let running = false;
  let gameOver = false;
  let tickId = null;

  bestEl.textContent = best;

  const speed = () => Math.max(60, BASE_SPEED - Math.floor(score / 10) * 8);

  function randomCell() {
    return {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  }

  function spawnFood() {
    let candidate;
    do {
      candidate = randomCell();
    } while (snake.some((seg) => seg.x === candidate.x && seg.y === candidate.y));
    food = candidate;
  }

  function resetGame() {
    snake = [
      { x: Math.floor(GRID / 2), y: Math.floor(GRID / 2) },
      { x: Math.floor(GRID / 2) - 1, y: Math.floor(GRID / 2) },
      { x: Math.floor(GRID / 2) - 2, y: Math.floor(GRID / 2) },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    gameOver = false;
    scoreEl.textContent = score;
    spawnFood();
  }

  function start() {
    resetGame();
    running = true;
    hideOverlay();
    clearInterval(tickId);
    tickId = setInterval(tick, speed());
    draw();
  }

  function stopAndShowOverlay(title, text, buttonText) {
    running = false;
    clearInterval(tickId);
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startBtn.textContent = buttonText;
    showOverlay();
    draw();
  }

  function gameOverHandler() {
    if (score > best) {
      best = score;
      localStorage.setItem('snake-best', best);
      bestEl.textContent = best;
    }
    stopAndShowOverlay('💀 Game Over', `Your score: ${score}. Best: ${best}.`, 'Play Again');
  }

  function winHandler() {
    stopAndShowOverlay('🏆 You Win!', `You filled the whole board! Score: ${score}`, 'Play Again');
  }

  function tick() {
    if (!running) return;

    // Apply buffered direction (prevent reversing into itself)
    if (!(nextDirection.x === -direction.x && nextDirection.y === -direction.y)) {
      direction = { ...nextDirection };
    }

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Wall collision
    if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
      gameOverHandler();
      return;
    }

    // Self collision (tail segment will move unless eating, so exclude last when not eating)
    const willEat = food && head.x === food.x && head.y === food.y;
    const bodyToCheck = willEat ? snake : snake.slice(0, -1);
    if (bodyToCheck.some((seg) => seg.x === head.x && seg.y === head.y)) {
      gameOverHandler();
      return;
    }

    snake.unshift(head);

    if (willEat) {
      score++;
      scoreEl.textContent = score;
      if (snake.length === GRID * GRID) {
        winHandler();
        return;
      }
      spawnFood();
      // Recalculate interval for speed increase
      clearInterval(tickId);
      tickId = setInterval(tick, speed());
    } else {
      snake.pop();
    }

    draw();
  }

  function draw() {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(canvas.width, i * CELL);
      ctx.stroke();
    }

    // Food
    if (food) {
      const fx = food.x * CELL + CELL / 2;
      const fy = food.y * CELL + CELL / 2;
      ctx.shadowColor = '#ff5252';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#ff5252';
      ctx.beginPath();
      ctx.arc(fx, fy, CELL * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Glossy highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(fx - CELL * 0.12, fy - CELL * 0.12, CELL * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Snake
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      const pad = 1.5;
      const x = seg.x * CELL + pad;
      const y = seg.y * CELL + pad;
      const size = CELL - pad * 2;

      const gradient = ctx.createLinearGradient(
        seg.x * CELL,
        seg.y * CELL,
        seg.x * CELL + CELL,
        seg.y * CELL + CELL
      );
      if (isHead) {
        gradient.addColorStop(0, '#00e676');
        gradient.addColorStop(1, '#00b0ff');
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 12;
      } else {
        const t = i / snake.length;
        gradient.addColorStop(0, `rgba(0, 230, 118, ${1 - t * 0.5})`);
        gradient.addColorStop(1, `rgba(0, 176, 255, ${1 - t * 0.5})`);
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = gradient;
      roundRect(ctx, x, y, size, size, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Eyes on the head
    const head = snake[0];
    const cx = head.x * CELL + CELL / 2;
    const cy = head.y * CELL + CELL / 2;
    ctx.fillStyle = '#ffffff';
    const eyeOff = CELL * 0.18;
    const pupilOff = CELL * 0.07;
    ctx.beginPath();
    ctx.arc(cx - eyeOff, cy - eyeOff, CELL * 0.1, 0, Math.PI * 2);
    ctx.arc(cx + eyeOff, cy - eyeOff, CELL * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a14';
    ctx.beginPath();
    ctx.arc(cx - eyeOff + direction.x * pupilOff, cy - eyeOff + direction.y * pupilOff, CELL * 0.05, 0, Math.PI * 2);
    ctx.arc(cx + eyeOff + direction.x * pupilOff, cy - eyeOff + direction.y * pupilOff, CELL * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Overlay helpers
  function showOverlay() {
    overlay.classList.remove('hidden');
  }
  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  // Controls
  function handleKey(e) {
    const key = e.key;
    const map = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };
    const dir = map[key];
    if (!dir) return;
    e.preventDefault();

    if (!running && !gameOver) {
      start();
    }
    nextDirection = dir;
  }

  document.addEventListener('keydown', handleKey);

  startBtn.addEventListener('click', () => {
    if (running) return;
    start();
  });

  restartBtn.addEventListener('click', () => {
    clearInterval(tickId);
    start();
  });

  // Initial state
  resetGame();
  draw();
})();