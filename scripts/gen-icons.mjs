#!/usr/bin/env node
/**
 * REQ-2 — the pixel app icon as real files: favicon sizes, the apple touch icon, the manifest
 * pair, all rasterised from the SAME 16×16 grid the SVG draws (public/icon.svg), so the mark is
 * one design everywhere. No dependencies: PNG is zlib + a CRC, and node has both.
 *
 *   node scripts/gen-icons.mjs           write the icons
 *   node scripts/gen-icons.mjs --check   fail if the files on disk differ (gate)
 */
import { deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps/web/public/icons');

const BG = [0x0c, 0x13, 0x10, 255];
const FG = [0xac, 0xca, 0xb3, 255];

/** The 16×16 grid, transcribed from public/icon.svg's rects — the one source of the mark. */
const rects = [
  [4, 3, 8, 1], [3, 4, 1, 1], [12, 4, 1, 1], [3, 5, 1, 8], [12, 5, 1, 8],
  [4, 13, 8, 1], [6, 6, 4, 1], [5, 7, 1, 3], [10, 7, 1, 3], [6, 10, 4, 1], [6, 8, 4, 1],
];

const grid = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => BG));
for (const [x, y, w, h] of rects) {
  for (let j = y; j < y + h; j += 1) for (let i = x; i < x + w; i += 1) grid[j][i] = FG;
}

/** Nearest-neighbour upscale — the pixels STAY pixels; that is the whole style. */
function raster(size) {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = grid[Math.floor((y * 16) / size)][Math.floor((x * 16) / size)];
      out.set(px, (y * size + x) * 4);
    }
  }
  return out;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size) {
  const raw = raster(size);
  const stride = size * 4;
  const scan = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    scan[y * (stride + 1)] = 0; // filter: none
    raw.subarray(y * stride, (y + 1) * stride).forEach((b, i) => { scan[y * (stride + 1) + 1 + i] = b; });
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // truecolour + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(scan, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const FILES = [
  ['icon-16.png', 16], ['icon-32.png', 32], ['icon-192.png', 192],
  ['icon-512.png', 512], ['apple-touch-icon.png', 180],
];

const check = process.argv.includes('--check');
let failed = false;
if (!check) mkdirSync(OUT, { recursive: true });
for (const [name, size] of FILES) {
  const bytes = png(size);
  const path = join(OUT, name);
  if (check) {
    if (!existsSync(path) || !readFileSync(path).equals(bytes)) {
      console.error(`icons: ${name} is missing or stale — run: node scripts/gen-icons.mjs`);
      failed = true;
    }
  } else {
    writeFileSync(path, bytes);
    console.log(`icons: wrote ${name} (${size}×${size}, ${bytes.length} bytes)`);
  }
}
if (failed) process.exit(1);
if (!check) console.log('icons: done');
