/**
 * Simple confetti animation utility
 *
 * Creates a burst of colorful confetti particles that fall down the screen.
 * Used for Easter eggs and celebratory moments.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

const COLORS = [
  '#f94144', // red
  '#f3722c', // orange
  '#f8961e', // yellow-orange
  '#f9c74f', // yellow
  '#90be6d', // green
  '#43aa8b', // teal
  '#4d908e', // blue-green
  '#577590', // blue
  '#277da1', // dark blue
  '#9b5de5', // purple
];

// Physics constants
const PARTICLE_COUNT = 100;
const GRAVITY = 0.3;
const DRAG = 0.99;
const FADE_SPEED = 0.015;

// Particle generation constants
const BASE_VELOCITY = 8;
const VELOCITY_VARIANCE = 8;
const SPAWN_SPREAD_X = 200;
const SPAWN_Y_RATIO = 0.3;
const INITIAL_UPWARD_VELOCITY = 10;
const BASE_SIZE = 8;
const SIZE_VARIANCE = 8;
const CENTER_OFFSET = 0.5;
const ROTATION_SPEED_VARIANCE = 0.2;
const FADE_START_RATIO = 0.6;
const PARTICLE_WIDTH_RATIO = 2;
const PARTICLE_HEIGHT_RATIO = 4;

/**
 * Launch a confetti burst animation
 *
 * Creates a canvas overlay and animates confetti particles falling from the top.
 * The animation cleans up automatically when complete.
 * Respects prefers-reduced-motion for accessibility.
 *
 * @param duration - Animation duration in milliseconds (default: 3000)
 */
export function launchConfetti(duration = 3000): void {
  // Respect user's motion preferences for accessibility
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  // Set canvas size
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    return;
  }

  // Create particles
  const particles: Particle[] = [];
  const centerX = canvas.width / 2;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = BASE_VELOCITY + Math.random() * VELOCITY_VARIANCE;

    particles.push({
      x: centerX + (Math.random() - CENTER_OFFSET) * SPAWN_SPREAD_X,
      y: canvas.height * SPAWN_Y_RATIO,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - INITIAL_UPWARD_VELOCITY,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      size: BASE_SIZE + Math.random() * SIZE_VARIANCE,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - CENTER_OFFSET) * ROTATION_SPEED_VARIANCE,
      opacity: 1,
    });
  }

  // Animation loop
  let animationId: number;
  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;

    if (elapsed > duration || particles.every((p) => p.opacity <= 0)) {
      // Cleanup
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const particle of particles) {
      // Update physics
      particle.vy += GRAVITY;
      particle.vx *= DRAG;
      particle.vy *= DRAG;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;

      // Fade out
      if (elapsed > duration * FADE_START_RATIO) {
        particle.opacity -= FADE_SPEED;
      }

      // Draw particle
      if (particle.opacity > 0) {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = Math.max(0, particle.opacity);
        ctx.fillStyle = particle.color;
        ctx.fillRect(
          -particle.size / PARTICLE_WIDTH_RATIO,
          -particle.size / PARTICLE_HEIGHT_RATIO,
          particle.size,
          particle.size / PARTICLE_WIDTH_RATIO,
        );
        ctx.restore();
      }
    }

    animationId = requestAnimationFrame(animate);
  };

  animate();
}
