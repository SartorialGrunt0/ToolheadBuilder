/**
 * Image optimization script using Sharp.
 *
 * Converts PNG / JPG / GIF images in public/ to WebP (animated WebP for GIFs).
 * Resizes anything wider than MAX_WIDTH while keeping aspect ratio.
 * Skips files that are already WebP, SVG, or AVIF.
 *
 * Usage:  node scripts/optimize-images.mjs
 */

import sharp from 'sharp';
import { readdir, stat, unlink, rename } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

const PUBLIC_DIR = 'public';
const MAX_WIDTH = 1200;          // px – resize anything wider
const WEBP_QUALITY = 80;         // 0-100
const SKIP_EXTENSIONS = new Set(['.svg', '.avif', '.webp']);

async function optimize() {
  const files = await readdir(PUBLIC_DIR);
  const images = files.filter((f) => {
    const ext = extname(f).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif'].includes(ext);
  });

  if (images.length === 0) {
    console.log('No images to optimize.');
    return;
  }

  console.log(`Found ${images.length} images to optimize.\n`);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of images) {
    const src = join(PUBLIC_DIR, file);
    const ext = extname(file).toLowerCase();
    const base = basename(file, extname(file));
    const dest = join(PUBLIC_DIR, `${base}.webp`);

    const before = (await stat(src)).size;
    totalBefore += before;

    try {
      let pipeline = sharp(src, { animated: ext === '.gif' });

      // Resize if wider than MAX_WIDTH (preserve aspect ratio)
      const meta = await pipeline.metadata();
      if (meta.width && meta.width > MAX_WIDTH) {
        pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
      }

      await pipeline
        .webp({ quality: WEBP_QUALITY })
        .toFile(dest);

      const after = (await stat(dest)).size;
      totalAfter += after;

      const pct = ((1 - after / before) * 100).toFixed(1);
      console.log(
        `  ${file} → ${base}.webp  (${fmt(before)} → ${fmt(after)}, -${pct}%)`
      );

      // Remove original
      await unlink(src);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  console.log(
    `\nDone. ${fmt(totalBefore)} → ${fmt(totalAfter)}  (saved ${fmt(totalBefore - totalAfter)}, -${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%)`
  );
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

optimize();
