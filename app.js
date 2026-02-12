const puffer = document.getElementById("puffer");
const stage = document.getElementById("stage");

// ----- Background music -----
let bgm = new Audio("lofi.mp3");
bgm.loop = true;
bgm.volume = 0.35;

// On mobile, audio must start from a real gesture.
// We'll try to start it on first touch/click anywhere.
let musicStarted = false;
function startBgmOnce() {
  if (musicStarted) return;
  musicStarted = true;
  bgm.play().catch(() => {
    // If blocked, we'll try again on the next gesture.
    musicStarted = false;
  });
}

window.addEventListener("pointerdown", startBgmOnce, { once: false });

// ----- Drag state -----
let dragging = false;
let offsetX = 0, offsetY = 0;
let startX = 0, startY = 0;
let moved = false;

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function centerPuffer() {
  const r = stage.getBoundingClientRect();
  const w = puffer.offsetWidth;
  const h = puffer.offsetHeight;
  puffer.style.left = `${(r.width - w) / 2}px`;
  puffer.style.top  = `${(r.height - h) / 2}px`;
}

window.addEventListener("load", centerPuffer);
window.addEventListener("resize", centerPuffer);

function playKiss() {
  // Simple “mwah” using WebAudio (works on mobile after a gesture)
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.type = "sine";
  o.frequency.value = 520;

  g.gain.value = 0.0001;
  o.connect(g);
  g.connect(ctx.destination);

  o.start();
  g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.03);
  o.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
  o.stop(ctx.currentTime + 0.26);

  setTimeout(() => ctx.close(), 300);
}

function puff() {
  puffer.classList.add("puffed");
  setTimeout(() => puffer.classList.remove("puffed"), 220);
}

function spawnHearts(count = 10) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  for (let i = 0; i < count; i++) {
    const b = document.createElement("div");
    b.className = "bubble";

    const x = Math.random() * (vw - 30);
    const y = vh - 20 - Math.random() * 60;

    b.style.left = `${x}px`;
    b.style.top = `${y}px`;

    const pinks = ["#ff7fa3", "#ff95b8", "#ff6f91", "#ff8fab"];
    const c = pinks[Math.floor(Math.random() * pinks.length)];
    b.style.setProperty("--heart", c);

    // slower float
    b.style.animationDuration = `${4.5 + Math.random() * 2.5}s`;

    stage.appendChild(b);
    b.addEventListener("animationend", () => b.remove());
  }
}

function moveTo(clientX, clientY) {
  const r = stage.getBoundingClientRect();
  const w = puffer.offsetWidth;
  const h = puffer.offsetHeight;

  let x = clientX - r.left - offsetX;
  let y = clientY - r.top - offsetY;

  // allow a little offscreen
  const offX = w * 0.35;
  const offY = h * 0.35;

  x = clamp(x, -offX, r.width - w + offX);
  y = clamp(y, -offY, r.height - h + offY);

  puffer.style.left = `${x}px`;
  puffer.style.top = `${y}px`;
}

// IMPORTANT: prevent default on touch/pointer so Chrome doesn’t “scroll” instead.
function prevent(e) {
  e.preventDefault();
}

puffer.addEventListener("pointerdown", (e) => {
  prevent(e);
  startBgmOnce(); // try music again here too

  dragging = true;
  moved = false;

  startX = e.clientX;
  startY = e.clientY;

  try { puffer.setPointerCapture(e.pointerId); } catch {}

  const pr = puffer.getBoundingClientRect();
  offsetX = e.clientX - pr.left;
  offsetY = e.clientY - pr.top;
}, { passive: false });

puffer.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  prevent(e);

  const dx = Math.abs(e.clientX - startX);
  const dy = Math.abs(e.clientY - startY);
  if (dx > 6 || dy > 6) moved = true;

  moveTo(e.clientX, e.clientY);
}, { passive: false });

function endPointer() {
  dragging = false;

  // only treat as “click” if not moved
  if (!moved) {
    puff();
    playKiss();
    spawnHearts(10);
  }
}

puffer.addEventListener("pointerup", (e) => {
  prevent(e);
  endPointer();
}, { passive: false });

puffer.addEventListener("pointercancel", () => {
  dragging = false;
});
