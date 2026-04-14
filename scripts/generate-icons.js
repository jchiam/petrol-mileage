#!/usr/bin/env node
/**
 * Generate PWA PNG icons from scratch using only Node.js built-ins.
 * Outputs:
 *   public/icons/icon-192.png   (192×192)
 *   public/icons/icon-512.png   (512×512, maskable)
 *   public/icons/apple-touch-icon.png  (180×180)
 *   public/favicon.ico          (32×32 ICO wrapping a PNG)
 *
 * Design: dark #111827 background, white fuel-drop silhouette centred.
 */

const { deflateSync } = require('zlib')
const fs = require('fs')
const path = require('path')

// ─── CRC32 (required by PNG spec) ────────────────────────────────────────────

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (0xedb88320 ^ (crc >>> 1)) : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0)
  return Buffer.concat([len, typeBytes, data, crcBuf])
}

// ─── PNG builder ──────────────────────────────────────────────────────────────

/**
 * Build a PNG from an RGBA pixel array (Uint8Array of length w*h*4).
 */
function buildPNG(width, height, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8   // bit depth
  ihdrData[9] = 6   // color type: RGBA
  ihdrData[10] = 0  // compression
  ihdrData[11] = 0  // filter
  ihdrData[12] = 0  // interlace

  // Build raw image data (one filter byte per scanline)
  const rowBytes = 1 + width * 4
  const raw = Buffer.alloc(height * rowBytes)
  for (let y = 0; y < height; y++) {
    raw[y * rowBytes] = 0  // filter: None
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4
      const ri = y * rowBytes + 1 + x * 4
      raw[ri]     = pixels[pi]
      raw[ri + 1] = pixels[pi + 1]
      raw[ri + 2] = pixels[pi + 2]
      raw[ri + 3] = pixels[pi + 3]
    }
  }

  const compressed = deflateSync(raw, { level: 6 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ─── Icon renderer ────────────────────────────────────────────────────────────

/**
 * Render the icon at a given size.
 * Background: #111827 (17, 24, 39)
 * Fuel drop: white (#F9FAFB = 249, 250, 251), anti-aliased
 *
 * The fuel-drop is defined parametrically:
 *   top point at (0.5, 0.18) relative coords
 *   circular base centred at (0.5, 0.6), radius 0.22
 *   two bezier sides tapering from top to tangent of circle
 */
function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4)

  // Background fill
  const bg = [17, 24, 39, 255]
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4]     = bg[0]
    pixels[i * 4 + 1] = bg[1]
    pixels[i * 4 + 2] = bg[2]
    pixels[i * 4 + 3] = bg[3]
  }

  // Rounded-rect mask (for non-maskable icons) — corner radius ~21%
  const r = size * 0.21
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.max(r - x, 0, x - (size - 1 - r))
      const dy = Math.max(r - y, 0, y - (size - 1 - r))
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > r + 0.5) {
        // Outside rounded rect — transparent
        pixels[(y * size + x) * 4 + 3] = 0
      }
    }
  }

  // Fuel-drop shape — scan-line fill with anti-aliasing
  // Parametric: drop tip at top, circular base
  const cx = size * 0.5    // circle centre x
  const cy = size * 0.595  // circle centre y
  const cr = size * 0.215  // circle radius
  const tx = size * 0.5    // tip x
  const ty = size * 0.185  // tip y

  // For each pixel, check if inside fuel drop
  // Drop = union of:
  //   - circle: (x-cx)^2 + (y-cy)^2 <= cr^2
  //   - triangle-ish region above circle (bezier approximation as lines)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = pixels[(y * size + x) * 4 + 3]
      if (px === 0) continue  // already outside rounded rect

      const fx = x + 0.5
      const fy = y + 0.5

      let coverage = 0

      // Anti-aliasing: sample 4 sub-pixels
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const spx = fx - 0.25 + sx * 0.5
          const spy = fy - 0.25 + sy * 0.5

          let inside = false

          // Circle test
          const dcx = spx - cx
          const dcy = spy - cy
          if (dcx * dcx + dcy * dcy <= cr * cr) {
            inside = true
          }

          // Upper region: above circle centre, between the two sides
          // Left side: line from (tx, ty) to left tangent (cx - cr * 0.85, cy - cr * 0.53)
          // Right side: line from (tx, ty) to right tangent (cx + cr * 0.85, cy - cr * 0.53)
          if (!inside && spy < cy) {
            const lx1 = tx, ly1 = ty
            const lx2 = cx - cr * 0.85, ly2 = cy - cr * 0.53
            const rx1 = tx, ry1 = ty
            const rx2 = cx + cr * 0.85, ry2 = cy - cr * 0.53

            // x of left side at this y
            const leftX = ly2 === ly1 ? lx1 : lx1 + (lx2 - lx1) * (spy - ly1) / (ly2 - ly1)
            // x of right side at this y
            const rightX = ry2 === ry1 ? rx1 : rx1 + (rx2 - rx1) * (spy - ry1) / (ry2 - ry1)

            if (spy >= ty && spx >= leftX && spx <= rightX) {
              inside = true
            }
          }

          if (inside) coverage++
        }
      }

      if (coverage > 0) {
        const alpha = coverage / 4
        const i = (y * size + x) * 4
        // Blend white drop over existing background
        pixels[i]     = Math.round(249 * alpha + pixels[i]     * (1 - alpha))
        pixels[i + 1] = Math.round(250 * alpha + pixels[i + 1] * (1 - alpha))
        pixels[i + 2] = Math.round(251 * alpha + pixels[i + 2] * (1 - alpha))
        // Keep existing alpha (already set by rounded-rect pass)
      }
    }
  }

  return pixels
}

// ─── ICO builder (single 32x32 PNG inside) ───────────────────────────────────

function buildICO(pngBytes) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)  // reserved
  header.writeUInt16LE(1, 2)  // type: ICO
  header.writeUInt16LE(1, 4)  // number of images

  const entry = Buffer.alloc(16)
  entry[0] = 32  // width (0 = 256)
  entry[1] = 32  // height
  entry[2] = 0   // color count
  entry[3] = 0   // reserved
  entry.writeUInt16LE(1, 4)  // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(pngBytes.length, 8)  // size of image data
  entry.writeUInt32LE(6 + 16, 12)          // offset of image data

  return Buffer.concat([header, entry, pngBytes])
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
const publicDir = path.join(__dirname, '..', 'public')

fs.mkdirSync(iconsDir, { recursive: true })

const sizes = [
  { name: 'icon-192.png',         size: 192, dir: iconsDir },
  { name: 'icon-512.png',         size: 512, dir: iconsDir },
  { name: 'apple-touch-icon.png', size: 180, dir: iconsDir },
]

for (const { name, size, dir } of sizes) {
  const pixels = renderIcon(size)
  const png = buildPNG(size, size, pixels)
  const out = path.join(dir, name)
  fs.writeFileSync(out, png)
  console.log(`  ${out}  (${png.length} bytes)`)
}

// favicon.ico — 32×32 PNG wrapped in ICO
const fav32 = renderIcon(32)
const fav32png = buildPNG(32, 32, fav32)
const ico = buildICO(fav32png)
const icoOut = path.join(publicDir, 'favicon.ico')
fs.writeFileSync(icoOut, ico)
console.log(`  ${icoOut}  (${ico.length} bytes)`)

console.log('Done.')
