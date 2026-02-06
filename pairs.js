// =========================
// MESIN WARNA TERANG INFINITE
// =========================

// SIMPLE XORSHIFT RNG
let seed = Date.now() % 2147483647;
function rand() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967295;
}

// RANDOM BRIGHT COLOR
function brightColor() {
  let r, g, b;
  do {
    r = Math.floor(rand() * 256);
    g = Math.floor(rand() * 256);
    b = Math.floor(rand() * 256);
  } while (r + g + b < 500); // pastikan terang
  return "#" + r.toString(16).padStart(2,"0") +
               g.toString(16).padStart(2,"0") +
               b.toString(16).padStart(2,"0");
}

// INFINITE PAIR GENERATOR
function nextPair() {
  return [brightColor(), brightColor()];
}

// =========================
// OPTIONAL: pre-generate beberapa pair (cepat)
// =========================
const PAIRS_BUFFER_SIZE = 3918390; // buffer awal
const pairs = Array.from({length: PAIRS_BUFFER_SIZE}, () => nextPair());