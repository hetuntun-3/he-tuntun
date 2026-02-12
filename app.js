const puffer = document.getElementById("puffer");
const stage = document.getElementById("stage");
const musicToggle = document.getElementById("musicToggle");
const soundToggle = document.getElementById("soundToggle");
const shareBtn = document.getElementById("shareBtn");

// ---------- Position ----------
function centerPuffer() {
  const r = stage.getBoundingClientRect();
  const w = puffer.offsetWidth;
  const h = puffer.offsetHeight;
  puffer.style.left = `${(r.width - w) / 2}px`;
  puffer.style.top  = `${(r.height - h) / 2}px`;
}
window.addEventListener("load", centerPuffer);
window.addEventListener("resize", centerPuffer);

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function moveTo(clientX, clientY, offsetX, offsetY) {
  const r = stage.getBoundingClientRect();
  const w = puffer.offsetWidth;
  const h = puffer.offsetHeight;

  let x = clientX - r.left - offsetX;
  let y = clientY - r.top - offsetY;

  // allow a little off-screen so it feels natural
  const offX = w * 0.25;
  const offY = h * 0.25;

  x = clamp(x, -offX, r.width - w + offX);
  y = clamp(y, -offY, r.height - h + offY);

  puffer.style.left = `${x}px`;
  puffer.style.top  = `${y}px`;
}

// ---------- Hearts ----------
function spawnHearts(count = 10) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const pinks = ["#ff7fa3", "#ff95b8", "#ff6f91", "#ff8fab"];

  for (let i = 0; i < count; i++) {
    const b = document.createElement("div");
    b.className = "bubble";

    const x = Math.random() * (vw - 30);
    const y = vh - 10 - Math.random() * 50;

    b.style.left = `${x}px`;
    b.style.top  = `${y}px`;

    const c = pinks[Math.floor(Math.random() * pinks.length)];
    b.style.setProperty("--heart", c);

    // slower float (4–6s)
    b.style.setProperty("--dur", `${4 + Math.random() * 2}s`);

    document.body.appendChild(b);
    b.addEventListener("animationend", () => b.remove());
  }
}

// ---------- Puff ----------
function puff() {
  puffer.classList.add("puffed");
  setTimeout(() => puffer.classList.remove("puffed"), 220);
}

// ---------- Kiss sound (WebAudio) ----------
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playKiss() {
  if (!soundToggle?.checked) return;

  const ctx = getAudioCtx();
  if (ctx.state === "suspended") ctx.resume();

  // Quick "kiss": filtered noise + tiny pitch blip
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 800;

  const g = ctx.createGain();
  g.gain.value = 0.0001;
  g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);

  noise.connect(hp);
  hp.connect(g);
  g.connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + 0.08);

  // tiny tonal "mwah"
  const o = ctx.createOscillator();
  const g2 = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(520, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.09);
  g2.gain.value = 0.0001;
  g2.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
  g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.10);
  o.connect(g2);
  g2.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.11);
}

// ---------- Background music ----------
const bg = new Audio("lofi.mp3");
bg.loop = true;
bg.volume = 0.35;

async function syncMusic() {
  try {
    if (musicToggle?.checked) {
      // iOS requires this to happen after a user gesture (tap)
      await bg.play();
    } else {
      bg.pause();
    }
  } catch (e) {
    // If blocked, user just needs to tap once (we’ll retry on next tap)
  }
}

musicToggle?.addEventListener("change", syncMusic);

// ---------- Click vs Drag (works on mobile) ----------
let dragging = false;
let moved = false;
let startX = 0, startY = 0;
let offsetX = 0, offsetY = 0;

function onTapAction() {
  puff();
  spawnHearts(10);
  playKiss();
  // If music is enabled, try to start it on this user gesture
  syncMusic();
}

// Pointer events (desktop + many mobiles)
puffer.addEventListener("pointerdown", (e) => {
  dragging = true;
  moved = false;
  startX = e.clientX;
  startY = e.clientY;

  const pr = puffer.getBoundingClientRect();
  offsetX = e.clientX - pr.left;
  offsetY = e.clientY - pr.top;

  puffer.setPointerCapture?.(e.pointerId);
});

puffer.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = Math.abs(e.clientX - startX);
  const dy = Math.abs(e.clientY - startY);
  if (dx > 6 || dy > 6) moved = true;

  moveTo(e.clientX, e.clientY, offsetX, offsetY);
});

puffer.addEventListener("pointerup", () => {
  dragging = false;
  if (!moved) onTapAction();
});

// Touch fallback (important for iOS webkit quirks)
puffer.addEventListener("touchstart", (e) => {
  if (!e.touches?.length) return;
  const t = e.touches[0];

  dragging = true;
  moved = false;
  startX = t.clientX;
  startY = t.clientY;

  const pr = puffer.getBoundingClientRect();
  offsetX = t.clientX - pr.left;
  offsetY = t.clientY - pr.top;
}, { passive: true });

puffer.addEventListener("touchmove", (e) => {
  if (!dragging || !e.touches?.length) return;
  const t = e.touches[0];

  const dx = Math.abs(t.clientX - startX);
  const dy = Math.abs(t.clientY - startY);
  if (dx > 6 || dy > 6) moved = true;

  moveTo(t.clientX, t.clientY, offsetX, offsetY);
}, { passive: false });

puffer.addEventListener("touchend", () => {
  dragging = false;
  if (!moved) onTapAction();
});

// Keyboard accessibility
puffer.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") onTapAction();
});

// ---------- Share ----------
shareBtn?.addEventListener("click", async () => {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: "He Tuntun", text: "Meet He Tuntun 🐡", url });
    } else {
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = "Copied!";
      setTimeout(() => (shareBtn.textContent = "Share"), 900);
    }
  } catch {}
});
