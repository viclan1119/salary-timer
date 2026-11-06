/**
 * 把任意正方形 PNG 缩放成 PWA 图标（纯 node 实现，无第三方依赖）
 * 用法：node scripts/build-icon.js <源图路径>
 * 输出：icons/icon-512.png、icon-192.png、apple-touch-icon.png(180)
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// ---------- PNG 编码（复用） ----------
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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- PNG 解码 ----------
function decodePNG(buf) {
  if (buf[0] !== 137 || buf[1] !== 80 || buf[2] !== 78 || buf[3] !== 71) throw new Error('不是 PNG 文件');
  let pos = 8;
  let width = 0, height = 0, colorType = 0, interlace = 0;
  const idatParts = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idatParts.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }
  if (interlace !== 0) throw new Error('不支持隔行扫描 PNG');
  const bppMap = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const channels = bppMap[colorType];
  if (!channels) throw new Error('不支持的色型 ' + colorType);
  const raw = zlib.inflateSync(Buffer.concat(idatParts));
  const pixels = unfilter(raw, width, height, channels);
  return { width, height, channels, data: pixels };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}
function unfilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      const val = raw[rowStart + x];
      let r;
      if (filter === 0) r = val;
      else if (filter === 1) r = val + a;
      else if (filter === 2) r = val + b;
      else if (filter === 3) r = val + ((a + b) >> 1);
      else if (filter === 4) r = val + paeth(a, b, c);
      else throw new Error('未知滤波类型 ' + filter);
      row[x] = r & 0xff;
    }
    row.copy(out, y * stride);
    prev = row;
  }
  return out;
}

// ---------- 双线性缩放 ----------
function resize(data, w, h, channels, nw, nh) {
  const out = Buffer.alloc(nw * nh * channels);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = (x + 0.5) * w / nw - 0.5;
      const sy = (y + 0.5) * h / nh - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const y0 = Math.max(0, Math.floor(sy));
      const x1 = Math.min(x0 + 1, w - 1);
      const y1 = Math.min(y0 + 1, h - 1);
      const fx = sx - x0, fy = sy - y0;
      const base = (y * nw + x) * channels;
      for (let c = 0; c < channels; c++) {
        const p00 = data[(y0 * w + x0) * channels + c];
        const p10 = data[(y0 * w + x1) * channels + c];
        const p01 = data[(y1 * w + x0) * channels + c];
        const p11 = data[(y1 * w + x1) * channels + c];
        const top = p00 + (p10 - p00) * fx;
        const bot = p01 + (p11 - p01) * fx;
        out[base + c] = Math.round(top + (bot - top) * fy);
      }
    }
  }
  return out;
}

// ---------- 主流程 ----------
const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error('用法：node scripts/build-icon.js <源图路径>');
  process.exit(1);
}
const { width, height, channels, data } = decodePNG(fs.readFileSync(src));
console.log(`源图 ${width}x${height}, ${channels} 通道`);

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const targets = [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]];
for (const [name, size] of targets) {
  const scaled = resize(data, width, height, channels, size, size);
  // 转 RGBA（补 alpha 通道）
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = scaled[i * channels];
    rgba[i * 4 + 1] = scaled[i * channels + 1];
    rgba[i * 4 + 2] = scaled[i * channels + 2];
    rgba[i * 4 + 3] = channels === 4 ? scaled[i * channels + 3] : 255;
  }
  fs.writeFileSync(path.join(outDir, name), encodePNG(size, size, rgba));
  console.log('生成', name, size + 'x' + size);
}
