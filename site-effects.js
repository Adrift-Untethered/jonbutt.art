(() => {
  const clocks = [...document.querySelectorAll("[data-site-time]")];

  if (clocks.length) {
    const updateClocks = () => {
      const localTime = new Intl.DateTimeFormat("en-AU", {
        timeZone: "Australia/Melbourne",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      }).format(new Date());

      clocks.forEach(clock => {
        clock.textContent = localTime;
      });
    };

    updateClocks();
    window.setInterval(updateClocks, 1000);
  }

  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!finePointer) return;

  document.documentElement.classList.add("gravity-cursor");

  const cursor = document.createElement("div");
  cursor.className = "site-cursor";
  cursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursor);

  const pointer = { x: -1000, y: -1000 };
  let particles = [];
  let blocks = [];
  let animationFrame = 0;
  let layoutFrame = 0;
  let animationStarted = 0;

  const excludedSelector = [
    ".portal",
    ".site-header",
    ".page-footer",
    ".archive-back",
    ".gallery-controls",
    ".gallery-caption",
    "[data-no-gravity]"
  ].join(",");

  const targetSelector = [
    "[data-gravity]",
    ".message h1",
    "main h1",
    "main h2",
    "main h3",
    "main h4",
    "main h5",
    "main h6",
    "main p",
    "main dt",
    "main dd",
    "main figcaption",
    "main a"
  ].join(",");

  function isTopLevelTarget(element) {
    if (element.matches(excludedSelector) || element.closest(excludedSelector)) return false;
    return !element.parentElement?.closest(targetSelector);
  }

  function splitTextNode(node, mode, blockParticles) {
    if (!node.textContent || !node.textContent.trim()) return;
    if (node.parentElement?.closest(excludedSelector)) return;

    const fragment = document.createDocumentFragment();
    const source = mode === "letter" ? node.textContent.replace(/\s+/g, " ") : node.textContent;
    const pieces = source.split(/(\s+)/);

    for (const piece of pieces) {
      if (!piece || /^\s+$/.test(piece)) {
        fragment.appendChild(document.createTextNode(piece));
        continue;
      }

      if (mode === "letter") {
        const token = document.createElement("span");
        token.className = "gravity-token";

        for (const letter of Array.from(piece)) {
          const span = document.createElement("span");
          span.className = "gravity-char";
          span.textContent = letter;
          token.appendChild(span);

          const particle = {
            element: span,
            mode,
            x: 0,
            y: 0,
            homeX: 0,
            homeY: 0,
            vx: 0,
            vy: 0,
            mass: 0.65 + Math.random() * 1.15,
            spring: 0.06
          };
          particles.push(particle);
          blockParticles.push(particle);
        }

        fragment.appendChild(token);
        continue;
      }

      const span = document.createElement("span");
      span.className = "gravity-word";
      span.textContent = piece;
      fragment.appendChild(span);

      const particle = {
        element: span,
        mode,
        x: 0,
        y: 0,
        homeX: 0,
        homeY: 0,
        vx: 0,
        vy: 0,
        mass: 1.25 + Math.random() * 0.75,
        spring: 0.045
      };
      particles.push(particle);
      blockParticles.push(particle);
    }

    node.replaceWith(fragment);
  }

  function prepareText() {
    const targets = Array.from(document.querySelectorAll(targetSelector)).filter(isTopLevelTarget);

    for (const element of targets) {
      const requestedMode = element.dataset.gravity;
      const mode = requestedMode === "letter" || requestedMode === "word"
        ? requestedMode
        : (element.textContent || "").trim().length > 120 ? "word" : "letter";
      const textNodes = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
          if (node.parentElement?.closest(excludedSelector)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      while (walker.nextNode()) textNodes.push(walker.currentNode);

      const blockParticles = [];
      for (const node of textNodes) splitTextNode(node, mode, blockParticles);

      if (blockParticles.length) {
        blocks.push({ element, particles: blockParticles, visible: true });
      }
    }
  }

  function layoutParticles() {
    layoutFrame = 0;

    for (const particle of particles) {
      particle.element.style.transform = "none";
    }

    for (const particle of particles) {
      const rect = particle.element.getBoundingClientRect();
      particle.x = particle.homeX = rect.left + rect.width / 2;
      particle.y = particle.homeY = rect.top + rect.height / 2;
      particle.vx = 0;
      particle.vy = 0;
    }

    for (const block of blocks) {
      const rect = block.element.getBoundingClientRect();
      block.visible = rect.bottom >= -180 && rect.top <= innerHeight + 180;
    }
  }

  function queueLayout() {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(layoutParticles);
  }

  function startAnimation() {
    if (reducedMotion || animationFrame || !particles.length) return;
    animationStarted = performance.now();
    animationFrame = requestAnimationFrame(animate);
  }

  function animate(now) {
    animationFrame = 0;
    let needsAnotherFrame = false;

    for (const block of blocks) {
      if (!block.visible) continue;

      for (const particle of block.particles) {
        const radius = particle.mode === "letter" ? 140 : 175;
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distanceSquared = dx * dx + dy * dy;
        let pointerNear = false;

        if (distanceSquared > 0 && distanceSquared < radius * radius) {
          const distance = Math.sqrt(distanceSquared);
          const influence = (radius - distance) / radius;
          const strength = particle.mode === "letter" ? 2.5 : 1.25;
          particle.vx += (dx / distance) * influence * (strength / particle.mass);
          particle.vy += (dy / distance) * influence * (strength / particle.mass);
          pointerNear = true;
        }

        particle.vx += (particle.homeX - particle.x) * particle.spring;
        particle.vy += (particle.homeY - particle.y) * particle.spring;
        particle.vx *= 0.78;
        particle.vy *= 0.78;
        particle.x += particle.vx;
        particle.y += particle.vy;

        const offsetX = particle.x - particle.homeX;
        const offsetY = particle.y - particle.homeY;
        particle.element.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;

        const speed = Math.abs(particle.vx) + Math.abs(particle.vy);
        const displacement = Math.abs(offsetX) + Math.abs(offsetY);
        if (speed > 0.025 || (!pointerNear && displacement > 0.12)) {
          needsAnotherFrame = true;
        }
      }
    }

    // A hard ceiling prevents a stationary pointer from keeping Safari busy.
    if (needsAnotherFrame && now - animationStarted < 1600) {
      animationFrame = requestAnimationFrame(animate);
    }
  }

  function updatePointer(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    cursor.style.left = `${pointer.x}px`;
    cursor.style.top = `${pointer.y}px`;
    cursor.classList.add("is-visible");
    startAnimation();
  }

  function leaveWindow() {
    pointer.x = -1000;
    pointer.y = -1000;
    cursor.classList.remove("is-visible");
    startAnimation();
  }

  document.addEventListener("pointermove", updatePointer, { passive: true });
  document.addEventListener("pointerleave", leaveWindow, { passive: true });
  window.addEventListener("resize", queueLayout, { passive: true });
  window.addEventListener("scroll", queueLayout, { passive: true });

  if (!reducedMotion) {
    prepareText();
    layoutParticles();

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            const block = blocks.find(item => item.element === entry.target);
            if (block) block.visible = entry.isIntersecting;
          }
        },
        { rootMargin: "180px 0px" }
      );

      for (const block of blocks) observer.observe(block.element);
    }
  }
})();
