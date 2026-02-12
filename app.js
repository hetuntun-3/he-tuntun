const puffer = document.getElementById("puffer");
const stage = document.getElementById("stage");
const soundToggle = document.getElementById("soundToggle");

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

function playPop() {
  if (!soundToggle || !soundToggle.checked) return;

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.type = "sine";
  o.frequency.value = 420;
  g.gain.value = 0.06;

  o.connect(g);
  g.connect(ctx.destination);

  o.start();
  o.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.10);
  o.stop(ctx.currentTime + 0.11);

  setTimeout(() => ctx.close(), 150);
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

    b.style.animationDuration = `${3 + Math.random() * 2}s`;

    stage.appendChild(b);
    b.addEventListener("animationend", () => b.remove());
  }
}

function puff() {
  puffer.classList.add("puffed");
  playPop();
  setTimeout(() => puffer.classList.remove("puffed"), 220);
}

function moveTo(clientX, clientY) {
  const r = stage.getBoundingClientRect();
  const w = puffer.offsetWidth;
  const h = puffer.offsetHeight;

  let x = clientX - r.left - offsetX;
  let y = clientY - r.top - offsetY;

  const offX = w * 0.4;
  const offY = h * 0.4;

  x = clamp(x, -offX, r.width - w + offX);
  y = clamp(y, -offY, r.height - h + offY);

  puffer.style.left = `${x}px`;
  puffer.style.top = `${y}px`;
}

puffer.addEventListener("pointerdown", (e) => {
  dragging = true;
  moved = false;

  startX = e.clientX;
  startY = e.clientY;

  puffer.setPointerCapture(e.pointerId);

  const pr = puffer.getBoundingClientRect();
  offsetX = e.clientX - pr.left;
  offsetY = e.clientY - pr.top;
});

puffer.addEventListener("pointermove", (e) => {
  if (!dragging) return;

  const dx = Math.abs(e.clientX - startX);
  const dy = Math.abs(e.clientY - startY);

  if (dx > 5 || dy > 5) moved = true;

  moveTo(e.clientX, e.clientY);
});

puffer.addEventListener("pointerup", () => {
  dragging = false;

  if (!moved) {
    puff();
    spawnHearts(10);
  }
});
