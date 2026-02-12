const puffer = document.getElementById("puffer");
const stage = document.getElementById("stage");

// Music
const bgm = document.getElementById("bgm");
const musicToggle = document.getElementById("musicToggle");

// Drag state
let dragging = false;
let offsetX = 0, offsetY = 0;
let startX = 0, startY = 0;
let moved = false;

// One shared AudioContext (better than creating a new one every click)
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

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

/** Kiss sound (“mwah”) made from: short noise “smack” + soft pitch glide */
function playKiss() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  // --- Smack: a tiny noise burst through a bandpass filter ---
  const bufferSize = Math.floor(ctx.sampleRate * 0.08);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // quick-decay noise for a “lip smack”
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(1200, now);
  bandpass.Q.setValueAtTime(0.9, now);

  const smackGain = ctx.createGain();
  smackGain.gain.setValueAtTime(0.0001, now);
  smackGain.gain.linearRampToValueAtTime(0.18, now + 0.005);
  smackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);

  noise.connect(bandpass);
  bandpass.connect(smackGain);
  smackGain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.11);

  // --- “Mwah” tone: soft sine that glides down slightly ---
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(520, now);
  o.frequency.exponentialRampToValueAtTime(260, now + 0.18);

  const toneGain = ctx.createGain();
  toneGain.gain.setValueAtTime(0.0001, now + 0.02);
  toneGain.gain.linearRampToValueAtTime(0.04, now + 0.06);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  o.connect(toneGain);
  toneGain.connect(ctx.destination);

  o.start(now + 0.02);
  o.stop(now + 0.24);
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

    // start near bottom, random x across full screen
    const x = Math.random() * (vw - 30);
    const y = vh - 20 - Math.random() * 60;

    b.style.left = `${x}px`;
    b.style.top = `${y}px`;

    // slower float (you can adjust these numbers)
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

  // allow a bit offscreen so it feels less “blocked”
  const offX = w * 0.35;
  const offY = h * 0.35;

  x = clamp(x, -offX, r.width - w + offX);
  y = clamp(y, -offY, r.height - h + offY);

  puffer.style.left = `${x}px`;
  puffer.style.top = `${y}px`;
}

// Drag + click separation
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
  if (dx > 6 || dy > 6) moved = true;

  moveTo(e.clientX, e.clientY);
});

puffer.addEventListener("pointerup", () => {
  dragging = false;

  // Only “kiss + hearts” if it was a real click (not a drag)
  if (!moved) {
    puff();
    playKiss();
    spawnHearts(10);
  }
});

// Keyboard accessibility: Enter/Space triggers kiss
puffer.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    puff();
    playKiss();
    spawnHearts(10);
  }
});

// Music toggle (autoplay will be blocked until user interacts — this counts!)
musicToggle.addEventListener("change", async () => {
  if (musicToggle.checked) {
    try {
      bgm.volume = 0.35;
      await bgm.play();
    } catch (err) {
      // If browser blocks, user just needs to click anywhere once, then toggle again
      console.log("Music play blocked by browser:", err);
      musicToggle.checked = false;
    }
  } else {
    bgm.pause();
  }
});
