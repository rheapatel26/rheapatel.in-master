/**
 * ═══════════════════════════════════════════════════
 *  RHEA'S WORLD · game.js
 *  Pixel-art NYC/cyberpunk interactive portfolio game
 *  Vanilla Canvas2D — no dependencies
 * ═══════════════════════════════════════════════════
 *
 *  ╔══════════════════════════════════════════╗
 *  ║ TO ADD A NEW PROJECT:                    ║
 *  ║  1. Add an entry to the PROJECTS array   ║
 *  ║  2. Give it a name, tag, url, color, desc║
 *  ║  That's it! The game auto-places it.     ║
 *  ╚══════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════
// 1. PROJECT DATA — Edit this array to add projects
// ═══════════════════════════════════════════════════
const PROJECTS = [
  {
    name: "PPT Builder",
    tag: "AI TOOL",
    desc: "AI-powered presentation builder — upload data, query charts, export slides.",
    url: "ppt-builder.html",
    color: "#ff2d78",
    buildingStyle: "skyscraper",   // visual variant
    glowIntensity: 1.4,
  },
  {
    name: "Data Dashboard",
    tag: "PYTHON · REACT",
    desc: "Real-time analytics dashboard with live chart generation from natural language.",
    url: "#",
    color: "#00f5ff",
    buildingStyle: "tower",
    glowIntensity: 1.2,
  },
  {
    name: "Azure Chat Bot",
    tag: "CLOUD · NLP",
    desc: "Enterprise-grade chatbot built on Microsoft Azure Cognitive Services.",
    url: "#",
    color: "#a855f7",
    buildingStyle: "blocky",
    glowIntensity: 1.0,
  },
  {
    name: "Portfolio",
    tag: "HTML · CSS · JS",
    desc: "This very portfolio — hand-crafted with pixel art, animations, and love.",
    url: "index.html",
    color: "#22d3ee",
    buildingStyle: "glass",
    glowIntensity: 1.1,
  },
  {
    name: "MERN Chat App",
    tag: "MERN STACK",
    desc: "Full-stack real-time messaging app with Socket.io and MongoDB.",
    url: "#",
    color: "#f97316",
    buildingStyle: "wide",
    glowIntensity: 1.3,
  },
];

// ═══════════════════════════════════════════════════
// 2. CONSTANTS
// ═══════════════════════════════════════════════════
const CANVAS_H   = 460;      // logical game height (px)
const WORLD_W    = 3800;     // total scrollable world width
const GROUND_Y   = CANVAS_H - 80;  // y-position of the street
const PLAYER_SPEED   = 3.2;
const INTERACT_DIST  = 110;  // px — how close to trigger tooltip
const CAM_LERP       = 0.08; // camera smoothness (0=snap, 1=instant)

const C = {
  sky:    "#05030f",
  ground: "#0a0618",
  road:   "#080515",
  line:   "#1a0f3a",
  sidewalk: "#0e0a22",
};

// ═══════════════════════════════════════════════════
// 3. ASSET LOADER
// ═══════════════════════════════════════════════════
const Assets = {
  images: {},
  toLoad: 0,
  loaded: 0,

  load(key, src) {
    this.toLoad++;
    const img = new Image();
    img.onload = () => { this.loaded++; updateLoadBar(); };
    img.onerror = () => { this.loaded++; updateLoadBar(); }; // graceful fallback
    img.src = src;
    this.images[key] = img;
  },

  get(key) { return this.images[key]; },
  isDone()  { return this.loaded >= this.toLoad && this.toLoad > 0; },
  progress(){ return this.toLoad ? this.loaded / this.toLoad : 0; },
};

function updateLoadBar() {
  const bar = document.getElementById('loadingBar');
  if (bar) bar.style.width = (Assets.progress() * 100) + '%';
}

// ═══════════════════════════════════════════════════
// 4. INPUT HANDLER
// ═══════════════════════════════════════════════════
const Input = {
  keys: {},
  justPressed: {},

  init() {
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))
        e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  },

  isDown(code)    { return !!this.keys[code]; },
  wasPressed(code){ const v = !!this.justPressed[code]; if (v) delete this.justPressed[code]; return v; },

  isLeft()  { return this.isDown('ArrowLeft')  || this.isDown('KeyA'); },
  isRight() { return this.isDown('ArrowRight') || this.isDown('KeyD'); },
  isUp()    { return this.isDown('ArrowUp')    || this.isDown('KeyW'); },
  isDown_() { return this.isDown('ArrowDown')  || this.isDown('KeyS'); },
  isInteract() { return this.wasPressed('KeyE'); },
};

// ═══════════════════════════════════════════════════
// 5. CAMERA
// ═══════════════════════════════════════════════════
const Camera = {
  x: 0,
  zoom: 1,
  targetZoom: 1,
  canvasW: 0,

  follow(targetWorldX) {
    const ideal = targetWorldX - this.canvasW / 2;
    this.x += (ideal - this.x) * CAM_LERP;
    this.x = Math.max(0, Math.min(this.x, WORLD_W - this.canvasW));
  },

  zoomTo(z) { this.targetZoom = z; },

  update() {
    this.zoom += (this.targetZoom - this.zoom) * 0.07;
  },

  worldToScreen(worldX) { return worldX - this.x; },
};

// ═══════════════════════════════════════════════════
// 6. PARALLAX BACKGROUND
// ═══════════════════════════════════════════════════
const ParallaxBg = {
  stars: [],

  init() {
    for (let i = 0; i < 180; i++) {
      this.stars.push({
        x: Math.random() * WORLD_W,
        y: Math.random() * (GROUND_Y * 0.75),
        r: Math.random() * 1.4 + 0.4,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.03 + Math.random() * 0.04,
      });
    }
  },

  draw(ctx, camX, canvasW, canvasH, t) {
    // ── Layer 0: sky gradient ──
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0,   '#03010d');
    grad.addColorStop(0.5, '#06033a');
    grad.addColorStop(1,   '#100828');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, GROUND_Y);

    // ── Layer 1: stars (parallax 0.15) ──
    this.stars.forEach(s => {
      s.twinkle += s.twinkleSpeed;
      const alpha = 0.5 + 0.5 * Math.sin(s.twinkle);
      const sx = ((s.x - camX * 0.15) % WORLD_W + WORLD_W) % WORLD_W;
      if (sx < 0 || sx > canvasW + 20) return;
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // ── Layer 2: far city image (parallax 0.25) ──
    const farImg = Assets.get('bg_far');
    if (farImg && farImg.complete && farImg.naturalWidth) {
      const h = canvasH * 0.7;
      const w = (h / farImg.naturalHeight) * farImg.naturalWidth;
      const offset = (camX * 0.25) % w;
      for (let x = -offset; x < canvasW + w; x += w) {
        ctx.globalAlpha = 0.7;
        ctx.drawImage(farImg, x, GROUND_Y - h + 10, w, h);
      }
      ctx.globalAlpha = 1;
    } else {
      // fallback drawn skyline
      this._drawFallbackSkyline(ctx, camX, canvasW, 0.25, '#1a0a3a', 60, 120);
    }

    // ── Layer 3: mid city image (parallax 0.5) ──
    const midImg = Assets.get('bg_mid');
    if (midImg && midImg.complete && midImg.naturalWidth) {
      const h = canvasH * 0.55;
      const w = (h / midImg.naturalHeight) * midImg.naturalWidth;
      const offset = (camX * 0.5) % w;
      for (let x = -offset; x < canvasW + w; x += w) {
        ctx.globalAlpha = 0.85;
        ctx.drawImage(midImg, x, GROUND_Y - h + 20, w, h);
      }
      ctx.globalAlpha = 1;
    } else {
      this._drawFallbackSkyline(ctx, camX, canvasW, 0.5, '#0d0528', 40, 80);
    }
  },

  _drawFallbackSkyline(ctx, camX, canvasW, parallax, color, minH, maxH) {
    // Draw a simple procedural skyline using camX as seed
    ctx.fillStyle = color;
    const cols = 20;
    for (let i = 0; i < cols; i++) {
      const x = ((i * 220 - camX * parallax) % (cols * 220) + cols * 220) % (cols * 220);
      const h = minH + ((i * 137) % (maxH - minH));
      ctx.fillRect(x, GROUND_Y - h, 90, h);
    }
  },
};

// ═══════════════════════════════════════════════════
// 7. BUILDING MANAGER — draws distinct buildings
// ═══════════════════════════════════════════════════
const BuildingManager = {
  buildings: [],

  SPACINGS: [350, 500, 600, 480, 420],

  init() {
    let x = 320;
    PROJECTS.forEach((proj, i) => {
      const spacing = this.SPACINGS[i] || 480;
      this.buildings.push({
        ...proj,
        worldX: x,
        width:  this._styleWidth(proj.buildingStyle),
        height: this._styleHeight(proj.buildingStyle),
        index: i,
        glowPhase: Math.random() * Math.PI * 2,
      });
      x += this.buildings[i].width + spacing;
    });
  },

  _styleWidth(style) {
    return { skyscraper: 88, tower: 72, blocky: 110, glass: 80, wide: 130 }[style] || 90;
  },
  _styleHeight(style) {
    return { skyscraper: 240, tower: 200, blocky: 160, glass: 210, wide: 150 }[style] || 180;
  },

  draw(ctx, camX, canvasW, t) {
    this.buildings.forEach(b => {
      const sx = b.worldX - camX;
      if (sx > canvasW + 200 || sx + b.width < -200) return;

      b.glowPhase += 0.025;
      const glowPulse = 0.7 + 0.3 * Math.sin(b.glowPhase);
      const glow = glowPulse * b.glowIntensity;

      ctx.save();

      // ── Glow halo behind building ──
      const glowGrad = ctx.createRadialGradient(
        sx + b.width / 2, GROUND_Y - b.height / 2, 10,
        sx + b.width / 2, GROUND_Y - b.height / 2, b.height * 0.85
      );
      glowGrad.addColorStop(0, this._alpha(b.color, 0.18 * glow));
      glowGrad.addColorStop(1, this._alpha(b.color, 0));
      ctx.fillStyle = glowGrad;
      ctx.fillRect(sx - 60, GROUND_Y - b.height - 60, b.width + 120, b.height + 80);

      // ── Building body ──
      this._drawBuildingBody(ctx, b, sx, t, glow);

      // ── Neon sign on rooftop ──
      this._drawNeonSign(ctx, b, sx, t, glow);

      ctx.restore();
    });
  },

  _drawBuildingBody(ctx, b, sx, t, glow) {
    const by = GROUND_Y - b.height;
    const bw = b.width;
    const bh = b.height;

    // Main body gradient
    const bodyGrad = ctx.createLinearGradient(sx, by, sx + bw, by + bh);
    bodyGrad.addColorStop(0,   '#12082e');
    bodyGrad.addColorStop(0.5, '#0b0420');
    bodyGrad.addColorStop(1,   '#070318');

    ctx.fillStyle = bodyGrad;
    ctx.fillRect(sx, by, bw, bh);

    // Left edge neon stripe
    ctx.fillStyle = this._alpha(b.color, 0.8 * glow);
    ctx.fillRect(sx, by, 2, bh);

    // Top edge neon stripe
    ctx.fillRect(sx, by, bw, 2);

    // Windows
    this._drawWindows(ctx, b, sx, by, bw, bh, glow);

    // Style-specific details
    if (b.buildingStyle === 'skyscraper') {
      // Spire
      ctx.fillStyle = b.color;
      ctx.fillRect(sx + bw / 2 - 3, by - 30, 6, 30);
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 12;
      ctx.fillRect(sx + bw / 2 - 1, by - 30, 2, 30);
      ctx.shadowBlur = 0;
    } else if (b.buildingStyle === 'glass') {
      // Reflective glass panels
      for (let row = 0; row < 6; row++) {
        const panelY = by + bh * 0.1 + row * (bh * 0.13);
        ctx.fillStyle = this._alpha(b.color, 0.06);
        ctx.fillRect(sx + 6, panelY, bw - 12, bh * 0.09);
      }
    } else if (b.buildingStyle === 'wide') {
      // Wide building: billboard on front
      ctx.fillStyle = '#0a0518';
      ctx.fillRect(sx + 12, by + 20, bw - 24, 40);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx + 12, by + 20, bw - 24, 40);
    }

    // Bottom highlight
    ctx.fillStyle = this._alpha(b.color, 0.25 * glow);
    ctx.fillRect(sx, GROUND_Y - 4, bw, 4);
  },

  _drawWindows(ctx, b, sx, by, bw, bh, glow) {
    const cols = Math.max(2, Math.floor(bw / 20));
    const rows = Math.max(3, Math.floor(bh / 22));
    const ww = 9, wh = 7;
    const padX = (bw - cols * ww) / (cols + 1);
    const padY = 18;
    const rowSpacing = (bh - padY - rows * wh) / (rows + 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = sx + padX + c * (ww + padX);
        const wy = by + padY + r * (wh + rowSpacing);

        // Randomly lit windows — deterministic based on building + row + col
        const seed = (b.index * 31 + r * 7 + c * 13) % 17;
        const lit = seed > 5;

        if (lit) {
          const flicker = 0.8 + 0.2 * Math.sin(b.glowPhase + r * 0.4 + c * 0.7);
          ctx.fillStyle = this._alpha(b.color, 0.55 * flicker * glow);
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = '#06031a';
          ctx.shadowBlur = 0;
        }
        ctx.fillRect(wx, wy, ww, wh);
        ctx.shadowBlur = 0;
      }
    }
  },

  _drawNeonSign(ctx, b, sx, t, glow) {
    const signY = GROUND_Y - b.height - 22;
    const label = b.tag;
    const pulse  = 0.8 + 0.2 * Math.sin(t * 0.002 + b.glowPhase);

    ctx.save();
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Glow behind text
    ctx.shadowColor = b.color;
    ctx.shadowBlur  = 20 * glow * pulse;
    ctx.fillStyle   = b.color;

    ctx.globalAlpha = pulse * glow * 0.9;
    ctx.fillText(label, sx + b.width / 2, signY);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  getNearestBuilding(playerWorldX) {
    let nearest = null;
    let bestDist = Infinity;
    this.buildings.forEach(b => {
      const bCenterX = b.worldX + b.width / 2;
      const dist = Math.abs(playerWorldX - bCenterX);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = { building: b, dist };
      }
    });
    return nearest;
  },

  _alpha(hex, a) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const bl = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${bl},${a.toFixed(3)})`;
  },
};

// ═══════════════════════════════════════════════════
// 8. GROUND / STREET
// ═══════════════════════════════════════════════════
function drawGround(ctx, camX, canvasW, canvasH, t) {
  // Sidewalk
  ctx.fillStyle = '#0a0618';
  ctx.fillRect(0, GROUND_Y, canvasW, canvasH - GROUND_Y);

  // Road
  ctx.fillStyle = '#060413';
  ctx.fillRect(0, GROUND_Y + 28, canvasW, canvasH - GROUND_Y - 28);

  // Neon edge glow on road top
  const roadGlow = ctx.createLinearGradient(0, GROUND_Y + 28, 0, GROUND_Y + 44);
  roadGlow.addColorStop(0, 'rgba(0,245,255,0.18)');
  roadGlow.addColorStop(1, 'rgba(0,245,255,0)');
  ctx.fillStyle = roadGlow;
  ctx.fillRect(0, GROUND_Y + 28, canvasW, 16);

  // Dashed center line (parallax with world)
  ctx.strokeStyle = 'rgba(191,95,255,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([28, 22]);
  ctx.lineDashOffset = -((camX * 0.98) % 50);
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 54);
  ctx.lineTo(canvasW, GROUND_Y + 54);
  ctx.stroke();
  ctx.setLineDash([]);

  // Ground top edge slight glow
  ctx.strokeStyle = 'rgba(0,245,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(canvasW, GROUND_Y);
  ctx.stroke();
}

// ═══════════════════════════════════════════════════
// 9. PLAYER
// ═══════════════════════════════════════════════════
const Player = {
  worldX: 200,
  y: GROUND_Y - 78,
  width: 52,
  height: 78,

  velX: 0,
  facing: 1,   // 1 = right, -1 = left
  isMoving: false,

  // Sprite sheet — 5 frames wide, each ~1/5 of image width
  frame: 0,
  frameTimer: 0,
  FRAME_DUR: 120, // ms per walk frame
  IDLE_FRAME: 0,
  WALK_FRAMES: [1, 2, 3, 4],

  // Gentle floating for idle
  floatPhase: 0,

  update(dt) {
    this.isMoving = false;

    if (Input.isLeft())  { this.velX = -PLAYER_SPEED; this.facing = -1; this.isMoving = true; }
    if (Input.isRight()) { this.velX =  PLAYER_SPEED; this.facing =  1; this.isMoving = true; }

    this.worldX += this.velX;
    this.worldX  = Math.max(60, Math.min(this.worldX, WORLD_W - 60));
    this.velX    = 0;

    // Animate walk frames
    if (this.isMoving) {
      this.frameTimer += dt;
      if (this.frameTimer >= this.FRAME_DUR) {
        this.frameTimer = 0;
        this.frame = (this.frame + 1) % this.WALK_FRAMES.length;
      }
    } else {
      this.frame = 0;
      this.frameTimer = 0;
      this.floatPhase += 0.04;
    }
  },

  draw(ctx, camX) {
    const sx = Camera.worldToScreen(this.worldX) - this.width / 2;
    const floatY = this.isMoving ? 0 : Math.sin(this.floatPhase) * 2;
    const drawY  = this.y + floatY;

    const img = Assets.get('player');

    if (img && img.complete && img.naturalWidth) {
      // Sprite sheet: 5 frames across the image
      const totalFrames = 5;
      const frameW = img.naturalWidth / totalFrames;
      const frameH = img.naturalHeight;
      const currentFrame = this.isMoving ? this.WALK_FRAMES[this.frame] : this.IDLE_FRAME;

      ctx.save();
      if (this.facing === -1) {
        // Flip horizontally
        ctx.translate(sx + this.width, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(img, currentFrame * frameW, 0, frameW, frameH, 0, 0, this.width, this.height);
      } else {
        ctx.drawImage(img, currentFrame * frameW, 0, frameW, frameH, sx, drawY, this.width, this.height);
      }
      ctx.restore();

      // Subtle shadow beneath player
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(sx + this.width / 2, GROUND_Y + 2, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Fallback: cute pixel dude drawn with primitives
      this._drawFallbackPlayer(ctx, sx, drawY);
    }
  },

  _drawFallbackPlayer(ctx, sx, drawY) {
    const pw = this.width, ph = this.height;
    // Hair (ponytail extending back)
    ctx.fillStyle = '#3a1a0a';
    ctx.fillRect(sx + pw * 0.18, drawY + ph * 0.02, pw * 0.64, ph * 0.16);
    ctx.fillRect(sx + pw * 0.62, drawY + ph * 0.08, pw * 0.15, ph * 0.22); // ponytail
    // Head
    ctx.fillStyle = '#f0c090';
    ctx.fillRect(sx + pw * 0.22, drawY + ph * 0.06, pw * 0.52, ph * 0.22);
    // Eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(sx + pw * 0.36, drawY + ph * 0.16, 3, 3);
    ctx.fillRect(sx + pw * 0.54, drawY + ph * 0.16, 3, 3);
    // Hoodie body
    ctx.fillStyle = '#bf5fff';
    ctx.fillRect(sx + pw * 0.18, drawY + ph * 0.28, pw * 0.64, ph * 0.38);
    // Hoodie pocket detail
    ctx.fillStyle = '#a040e0';
    ctx.fillRect(sx + pw * 0.3, drawY + ph * 0.48, pw * 0.4, ph * 0.1);
    // Jeans
    ctx.fillStyle = '#3355aa';
    ctx.fillRect(sx + pw * 0.22, drawY + ph * 0.66, pw * 0.22, ph * 0.22);
    ctx.fillRect(sx + pw * 0.52, drawY + ph * 0.66, pw * 0.22, ph * 0.22);
    // Sneakers
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(sx + pw * 0.2, drawY + ph * 0.88, pw * 0.26, ph * 0.1);
    ctx.fillRect(sx + pw * 0.5, drawY + ph * 0.88, pw * 0.26, ph * 0.1);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(sx + pw / 2, GROUND_Y + 2, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  },
};

// ═══════════════════════════════════════════════════
// 10. HUD
// ═══════════════════════════════════════════════════
const HUD = {
  tooltip: null,
  tooltipEl: null,
  modalEl: null,
  currentBuilding: null,
  modalVisible: false,

  init() {
    this.tooltipEl = document.getElementById('tooltip');
    this.modalEl   = document.getElementById('buildingModal');

    document.getElementById('modalClose').addEventListener('click', () => this.hideModal());
    document.getElementById('modalEnter').addEventListener('click', () => {
      if (this.currentBuilding) this._navigate(this.currentBuilding);
    });
  },

  showTooltip(building) {
    if (!this.tooltipEl) return;
    const label = `${building.tag} · Press E to enter`;
    if (this.tooltipEl.textContent !== label) this.tooltipEl.textContent = label;
    this.tooltipEl.style.borderColor  = building.color;
    this.tooltipEl.style.color        = building.color;
    this.tooltipEl.style.textShadow   = `0 0 10px ${building.color}`;
    this.tooltipEl.style.boxShadow    = `0 0 20px ${building.color}44, inset 0 0 15px ${building.color}0a`;
    this.tooltipEl.classList.remove('hidden');
  },

  hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.classList.add('hidden');
  },

  showModal(building) {
    if (!this.modalEl || this.modalVisible) return;
    this.currentBuilding = building;
    this.modalVisible = true;

    document.getElementById('modalTag').textContent  = building.tag;
    document.getElementById('modalTag').style.color  = building.color;
    document.getElementById('modalName').textContent = building.name;
    document.getElementById('modalName').style.color = building.color;
    document.getElementById('modalDesc').textContent = building.desc;
    document.getElementById('modalEnter').style.borderColor = building.color;
    document.getElementById('modalEnter').style.color       = building.color;
    this.modalEl.style.borderColor = building.color;
    this.modalEl.style.boxShadow   = `0 0 60px ${building.color}55, 0 0 120px ${building.color}22`;

    this.modalEl.classList.remove('hidden');
    this.modalEl.classList.add('entering');
    setTimeout(() => this.modalEl.classList.remove('entering'), 400);
  },

  hideModal() {
    if (!this.modalEl) return;
    this.modalVisible = false;
    this.currentBuilding = null;
    this.modalEl.classList.add('hidden');
    Game.paused = false;
  },

  _navigate(building) {
    if (!building.url || building.url === '#') return;
    const fade = document.getElementById('fadeOverlay');
    fade.classList.add('fade-in');
    setTimeout(() => {
      window.open(building.url, '_blank');
      setTimeout(() => fade.classList.remove('fade-in'), 600);
    }, 500);
  },
};

// ═══════════════════════════════════════════════════
// 11. AMBIENT PARTICLES (neon dust)
// ═══════════════════════════════════════════════════
const Particles = {
  list: [],
  NEON_COLORS: ['#00f5ff', '#ff2d78', '#bf5fff', '#f97316', '#39ff14'],

  init() {
    for (let i = 0; i < 35; i++) this._spawn();
  },

  _spawn() {
    this.list.push({
      x:    Math.random() * WORLD_W,
      y:    Math.random() * GROUND_Y * 0.9,
      r:    0.6 + Math.random() * 1.6,
      velX: (Math.random() - 0.5) * 0.3,
      velY: -0.2 - Math.random() * 0.4,
      color: this.NEON_COLORS[Math.floor(Math.random() * this.NEON_COLORS.length)],
      alpha: 0.4 + Math.random() * 0.5,
      life:  0,
      maxLife: 180 + Math.random() * 240,
    });
  },

  update() {
    this.list = this.list.filter(p => {
      p.x += p.velX; p.y += p.velY; p.life++;
      return p.life < p.maxLife;
    });
    while (this.list.length < 35) this._spawn();
  },

  draw(ctx, camX, canvasW) {
    this.list.forEach(p => {
      const sx = p.x - camX;
      if (sx < -20 || sx > canvasW + 20) return;
      const alpha = p.alpha * (1 - p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(sx, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
  },
};

// ═══════════════════════════════════════════════════
// 12. GAME LOOP
// ═══════════════════════════════════════════════════
const Game = {
  canvas: null,
  ctx: null,
  lastTime: 0,
  t: 0,
  running: false,
  paused: false,
  started: false,

  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize', () => this._resize());

    Input.init();
    ParallaxBg.init();
    BuildingManager.init();
    Particles.init();
    HUD.init();

    // Load assets
    Assets.load('bg_far', 'assets/images/game/bg_far.png');
    Assets.load('bg_mid', 'assets/images/game/bg_mid.png');
    Assets.load('player', 'assets/images/game/player.png');

    this._waitForAssets();
  },

  _waitForAssets() {
    const check = () => {
      if (Assets.isDone()) {
        this._startGame();
      } else {
        requestAnimationFrame(check);
      }
    };
    // Give at least a short loading screen
    setTimeout(check, 600);
  },

  _startGame() {
    const loadScreen = document.getElementById('loadingScreen');
    loadScreen.classList.add('fade-out');
    setTimeout(() => { loadScreen.style.display = 'none'; }, 700);

    this.started = true;
    this.running = true;
    requestAnimationFrame(ts => this._loop(ts));
  },

  _resize() {
    const wrapper = this.canvas.parentElement;
    const W = wrapper.clientWidth;
    const H = wrapper.clientHeight;
    this.canvas.width  = W;
    this.canvas.height = H;
    Camera.canvasW = W;
  },

  _loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;
    this.t = timestamp;

    if (!this.paused) {
      this._update(dt);
    }
    this._draw();

    requestAnimationFrame(ts => this._loop(ts));
  },

  _update(dt) {
    Player.update(dt);
    Camera.follow(Player.worldX);
    Camera.update();
    Particles.update();

    // Interaction check
    const nearest = BuildingManager.getNearestBuilding(Player.worldX);
    if (nearest && nearest.dist < INTERACT_DIST && !HUD.modalVisible) {
      HUD.showTooltip(nearest.building);
      if (Input.isInteract()) {
        this.paused = true;
        HUD.hideTooltip();
        HUD.showModal(nearest.building);
      }
    } else if (!HUD.modalVisible) {
      HUD.hideTooltip();
    }

    // Close modal with Escape
    if (Input.wasPressed('Escape') && HUD.modalVisible) {
      HUD.hideModal();
    }
  },

  _draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const camX = Camera.x;

    // Apply camera zoom
    ctx.save();
    if (Math.abs(Camera.zoom - 1) > 0.005) {
      const cx = W / 2, cy = H / 2;
      ctx.translate(cx, cy);
      ctx.scale(Camera.zoom, Camera.zoom);
      ctx.translate(-cx, -cy);
    }

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background layers
    ParallaxBg.draw(ctx, camX, W, H, this.t);

    // Ambient neon particles
    Particles.draw(ctx, camX, W);

    // Buildings
    BuildingManager.draw(ctx, camX, W, this.t);

    // Ground / street
    drawGround(ctx, camX, W, H, this.t);

    // Player
    Player.draw(ctx, camX);

    // Mini map (optional bottom strip)
    this._drawMinimap(ctx, W, H);

    ctx.restore();
  },

  _drawMinimap(ctx, W, H) {
    const mW = 160, mH = 16;
    const mX = W - mW - 14, mY = 14;

    ctx.fillStyle = 'rgba(5,3,15,0.7)';
    ctx.fillRect(mX, mY, mW, mH);
    ctx.strokeStyle = 'rgba(0,245,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mX, mY, mW, mH);

    // Buildings on minimap
    BuildingManager.buildings.forEach(b => {
      const bx = mX + (b.worldX / WORLD_W) * mW;
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, mY + 4, 4, mH - 8);
    });

    // Player on minimap
    const px = mX + (Player.worldX / WORLD_W) * mW;
    ctx.fillStyle = '#fff';
    ctx.fillRect(px - 2, mY + 1, 4, mH - 2);

    // Label
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(0,245,255,0.4)';
    ctx.textAlign = 'right';
    ctx.fillText('MAP', mX - 4, mY + mH - 3);
    ctx.textAlign = 'left';
  },
};

// ═══════════════════════════════════════════════════
// 13. FALLBACK PROJECT GRID (always rendered below)
// ═══════════════════════════════════════════════════
function buildFallbackGrid() {
  const grid = document.getElementById('fallbackGrid');
  if (!grid) return;
  PROJECTS.forEach(p => {
    const anchor = document.createElement('a');
    anchor.className = 'fallback-card';
    anchor.href = p.url === '#' ? '#' : p.url;
    anchor.target = p.url !== '#' ? '_blank' : '_self';
    anchor.style.setProperty('--card-color', p.color);
    anchor.innerHTML = `
      <div class="card-tag">${p.tag}</div>
      <div class="card-name">${p.name}</div>
      <div class="card-desc">${p.desc}</div>
      <div class="card-link">View Project ↗</div>
    `;
    grid.appendChild(anchor);
  });
}

// ═══════════════════════════════════════════════════
// 14. BOOT
// ═══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  Game.init();
  buildFallbackGrid();
});
