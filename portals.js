(() => {
  const page = document.querySelector(".portals-page");
  const enter = document.querySelector(".portal-enter");
  const field = document.querySelector("#portal-field");
  const channels = [...document.querySelectorAll(".portal-channel")];
  const readout = document.querySelector(".portal-readout");

  if (!page) return;

  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    page.addEventListener("pointermove", event => {
      page.style.setProperty("--portal-x", `${(event.clientX / innerWidth) * 100}%`);
      page.style.setProperty("--portal-y", `${(event.clientY / innerHeight) * 100}%`);
    }, { passive: true });
  }

  const staticEnter = document.querySelector(".portals-v2-page .portal-enter-static");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  if (staticEnter && !reducedMotion.matches) {
    const text = staticEnter.textContent.trim();
    const characters = Array.from(text).filter(character => !/\s/.test(character));
    const maximumCopies = 20;
    const spawnInterval = 900;
    const launchDuration = 2000;
    const orbitDuration = 22000;
    const returnDuration = 2400;
    const orbitRevolutions = 2.5;
    const copyLifetime = launchDuration + orbitDuration + returnDuration;
    const cycleDuration = (maximumCopies - 1) * spawnInterval + copyLifetime;
    const lerp = (from, to, amount) => from + (to - from) * amount;
    const ease = amount => amount * amount * (3 - 2 * amount);
    const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
    const lerpAngle = (from, to, amount) => from + wrapAngle(to - from) * amount;

    let path;
    let sourcePositions = [];
    let trails = [];
    let movingCopies = [];
    let animationFrame;
    let resizeTimer;
    let cycleStarted = performance.now();
    let needsLayout = true;

    const createMovingCopy = bornAt => {
      const clone = document.createElement("span");
      clone.className = "portal-enter-clone";
      clone.dataset.noGravity = "";
      clone.setAttribute("aria-hidden", "true");
      document.body.append(clone);

      const cloneCharacters = characters.map(character => {
        const span = document.createElement("span");
        span.className = "portal-enter-clone-char";
        span.textContent = character;
        clone.append(span);
        return span;
      });

      const movingCopy = {
        clone,
        characters: cloneCharacters,
        characterSizes: cloneCharacters.map(character => ({
          width: character.offsetWidth,
          height: character.offsetHeight
        })),
        bornAt
      };

      movingCopies.push(movingCopy);
      return movingCopy;
    };

    const clearMovingCopies = () => {
      movingCopies.forEach(copy => copy.clone.remove());
      movingCopies = [];
    };

    const measureSourcePositions = () => {
      const gravityCharacters = [...staticEnter.querySelectorAll(".gravity-char")];

      if (gravityCharacters.length === characters.length) {
        return gravityCharacters.map(character => {
          const rect = character.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        });
      }

      const style = getComputedStyle(staticEnter);
      const rect = staticEnter.getBoundingClientRect();
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const fontSize = parseFloat(style.fontSize) || 10.5;
      const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.45;
      const letterSpacing = parseFloat(style.letterSpacing) || 0;
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingTop = parseFloat(style.paddingTop) || 0;
      context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;

      let x = rect.left + paddingLeft;
      const y = rect.top + paddingTop + lineHeight / 2;
      const positions = [];

      for (const character of Array.from(text)) {
        const width = context.measureText(character).width;
        if (!/\s/.test(character)) positions.push({ x: x + width / 2, y });
        x += width + letterSpacing;
      }

      return positions;
    };

    const createOrbitPath = () => {
      const sourceRect = staticEnter.getBoundingClientRect();
      const centerX = innerWidth / 2 + Math.min(180, innerWidth * 0.12);
      const centerY = innerHeight / 2 - Math.min(160, innerHeight * 0.18);
      const radius = Math.max(105, Math.min(310, Math.min(innerWidth, innerHeight) * 0.23));
      const sourceX = sourceRect.left + sourceRect.width / 2;
      const sourceY = sourceRect.top + sourceRect.height / 2;
      const startAngle = Math.atan2(sourceY - centerY, sourceX - centerX);
      const total = Math.PI * 2 * radius;
      const sample = distance => {
        let wrapped = distance % total;
        if (wrapped < 0) wrapped += total;
        const angle = startAngle - wrapped / radius;
        return {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          angle: angle - Math.PI / 2
        };
      };

      return { total, sample };
    };

    const layoutClone = () => {
      sourcePositions = measureSourcePositions();
      const firstX = sourcePositions[0]?.x || 0;
      trails = sourcePositions.map(position => Math.max(0, position.x - firstX));
      path = createOrbitPath();
      movingCopies.forEach(copy => {
        copy.characterSizes = copy.characters.map(character => ({
          width: character.offsetWidth,
          height: character.offsetHeight
        }));
      });
      needsLayout = false;
    };

    const animateClone = now => {
      let cycleElapsed = now - cycleStarted;
      if (cycleElapsed >= cycleDuration) {
        clearMovingCopies();
        cycleStarted = now;
        cycleElapsed = 0;
        needsLayout = true;
      }

      const desiredCopies = Math.min(maximumCopies, Math.floor(cycleElapsed / spawnInterval) + 1);
      while (movingCopies.length < desiredCopies) {
        createMovingCopy(cycleStarted + movingCopies.length * spawnInterval);
      }

      if (needsLayout) layoutClone();

      movingCopies.forEach(copy => {
        const age = Math.max(0, now - copy.bornAt);
        const orbitAge = Math.max(0, age - launchDuration);
        const returnAge = Math.max(0, orbitAge - orbitDuration);
        const launchAmount = Math.min(1, age / launchDuration);
        const returnAmount = Math.min(1, returnAge / returnDuration);
        const launchBlend = ease(launchAmount);
        const returnBlend = ease(returnAmount);
        const blend = launchBlend * (1 - returnBlend);
        const orbitProgress = Math.min(1, orbitAge / orbitDuration);
        const baseDistance = orbitProgress * path.total * orbitRevolutions;
        const opacity = Math.min(1, age / 240) * Math.max(0, Math.min(1, (copyLifetime - age) / 240));
        let scale = 1;
        if (launchAmount < 1) {
          scale = 0.58 + launchBlend * 0.42 + Math.sin(Math.PI * launchBlend) * 0.44;
        } else if (returnAmount > 0) {
          scale = 1 - returnBlend * 0.42 + Math.sin(Math.PI * returnBlend) * 0.44;
        }

        copy.characters.forEach((character, index) => {
          const distance = baseDistance + trails[index];
          const perimeterPoint = path.sample(distance);
          const wavePhase = distance * 0.075 - age * 0.0062;
          const wave = Math.sin(wavePhase) * 3.4 * blend;
          const snakeAngle = perimeterPoint.angle + Math.cos(wavePhase) * 0.075 * blend;
          const normalX = -Math.sin(perimeterPoint.angle);
          const normalY = Math.cos(perimeterPoint.angle);
          const pathX = perimeterPoint.x + normalX * wave;
          const pathY = perimeterPoint.y + normalY * wave;
          const source = sourcePositions[index];
          const size = copy.characterSizes[index];
          const x = lerp(source.x, pathX, blend);
          const y = lerp(source.y, pathY, blend);
          const angle = lerpAngle(0, snakeAngle, blend);

          character.style.opacity = opacity;
          character.style.transform = `translate3d(${x - size.width / 2}px, ${y - size.height / 2}px, 0) rotate(${angle}rad) scale(${scale})`;
        });
      });

      animationFrame = requestAnimationFrame(animateClone);
    };

    layoutClone();
    animationFrame = requestAnimationFrame(animateClone);

    addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        clearMovingCopies();
        cycleStarted = performance.now();
        needsLayout = true;
      }, 120);
    }, { passive: true });

    addEventListener("pagehide", () => {
      cancelAnimationFrame(animationFrame);
      clearMovingCopies();
    }, { once: true });
  }

  if (!field || !readout) return;

  const portalCopy = {
    web: ["01", "Web", "Browser-based artworks and self-contained interactive systems that exist as their own sites."],
    exhibition: ["02", "Exhibition", "Digital thresholds connecting audiences with works, ideas and activity unfolding in physical exhibitions."],
    residency: ["03", "Residency", "Field notes, processes and live transmissions emerging from research and residency sites."],
    performance: ["04", "Performance", "Live encounters, scores and performative works activated through bodies, signals and places."],
    relational: ["05", "Relational", "Participatory works and shared systems shaped through exchange, presence and audience action."],
    time: ["06", "Time-based", "Works that unfold through duration, recurrence, scheduled events and changing conditions."]
  };

  const updateReadout = key => {
    const portal = portalCopy[key];
    if (!portal) return;
    channels.forEach(channel => {
      const active = channel.dataset.portal === key;
      channel.classList.toggle("is-active", active);
      channel.setAttribute("aria-pressed", String(active));
    });
    readout.querySelector(".portal-readout-signal").textContent = `Channel ${portal[0]} / Framework open`;
    readout.querySelector("h3").textContent = portal[1];
    readout.querySelector(".portal-readout-copy").textContent = portal[2];
  };

  enter?.addEventListener("click", () => {
    enter.setAttribute("aria-expanded", "true");
    field.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  channels.forEach(channel => channel.addEventListener("click", () => updateReadout(channel.dataset.portal)));

})();
