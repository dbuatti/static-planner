/* One-off icon generator — produces warm planner icons as PNGs.
   Run: node tools/gen/icons.js  (no dependencies, uses zlib). */
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// Colours
const BG = [201, 138, 74];      // warm terracotta
const MARK = [251, 247, 239];   // warm cream

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2;
  const R = size * 0.30;        // outer ring radius
  const RIN = size * 0.16;      // inner hole radius
  const RING = size * 0.055;    // ring thickness
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c, dy = y - c;
      const d = Math.sqrt(dx * dx + dy * dy);
      // background
      let r = BG[0], g = BG[1], b = BG[2];
      // ring coverage (smooth edges)
      const outer = d - (R - RING / 2);
      const inner = (R + RING / 2) - d;
      const cov = Math.max(0, Math.min(1, Math.min(outer / 1.5, inner / 1.5)));
      // inner dot
      const dotCov = Math.max(0, Math.min(1, (RIN - d) / 1.5));
      const m = Math.max(cov, dotCov);
      r = Math.round(r + (MARK[0] - r) * m);
      g = Math.round(g + (MARK[1] - g) * m);
      b = Math.round(b + (MARK[2] - b) * m);
      const i = (y * size + x) * 4;
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255;
    }
  }
  return encodePNG(size, size, rgba);
}

const root = path.join(__dirname, "..", "..");
const out = [
  [path.join(root, "assets", "icons", "icon-192.png"), 192],
  [path.join(root, "assets", "icons", "icon-512.png"), 512],
  [path.join(root, "assets", "icons", "icon-maskable-512.png"), 512],
  [path.join(root, "apple-touch-icon.png"), 180]
];
out.forEach(([p, s]) => {
  fs.writeFileSync(p, render(s));
  console.log("wrote", p, s + "px");
});
