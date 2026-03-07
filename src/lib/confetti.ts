import confetti from "canvas-confetti";

export function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.6 } });
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.6 } });

  setTimeout(() => {
    confetti({ ...defaults, particleCount: 30, origin: { x: 0.5, y: 0.4 } });
  }, 200);
}

export function fireStreakConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7 },
    colors: ["#ff6b00", "#ff9500", "#ffcc00", "#ff3d00"],
    ticks: 50,
    zIndex: 9999,
  });
}

export function fireGoalConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#10b981", "#06b6d4", "#3b82f6"],
      zIndex: 9999,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#10b981", "#06b6d4", "#3b82f6"],
      zIndex: 9999,
    });

    if (Date.now() < end) requestAnimationFrame(frame);
  };

  frame();
}

export function fireLevelUpConfetti() {
  confetti({
    particleCount: 100,
    spread: 120,
    origin: { y: 0.5, x: 0.5 },
    colors: ["#8b5cf6", "#a855f7", "#c084fc", "#e879f9", "#f0abfc"],
    startVelocity: 45,
    ticks: 80,
    zIndex: 9999,
  });
}
