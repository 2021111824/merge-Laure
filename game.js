const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const nextPreview = document.getElementById("nextPreview");
const gameOverPanel = document.getElementById("gameOver");
const overlayCelebration = document.getElementById("overlayCelebration");
const overlayPreview = document.getElementById("overlayPreview");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const previewWinButton = document.getElementById("previewWinButton");
const restartButton = document.getElementById("restartButton");
const retryButton = document.getElementById("retryButton");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const DROP_Y = 72;
const DEADLINE_Y = 126;
const GRAVITY = 0.25;
const RESTITUTION = 0.18;
const FRICTION = 0.992;
const MAX_START_LEVEL = 4;
const COLLISION_PASSES = 6;
const ASSET_VERSION = Date.now();

const LEVELS = [
  { name: "第一页", size: 28, color: "#f6d6c2", emoji: "1" },
  { name: "第二页", size: 34, color: "#f2c6a8", emoji: "2" },
  { name: "第三页", size: 41, color: "#efb88d", emoji: "3" },
  { name: "第四页", size: 48, color: "#e6ab7a", emoji: "4" },
  { name: "第五页", size: 56, color: "#db9969", emoji: "5" },
  { name: "第六页", size: 64, color: "#d58d60", emoji: "6" },
  { name: "第七页", size: 72, color: "#cb7f50", emoji: "7" },
  { name: "第八页", size: 82, color: "#bf6e44", emoji: "8" },
  { name: "第九页", size: 92, color: "#af5e37", emoji: "9" },
  { name: "第十页", size: 104, color: "#964b2a", emoji: "10" },
  { name: "散文集", size: 118, color: "#7c381a", emoji: "集" }
];

let score = 0;
let bestScore = Number(localStorage.getItem("essay-merge-best") || 0);
let bodies = [];
let effects = [];
let nextLevel = randomStartLevel();
let currentX = WIDTH / 2;
let dropLocked = false;
let gameOver = false;
let lastSpawnAt = 0;
let assetsReady = false;

bestValue.textContent = bestScore;

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "JPG", "JPEG", "PNG", "WEBP"];
const levelImages = LEVELS.map(() => null);

async function loadLevelImage(index) {
  const paddedName = String(index + 1).padStart(2, "0");
  const plainName = String(index + 1);
  const candidateNames = [plainName, paddedName];

  for (const baseName of candidateNames) {
    for (const extension of IMAGE_EXTENSIONS) {
      const src = `assets/${baseName}.${extension}?v=${ASSET_VERSION}`;
      const loaded = await new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
      });

      if (loaded) {
        return loaded;
      }
    }
  }

  console.warn(`素材 ${plainName} 未能加载，请确认它是真正的 jpg/png/webp 图片，而不是改了扩展名的其他格式。`);
  return null;
}

Promise.all(LEVELS.map((_, index) => loadLevelImage(index))).then((results) => {
  for (let i = 0; i < results.length; i += 1) {
    levelImages[i] = results[i];
  }
  assetsReady = true;
  restartGame();
  renderNextPreview();
});

function randomStartLevel() {
  return Math.floor(Math.random() * MAX_START_LEVEL);
}

function renderNextPreview() {
  const level = LEVELS[nextLevel];
  const image = levelImages[nextLevel];
  nextPreview.innerHTML = "";

  if (image && image.complete && image.naturalWidth > 0) {
    const img = document.createElement("img");
    img.src = image.src;
    img.alt = level.name;
    nextPreview.appendChild(img);
    return;
  }

  const fallback = document.createElement("span");
  fallback.textContent = level.emoji;
  fallback.style.background = level.color;
  fallback.style.color = nextLevel > 7 ? "#fff5eb" : "#593722";
  nextPreview.appendChild(fallback);
}

function createBody(level, x, y) {
  const radius = LEVELS[level].size;
  return {
    id: crypto.randomUUID(),
    level,
    x,
    y,
    vx: 0,
    vy: 0,
    radius,
    merged: false,
    bornAt: performance.now(),
    blockedSince: 0,
    overflowSince: 0
  };
}

function spawnBody() {
  const radius = LEVELS[nextLevel].size;
  const x = clamp(currentX, radius + 8, WIDTH - radius - 8);
  bodies.push(createBody(nextLevel, x, DROP_Y));
  nextLevel = randomStartLevel();
  renderNextPreview();
  lastSpawnAt = performance.now();
  dropLocked = true;
}

function restartGame() {
  if (!assetsReady) {
    return;
  }

  score = 0;
  bodies = [];
  effects = [];
  nextLevel = randomStartLevel();
  currentX = WIDTH / 2;
  dropLocked = false;
  gameOver = false;
  lastSpawnAt = 0;
  scoreValue.textContent = "0";
  overlayTitle.textContent = "游戏结束";
  overlayMessage.textContent = "再来一局试试。";
  overlayCelebration.textContent = "恭喜通关";
  overlayCelebration.classList.add("hidden");
  overlayPreview.innerHTML = "";
  overlayPreview.classList.add("hidden");
  gameOverPanel.classList.remove("game-over--win");
  gameOverPanel.classList.add("hidden");
  renderNextPreview();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function addScore(level) {
  score += (level + 1) * 10;
  scoreValue.textContent = String(score);
  if (score > bestScore) {
    bestScore = score;
    bestValue.textContent = String(bestScore);
    localStorage.setItem("essay-merge-best", String(bestScore));
  }
}

function addEffect(x, y, text) {
  effects.push({ x, y, text, life: 1 });
}

function handleInput(clientX) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  currentX = (clientX - rect.left) * scaleX;
}

function onDrop() {
  if (!assetsReady || dropLocked || gameOver) {
    return;
  }
  spawnBody();
}

function renderOverlayPreview(levelIndex) {
  overlayPreview.innerHTML = "";
  const image = levelImages[levelIndex];

  if (image && image.complete && image.naturalWidth > 0) {
    const img = document.createElement("img");
    img.src = image.src;
    img.alt = LEVELS[levelIndex].name;
    overlayPreview.appendChild(img);
    return;
  }

  const fallback = document.createElement("span");
  fallback.textContent = LEVELS[levelIndex].emoji;
  overlayPreview.appendChild(fallback);
}

function showOverlay(title, message, options = {}) {
  const { mode = "lose", celebration = "", previewLevel = null } = options;
  gameOver = true;
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  gameOverPanel.classList.toggle("game-over--win", mode === "win");

  if (mode === "win") {
    overlayCelebration.textContent = celebration || "恭喜通关";
    overlayCelebration.classList.remove("hidden");
  } else {
    overlayCelebration.classList.add("hidden");
  }

  if (Number.isInteger(previewLevel)) {
    renderOverlayPreview(previewLevel);
    overlayPreview.classList.remove("hidden");
  } else {
    overlayPreview.innerHTML = "";
    overlayPreview.classList.add("hidden");
  }

  gameOverPanel.classList.remove("hidden");
}

canvas.addEventListener("mousemove", (event) => handleInput(event.clientX));
canvas.addEventListener("click", onDrop);
canvas.addEventListener("touchmove", (event) => {
  if (event.touches[0]) {
    handleInput(event.touches[0].clientX);
  }
}, { passive: true });
canvas.addEventListener("touchend", onDrop);
if (previewWinButton) {
  previewWinButton.addEventListener("click", () => {
    if (!assetsReady) {
      return;
    }

    showOverlay("合成成功", "你已经拼出最终的散文集。", {
      mode: "win",
      celebration: "恭喜通关",
      previewLevel: LEVELS.length - 1
    });
  });
}
restartButton.addEventListener("click", restartGame);
retryButton.addEventListener("click", restartGame);

function updatePhysics() {
  for (const body of bodies) {
    body.vy += GRAVITY;
    body.x += body.vx;
    body.y += body.vy;
    body.vx *= FRICTION;

    if (body.x - body.radius < 0) {
      body.x = body.radius;
      body.vx *= -0.7;
    }
    if (body.x + body.radius > WIDTH) {
      body.x = WIDTH - body.radius;
      body.vx *= -0.7;
    }
    if (body.y + body.radius > HEIGHT) {
      body.y = HEIGHT - body.radius;
      body.vy *= -RESTITUTION;
      if (Math.abs(body.vy) < 0.5) {
        body.vy = 0;
      }
    }
  }

  for (let pass = 0; pass < COLLISION_PASSES; pass += 1) {
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i];
        const b = bodies[j];
        if (a.merged || b.merged) {
          continue;
        }

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minDistance = a.radius + b.radius;

        if (distance >= minDistance) {
          continue;
        }

        if (a.level === b.level && a.level < LEVELS.length - 1) {
          mergeBodies(a, b);
          continue;
        }

        if (distance === 0) {
          dx = 0.001;
          dy = 0;
          distance = 0.001;
        }

        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance - distance;
        const correction = overlap * 0.52 + 0.08;

        a.x -= nx * correction;
        a.y -= ny * correction;
        b.x += nx * correction;
        b.y += ny * correction;

        const relativeVx = b.vx - a.vx;
        const relativeVy = b.vy - a.vy;
        const normalVelocity = relativeVx * nx + relativeVy * ny;

        if (normalVelocity < 0) {
          const impulse = normalVelocity * -0.58;
          a.vx -= nx * impulse;
          a.vy -= ny * impulse;
          b.vx += nx * impulse;
          b.vy += ny * impulse;
        }

        clampBodyToBounds(a);
        clampBodyToBounds(b);
      }
    }
  }

  bodies = bodies.filter((body) => !body.merged);
  effects = effects.filter((effect) => effect.life > 0);
}

function clampBodyToBounds(body) {
  body.x = clamp(body.x, body.radius, WIDTH - body.radius);
  body.y = Math.min(body.y, HEIGHT - body.radius);
}

function mergeBodies(a, b) {
  a.merged = true;
  b.merged = true;

  const newLevel = a.level + 1;
  const mergedBody = createBody(
    newLevel,
    (a.x + b.x) / 2,
    (a.y + b.y) / 2
  );
  mergedBody.vx = (a.vx + b.vx) * 0.35;
  mergedBody.vy = Math.min(a.vy, b.vy) * 0.2;
  bodies.push(mergedBody);

  addScore(newLevel);
  addEffect(mergedBody.x, mergedBody.y, `+${(newLevel + 1) * 10}`);

  if (newLevel === LEVELS.length - 1) {
    showOverlay("合成成功", "你已经拼出最终的散文集。", {
      mode: "win",
      celebration: "恭喜通关",
      previewLevel: newLevel
    });
  }
}

function updateEffects() {
  for (const effect of effects) {
    effect.y -= 0.6;
    effect.life -= 0.02;
  }
}

function updateGameState() {
  if (gameOver) {
    return;
  }

  const now = performance.now();

  if (dropLocked && now - lastSpawnAt > 400) {
    dropLocked = false;
  }

  updatePhysics();
  updateEffects();

  for (const body of bodies) {
    const isNearTop = body.y - body.radius < DEADLINE_Y;
    const isSettled = Math.abs(body.vy) < 0.8 && Math.abs(body.vx) < 0.8;
    const isOldEnough = now - body.bornAt > 900;

    if (isNearTop && isOldEnough) {
      if (!body.overflowSince) {
        body.overflowSince = now;
      }

      if (now - body.overflowSince > 650) {
        showOverlay("游戏结束", "圆球越过顶线太久了，再来一局试试。");
        break;
      }
    } else {
      body.overflowSince = 0;
    }

    if (isNearTop && isSettled && isOldEnough) {
      if (!body.blockedSince) {
        body.blockedSince = now;
      }

      if (now - body.blockedSince > 700) {
        showOverlay("游戏结束", "顶线被堆满了，再来一局试试。");
        break;
      }
    } else {
      body.blockedSince = 0;
    }
  }
}

function drawBody(body) {
  const level = LEVELS[body.level];
  const image = levelImages[body.level];

  ctx.save();
  ctx.beginPath();
  ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (image && image.complete && image.naturalWidth > 0) {
    ctx.drawImage(
      image,
      body.x - body.radius,
      body.y - body.radius,
      body.radius * 2,
      body.radius * 2
    );
  } else {
    ctx.fillStyle = level.color;
    ctx.fillRect(body.x - body.radius, body.y - body.radius, body.radius * 2, body.radius * 2);
    ctx.fillStyle = body.level > 7 ? "#fff3e6" : "#5c3722";
    ctx.font = `${Math.round(body.radius * 0.9)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(level.emoji, body.x, body.y + 1);
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(94, 57, 33, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawAimingPiece() {
  if (gameOver) {
    return;
  }

  const level = LEVELS[nextLevel];
  const radius = level.size;
  const x = clamp(currentX, radius + 8, WIDTH - radius - 8);

  ctx.save();
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = "rgba(110, 81, 56, 0.35)";
  ctx.beginPath();
  ctx.moveTo(x, 18);
  ctx.lineTo(x, DROP_Y);
  ctx.stroke();
  ctx.restore();

  ctx.globalAlpha = 0.78;
  drawBody({ x, y: DROP_Y, radius, level: nextLevel });
  ctx.globalAlpha = 1;
}

function drawEffects() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 20px sans-serif";
  for (const effect of effects) {
    ctx.globalAlpha = effect.life;
    ctx.fillStyle = "#8a4417";
    ctx.fillText(effect.text, effect.x, effect.y);
  }
  ctx.restore();
}

function drawScene() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (!assetsReady) {
    ctx.fillStyle = "#f7ecdf";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#7d614d";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("素材加载中...", WIDTH / 2, HEIGHT / 2 - 12);
    ctx.font = "16px sans-serif";
    ctx.fillText("首次打开会稍等一下", WIDTH / 2, HEIGHT / 2 + 22);
    return;
  }

  ctx.fillStyle = "rgba(137, 91, 58, 0.14)";
  ctx.fillRect(0, DEADLINE_Y, WIDTH, 2);

  for (const body of bodies) {
    drawBody(body);
  }

  drawAimingPiece();
  drawEffects();
}

function loop() {
  updateGameState();
  drawScene();
  requestAnimationFrame(loop);
}

loop();
