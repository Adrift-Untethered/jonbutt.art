const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: true });
const cursor = document.getElementById("cursor");

const image = new Image();

const FRAME_MS = 1000 / 60;
const isMobile = matchMedia("(max-width: 767px), (pointer: coarse)").matches;
const isWebKit =
  /AppleWebKit/i.test(navigator.userAgent) &&
  !/(Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS)/i.test(navigator.userAgent);
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// WebKit does noticeably better with fewer individual canvas draw calls.
// This changes rendering detail only; animation speed is controlled by time.
const COLS = isMobile ? 34 : isWebKit ? 42 : 58;
const ROWS = isMobile ? 23 : isWebKit ? 28 : 39;
const FORCE_RADIUS = isMobile ? 130 : 180;
const DUST_COUNT = isMobile ? 30 : 70;

let width = 0;
let height = 0;
let cover = null;
let fragments = [];
let dust = [];
let textParticles = [];
let portals = [];
let lastFrame = 0;
let resizeFrame = 0;
let running = false;

const mouse = { x: -1000, y: -1000 };

function calculatePlacement() {
  const scale = Math.max(width / image.width, height / image.height);
  return {
    scale,
    x: (width - image.width * scale) / 2,
    y: (height - image.height * scale) / 2
  };
}

function resize() {
  // Keep the bitmap at CSS-pixel resolution. A large device-pixel-ratio canvas
  // multiplies Safari's fragment-rendering cost without adding much here.
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  cover = calculatePlacement();
  createFragments();
  createDust();
  createPortals();
  layoutTextParticles();

  if (prefersReducedMotion) drawStaticFrame();
}

function queueResize() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(resize);
}

window.addEventListener("resize", queueResize, { passive: true });

function createFragments() {
  fragments = [];

  const sourceWidth = image.width / COLS;
  const sourceHeight = image.height / ROWS;
  const screenWidth = sourceWidth * cover.scale;
  const screenHeight = sourceHeight * cover.scale;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const personality = Math.random();
      const fragment = {
        sx: col * sourceWidth,
        sy: row * sourceHeight,
        sw: sourceWidth,
        sh: sourceHeight,
        x: cover.x + col * screenWidth,
        y: cover.y + row * screenHeight,
        homeX: cover.x + col * screenWidth,
        homeY: cover.y + row * screenHeight,
        w: screenWidth,
        h: screenHeight,
        vx: 0,
        vy: 0,
        rotation: 0,
        rotationVelocity: 0,
        rotationDirection: Math.random() < 0.5 ? -1 : 1,
        mass: 1,
        spring: 0.018,
        rotationResistance: 0.9,
        visualScale: 1,
        opacity: 1
      };

      if (personality < 0.15) {
        Object.assign(fragment, {
          mass: 2.5,
          spring: 0.012,
          rotationResistance: 0.96,
          visualScale: 1.04
        });
      } else if (personality < 0.75) {
        Object.assign(fragment, {
          mass: 1.2,
          opacity: 0.95
        });
      } else {
        Object.assign(fragment, {
          mass: 0.5,
          spring: 0.026,
          rotationResistance: 0.82,
          visualScale: 0.98,
          opacity: 0.65
        });
      }

      fragments.push(fragment);
    }
  }
}

function drawBackground() {
  ctx.globalAlpha = 0.18;
  ctx.drawImage(
    image,
    cover.x,
    cover.y,
    image.width * cover.scale,
    image.height * cover.scale
  );
  ctx.globalAlpha = 1;
}

function drawFragments(step) {
  const forceRadiusSquared = FORCE_RADIUS * FORCE_RADIUS;

  for (const f of fragments) {
    const dx = f.x - mouse.x;
    const dy = f.y - mouse.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared > 0 && distanceSquared < forceRadiusSquared) {
      const distance = Math.sqrt(distanceSquared);
      let influence = 1 - distance / FORCE_RADIUS;
      influence *= influence;
      const force = (influence * 2.8 * step) / f.mass;

      f.vx += (dx / distance) * force;
      f.vy += (dy / distance) * force;
      f.vx = Math.max(-8, Math.min(8, f.vx));
      f.vy = Math.max(-8, Math.min(8, f.vy));
      f.rotationVelocity +=
        ((influence * 0.025 * step) / f.mass) * f.rotationDirection;
    }

    f.vx += (f.homeX - f.x) * f.spring * step;
    f.vy += (f.homeY - f.y) * f.spring * step;
    f.vx *= Math.pow(0.9, step);
    f.vy *= Math.pow(0.9, step);
    f.x += f.vx * step;
    f.y += f.vy * step;

    collectPortalStrength(f);

    f.rotation += f.rotationVelocity * step;
    f.rotationVelocity *= Math.pow(f.rotationResistance, step);
    f.rotation *= Math.pow(0.92, step);

    ctx.save();
    ctx.globalAlpha = f.opacity;
    ctx.translate(f.x + f.w / 2, f.y + f.h / 2);
    ctx.rotate(f.rotation);
    ctx.drawImage(
      image,
      f.sx,
      f.sy,
      f.sw,
      f.sh,
      -f.w / 2,
      -f.h / 2,
      f.w * f.visualScale,
      f.h * f.visualScale
    );
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}

function getPortalLayout() {
  const phone = width < 600;
  const tablet = width < 1000;
  const shortLandscape = width > height && height < 600;

  if (shortLandscape) {
    return {
      radius: 90,
      positions: [
        ["workPortal", 0.20, 0.28],
        ["archivePortal", 0.20, 0.72],
        ["aboutPortal", 0.80, 0.72],
        ["contactPortal", 0.80, 0.28]
        ["contactPortal", 0.18, 0.28],
        ["workPortal", 0.40, 0.70],
        ["aboutPortal", 0.64, 0.28],
        ["archivePortal", 0.84, 0.70]
      ]
    };
  }

  if (phone) {
    // A loose zig-zag keeps the circles readable without forming a rigid grid.
    return {
      radius: 90,
      positions: [
        ["workPortal", 0.30, 0.20],
        ["archivePortal", 0.30, 0.62],
        ["aboutPortal", 0.70, 0.80],
        ["contactPortal", 0.70, 0.38]
        ["contactPortal", 0.30, 0.20],
        ["workPortal", 0.70, 0.38],
        ["aboutPortal", 0.30, 0.62],
        ["archivePortal", 0.70, 0.80]
      ]
    };
  }

  if (tablet) {
    return {
      radius: 105,
      positions: [
        ["workPortal", 0.28, 0.28],
        ["archivePortal", 0.30, 0.72],
        ["aboutPortal", 0.70, 0.70],
        ["contactPortal", 0.72, 0.32]
        ["contactPortal", 0.28, 0.28],
        ["workPortal", 0.72, 0.32],
        ["aboutPortal", 0.30, 0.72],
        ["archivePortal", 0.70, 0.70]
      ]
    };
  }

  return {
    radius: 120,
    positions: [
      ["workPortal", 0.35, 0.24],
      ["archivePortal", 0.28, 0.72],
      ["aboutPortal", 0.68, 0.72],
      ["contactPortal", 0.73, 0.34]
      ["contactPortal", 0.35, 0.24],
      ["workPortal", 0.73, 0.34],
      ["aboutPortal", 0.28, 0.72],
      ["archivePortal", 0.68, 0.72]
    ]
  };
}

function createPortals() {
  const layout = getPortalLayout();
  const horizontalMargin = Math.min(layout.radius, width * 0.2);
  const verticalMargin = Math.min(layout.radius, height * 0.16);

  portals = layout.positions
    .map(([id, xRatio, yRatio]) => {
      const element = document.getElementById(id);
      if (!element) return null;

      // Ratios create the composition; clamping keeps circles away from cut-offs,
      // notches and browser chrome on unusually narrow or short screens.
      const x = Math.max(horizontalMargin, Math.min(width - horizontalMargin, width * xRatio));
      const y = Math.max(verticalMargin, Math.min(height - verticalMargin, height * yRatio));

      const portal = {
        element,
        x,
        y,
        radius: layout.radius,
        strength: 0,
        frameGain: 0,
        revealed: false
      };
      element.style.left = `${portal.x}px`;
      element.style.top = `${portal.y}px`;
      element.classList.remove("revealed");
      return portal;
    })
    .filter(Boolean);
}

function collectPortalStrength(fragment) {
  const moveX = fragment.x - fragment.homeX;
  const moveY = fragment.y - fragment.homeY;
  const movementSquared = moveX * moveX + moveY * moveY;
  if (movementSquared < 64) return;

  const movement = Math.sqrt(movementSquared);

  for (const portal of portals) {
    const cursorX = mouse.x - portal.x;
    const cursorY = mouse.y - portal.y;
    if (cursorX * cursorX + cursorY * cursorY >= FORCE_RADIUS * FORCE_RADIUS) {
      continue;
    }

    const fragmentX = fragment.homeX - portal.x;
    const fragmentY = fragment.homeY - portal.y;
    if (fragmentX * fragmentX + fragmentY * fragmentY < portal.radius * portal.radius) {
      portal.frameGain += movement * 0.0025;
    }
  }
}

function updatePortals(step) {
  for (const portal of portals) {
    portal.strength = Math.min(
      1,
      portal.strength * Math.pow(0.88, step) + portal.frameGain * step
    );
    portal.frameGain = 0;

    // Only touch the DOM when the state actually changes.
    const shouldReveal = portal.strength > 0.3;
    if (shouldReveal !== portal.revealed) {
      portal.revealed = shouldReveal;
      portal.element.classList.toggle("revealed", shouldReveal);
    }
  }
}

function createDust() {
  dust = Array.from({ length: DUST_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.5,
    speed: Math.random() * 0.12
  }));
}

function drawDust(step) {
  ctx.fillStyle = "rgba(230,230,230,0.1)";
  for (const particle of dust) {
    particle.y -= particle.speed * step;
    if (particle.y < 0) particle.y = height;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
}

function createTextParticles() {
  const text = document.getElementById("archiveText");
  if (!text) return;

  const nodes = Array.from(text.childNodes);
  text.innerHTML = "";

  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const letter of node.textContent) {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = letter;
        text.appendChild(span);
        textParticles.push({
          element: span,
          x: 0,
          y: 0,
          homeX: 0,
          homeY: 0,
          vx: 0,
          vy: 0,
          mass: 0.5 + Math.random() * 1.5,
          spring: 0.06
        });
      }
    } else if (node.nodeName === "BR") {
      text.appendChild(document.createElement("br"));
    }
  }

  layoutTextParticles();
}

function layoutTextParticles() {
  for (const particle of textParticles) {
    particle.element.style.transform = "none";
  }

  for (const particle of textParticles) {
    const rect = particle.element.getBoundingClientRect();
    particle.x = particle.homeX = rect.left;
    particle.y = particle.homeY = rect.top;
    particle.vx = 0;
    particle.vy = 0;
  }
}

function drawTextPhysics(step) {
  for (const particle of textParticles) {
    const dx = particle.x - mouse.x;
    const dy = particle.y - mouse.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared > 0 && distanceSquared < 140 * 140) {
      const distance = Math.sqrt(distanceSquared);
      const force = (140 - distance) / 140;
      particle.vx += (dx / distance) * force * (2.5 / particle.mass) * step;
      particle.vy += (dy / distance) * force * (2.5 / particle.mass) * step;
    }

    particle.vx += (particle.homeX - particle.x) * particle.spring * step;
    particle.vy += (particle.homeY - particle.y) * particle.spring * step;
    particle.vx *= Math.pow(0.78, step);
    particle.vy *= Math.pow(0.78, step);
    particle.x += particle.vx * step;
    particle.y += particle.vy * step;
    particle.element.style.transform = `translate3d(${particle.x - particle.homeX}px, ${
      particle.y - particle.homeY
    }px, 0)`;
  }
}

function drawStaticFrame() {
  ctx.clearRect(0, 0, width, height);
  drawBackground();
  drawFragments(0);
  drawDust(0);
}

function animate(now) {
  if (!running) return;
  requestAnimationFrame(animate);

  if (!lastFrame) lastFrame = now;
  const elapsed = now - lastFrame;

  // Cap rendering near 60fps on high-refresh displays. This keeps Chrome from
  // doing twice the work at 120Hz while elapsed time keeps the speed identical.
  if (elapsed < FRAME_MS * 0.85) return;

  lastFrame = now;
  const step = Math.min(elapsed / FRAME_MS, 2);

  ctx.clearRect(0, 0, width, height);
  drawBackground();
  drawFragments(step);
  updatePortals(step);
  drawDust(step);
  drawTextPhysics(step);
}

function updatePointer(event) {
  mouse.x = event.clientX;
  mouse.y = event.clientY;

  if (cursor) {
    // Keep any centring transform supplied by the existing cursor CSS intact.
    cursor.style.left = `${mouse.x}px`;
    cursor.style.top = `${mouse.y}px`;
  }
}

window.addEventListener("pointermove", updatePointer, { passive: true });
window.addEventListener(
  "pointerleave",
  () => {
    mouse.x = -1000;
    mouse.y = -1000;
  },
  { passive: true }
);

document.addEventListener("visibilitychange", () => {
  lastFrame = 0;
});

image.addEventListener("load", () => {
  createTextParticles();
  resize();

  if (!prefersReducedMotion) {
    running = true;
    requestAnimationFrame(animate);
  }
});

// Assign the source after the listener so a cached image cannot finish first.
image.src = "images/wallcoverpage.jpg";
