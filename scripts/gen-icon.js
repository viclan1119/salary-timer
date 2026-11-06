/**
 * 生成 PWA 图标（纯 node 实现，无需第三方依赖）
 * 图案：圆形深色渐变底 + 绿色圆环（钱币/进度意象）
 * 输出：icons/icon-192.png, icons/icon-512.png, icons/apple-touch-icon.png(180)
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  if (!crc32.table) {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    crc32.table = t;
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crc32.table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

function makeIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const R = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / R;
      const dy = (y - cy) / R;
      const d = Math.sqrt(dx * dx + dy * dy);
      const i = (y * size + x) * 4;
      if (d > 1.0) { rgba[i + 3] = 0; continue; } // 圆形外透明

      // 对角渐变底：深蓝 #0f172a -> 深青 #0f766e
      const t = clamp((dx + dy + 2) / 4, 0, 1);
      let r = 15;
      let g = lerp(23, 118, t);
      let b = lerp(42, 110, t);

      // 绿色圆环 + 中心绿点
      const ring = (d >= 0.42 && d <= 0.56) || d <= 0.13;
      if (ring) { r = 52; g = 211; b = 153; }

      rgba[i] = Math.round(r);
      rgba[i + 1] = Math.round(g);
      rgba[i + 2] = Math.round(b);
      rgba[i + 3] = 255;
    }
  }
  return encodePNG(size, size, rgba);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180]
];
for (const [name, size] of targets) {
  fs.writeFileSync(path.join(outDir, name), makeIcon(size));
  console.log('生成', name, size + 'x' + size);
}
