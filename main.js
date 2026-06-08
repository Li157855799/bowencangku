/* ===== Particle Background ===== */

const canvas = document.querySelector("#bg-canvas");
const ctx = canvas.getContext("2d");

const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  glowX: window.innerWidth / 2,
  glowY: window.innerHeight / 2,
  active: false,
};

let particles = [];
let width = 0;
let height = 0;
let pixelRatio = 1;

function resize() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const count = Math.min(96, Math.max(42, Math.floor((width * height) / 15000)));
  particles = Array.from({ length: count }, () => createParticle());
}

function createParticle() {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.55,
    vy: (Math.random() - 0.5) * 0.55,
    size: Math.random() * 1.8 + 0.6,
  };
}

function drawParticle(particle) {
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(120, 232, 255, 0.72)";
  ctx.fill();
}

function drawLine(a, b, opacity) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = `rgba(95, 140, 255, ${opacity})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawPointerAura() {
  const glow = ctx.createRadialGradient(
    pointer.glowX,
    pointer.glowY,
    0,
    pointer.glowX,
    pointer.glowY,
    190
  );
  glow.addColorStop(0, "rgba(77, 231, 255, 0.24)");
  glow.addColorStop(0.36, "rgba(95, 140, 255, 0.1)");
  glow.addColorStop(1, "rgba(77, 231, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(pointer.glowX, pointer.glowY, 190, 0, Math.PI * 2);
  ctx.fill();
}

function animate() {
  ctx.clearRect(0, 0, width, height);

  pointer.glowX += (pointer.x - pointer.glowX) * 0.16;
  pointer.glowY += (pointer.y - pointer.glowY) * 0.16;
  document.documentElement.style.setProperty("--cursor-x", `${pointer.glowX}px`);
  document.documentElement.style.setProperty("--cursor-y", `${pointer.glowY}px`);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(77, 231, 255, 0.08)");
  gradient.addColorStop(0.5, "rgba(95, 140, 255, 0.04)");
  gradient.addColorStop(1, "rgba(255, 95, 215, 0.08)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (pointer.active) {
    drawPointerAura();
  }

  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;

    if (particle.x < -20) particle.x = width + 20;
    if (particle.x > width + 20) particle.x = -20;
    if (particle.y < -20) particle.y = height + 20;
    if (particle.y > height + 20) particle.y = -20;

    if (pointer.active) {
      const dx = particle.x - pointer.x;
      const dy = particle.y - pointer.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 140) {
        particle.x += dx * 0.006;
        particle.y += dy * 0.006;
      }
    }

    drawParticle(particle);
  }

  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const a = particles[i];
      const b = particles[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      if (distance < 120) {
        drawLine(a, b, (1 - distance / 120) * 0.2);
      }
    }

    if (pointer.active) {
      const pointerDistance = Math.hypot(particles[i].x - pointer.x, particles[i].y - pointer.y);

      if (pointerDistance < 190) {
        drawLine(particles[i], pointer, (1 - pointerDistance / 190) * 0.42);
      }
    }
  }

  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
});
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

resize();
animate();

/* ===== Carousel ===== */

const carousel = document.querySelector(".carousel");
const track = document.querySelector(".carousel-track");
const cards = Array.from(document.querySelectorAll(".card"));
const dotsContainer = document.querySelector(".carousel-dots");
const swipeHint = document.querySelector(".swipe-hint");

let currentIndex = 0;
let isDragging = false;
let dragStartX = 0;
let currentTranslate = 0;
let prevTranslate = 0;
let animationId = null;
let dragStartTime = 0;
let positionHistory = [];
let hasInteracted = false;

function getCardWidth() {
  if (!cards[0]) return 300;
  const style = getComputedStyle(track);
  const gap = parseFloat(style.gap) || 32;
  return cards[0].offsetWidth + gap;
}

function getMaxIndex() {
  return Math.max(0, cards.length - 1);
}

function setSliderPosition(animate) {
  if (animate) {
    track.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
  } else {
    track.style.transition = "none";
  }
  track.style.transform = `translateX(${currentTranslate}px)`;
  updateCardScales();
}

function updateCardScales() {
  const cardW = cards[0] ? cards[0].offsetWidth : 300;
  cards.forEach((card, i) => {
    const cardCenter = i * cardW + cardW / 2;
    const viewCenter = -currentTranslate + (carousel.offsetWidth / 2);
    const dist = Math.abs(cardCenter - viewCenter);
    const maxDist = cardW * 1.2;
    const t = Math.min(dist / maxDist, 1);

    const scale = 1 - 0.12 * t;
    const blur = 3.5 * t;
    const opacity = 1 - 0.35 * t;

    card.style.transform = `scale(${scale})`;
    card.style.filter = blur > 0.1 ? `blur(${blur}px)` : "none";
    card.style.opacity = opacity;
    card.classList.toggle("is-active", i === currentIndex);
  });
}

function goToSlide(index, animate = true) {
  currentIndex = Math.max(0, Math.min(index, getMaxIndex()));
  const cardW = getCardWidth();
  const viewW = carousel.offsetWidth;
  currentTranslate = -(currentIndex * cardW) + (viewW - cards[0].offsetWidth) / 2;
  prevTranslate = currentTranslate;
  setSliderPosition(animate);
  updateDots();
  hideHint();
}

function createDots() {
  dotsContainer.innerHTML = "";
  cards.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = `carousel-dot${i === 0 ? " active" : ""}`;
    dot.setAttribute("aria-label", `第 ${i + 1} 张卡片`);
    dot.addEventListener("click", () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });
}

function updateDots() {
  dotsContainer.querySelectorAll(".carousel-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === currentIndex);
  });
}

function hideHint() {
  if (!hasInteracted && swipeHint) {
    hasInteracted = true;
    swipeHint.classList.add("hidden");
  }
}

/* ===== Drag / Touch ===== */

function getPositionX(e) {
  return e.type.includes("mouse") ? e.pageX : e.touches[0].clientX;
}

function onDragStart(e) {
  isDragging = true;
  dragStartX = getPositionX(e);
  dragStartTime = Date.now();
  positionHistory = [{ x: dragStartX, t: dragStartTime }];
  track.style.transition = "none";
  document.body.classList.add("is-dragging");
  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(animateDrag);
}

function onDragMove(e) {
  if (!isDragging) return;
  const x = getPositionX(e);
  const diff = x - dragStartX;
  currentTranslate = prevTranslate + diff;

  // Rubber-band at edges
  const maxT = (carousel.offsetWidth - cards[0].offsetWidth) / 2;
  const minT = -(getMaxIndex() * getCardWidth()) + maxT;

  if (currentTranslate > maxT) {
    currentTranslate = maxT + (currentTranslate - maxT) * 0.25;
  } else if (currentTranslate < minT) {
    currentTranslate = minT + (currentTranslate - minT) * 0.25;
  }

  positionHistory.push({ x, t: Date.now() });
  if (positionHistory.length > 6) positionHistory.shift();
}

function onDragEnd() {
  if (!isDragging) return;
  isDragging = false;
  document.body.classList.remove("is-dragging");

  // Compute velocity (px/ms)
  let velocity = 0;
  if (positionHistory.length >= 2) {
    const first = positionHistory[0];
    const last = positionHistory[positionHistory.length - 1];
    const dt = last.t - first.t;
    if (dt > 0) velocity = (last.x - first.x) / dt;
  }

  const moved = currentTranslate - prevTranslate;
  const cardW = getCardWidth();

  let newIndex = currentIndex;

  // Velocity-based snap
  if (Math.abs(velocity) > 0.35) {
    newIndex += velocity > 0 ? -1 : 1;
  }
  // Distance-based snap
  else if (Math.abs(moved) > cardW * 0.18) {
    newIndex += moved < 0 ? 1 : -1;
  }

  goToSlide(newIndex);
}

function animateDrag() {
  if (isDragging) {
    setSliderPosition(false);
    animationId = requestAnimationFrame(animateDrag);
  }
}

/* ===== Events ===== */

track.addEventListener("mousedown", onDragStart);
track.addEventListener("touchstart", onDragStart, { passive: true });
window.addEventListener("mousemove", onDragMove);
window.addEventListener("touchmove", onDragMove, { passive: true });
window.addEventListener("mouseup", onDragEnd);
window.addEventListener("touchend", onDragEnd);

// Prevent link/image drag interfering
track.addEventListener("dragstart", (e) => e.preventDefault());

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft")  goToSlide(currentIndex - 1);
  if (e.key === "ArrowRight") goToSlide(currentIndex + 1);
});

// Recalculate on resize
window.addEventListener("resize", () => goToSlide(currentIndex, false));

/* ===== Init Carousel ===== */

createDots();
goToSlide(0, false);

/* ===== Mouse Wheel Navigation ===== */

let wheelCooldown = false;

carousel.addEventListener("wheel", (e) => {
  e.preventDefault();

  if (wheelCooldown || isDragging) return;

  const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  const threshold = 15;

  if (Math.abs(delta) < threshold) return;

  wheelCooldown = true;
  setTimeout(() => { wheelCooldown = false; }, 650);

  if (delta > 0) {
    goToSlide(currentIndex + 1);
  } else {
    goToSlide(currentIndex - 1);
  }
}, { passive: false });

/* ===== Typing Animation ===== */

(function initTyping() {
  const nameEl = document.querySelector(".typing-name");
  const cursorEl = document.querySelector(".typing-cursor");
  if (!nameEl || !cursorEl) return;

  const text = nameEl.getAttribute("data-text") || "";
  nameEl.textContent = "";
  cursorEl.classList.add("visible");

  let charIndex = 0;

  function typeNext() {
    if (charIndex < text.length) {
      nameEl.textContent += text[charIndex];
      charIndex++;
      setTimeout(typeNext, 100 + Math.random() * 60);
    } else {
      // Typing done — keep cursor blinking for a moment, then hide
      setTimeout(() => {
        cursorEl.classList.remove("visible");
        cursorEl.style.animation = "none";
      }, 2000);
    }
  }

  // Start typing after a short delay
  setTimeout(typeNext, 800);
})();

/* ===== Fade-in on Scroll ===== */

(function initFadeIn() {
  const targets = document.querySelectorAll(".profile-panel, .video-showcase, .carousel");

  targets.forEach((el) => el.classList.add("fade-in"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));
})();

/* ===== Video Lightbox ===== */

(function initVideoLightbox() {
  const lightbox = document.querySelector(".video-lightbox");
  const lightboxVideo = document.querySelector(".lightbox-video");
  const lightboxTitle = document.querySelector(".lightbox-title");
  const lightboxClose = document.querySelector(".lightbox-close");
  const lightboxBackdrop = document.querySelector(".lightbox-backdrop");
  const videoCards = document.querySelectorAll(".video-card");

  if (!lightbox || !lightboxVideo) return;

  function openLightbox(videoSrc, title) {
    lightboxVideo.src = videoSrc;
    lightboxTitle.textContent = title || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Delay play slightly so the open animation is visible first
    setTimeout(() => {
      lightboxVideo.play().catch(() => {});
    }, 350);
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lightboxVideo.pause();

    // Clear src after transition to stop buffering
    setTimeout(() => {
      lightboxVideo.removeAttribute("src");
      lightboxVideo.load();
    }, 450);
  }

  videoCards.forEach((card) => {
    card.addEventListener("click", () => {
      const videoSrc = card.getAttribute("data-video");
      const title = card.getAttribute("data-title") || "";
      if (videoSrc) openLightbox(videoSrc, title);
    });
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxBackdrop.addEventListener("click", closeLightbox);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });
})();
