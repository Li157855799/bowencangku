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
