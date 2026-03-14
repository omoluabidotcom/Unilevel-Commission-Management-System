// ── Greeting ──
const hour = new Date().getHours();
const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
document.getElementById('greeting').textContent = `${greet}, Admin User! 👋`;

// ── Nav active state ──
function setActive(el) {
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  el.classList.add('active');
}

// ── Animated counter ──
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const prefix = el.dataset.prefix || '';
  const duration = 1400;
  const start = performance.now();

  function fmt(n) {
    if (target >= 1000) return prefix + n.toLocaleString('en-US');
    return prefix + n;
  }

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = fmt(current);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// Trigger when cards enter view
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.stat-value[data-target]').forEach(animateCounter);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.3 }
);

document.querySelectorAll('.stat-card').forEach((c) => observer.observe(c));
