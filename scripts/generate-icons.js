/**
 * Generate PNG icons from SVG source for PWA
 *
 * This script converts the SVG icon to various PNG sizes required for PWA:
 * - 192x192: Standard PWA icon
 * - 512x512: Large PWA icon
 * - 512x512 maskable: Icon with safe zone for adaptive icons
 * - 180x180: Apple touch icon for iOS
 * - 32x32: Favicon
 *
 * Run: node scripts/generate-icons.js
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const publicDir = join(projectRoot, 'public');

// Read the source SVG
const svgPath = join(publicDir, 'pwa-512x512.svg');
const svgBuffer = readFileSync(svgPath);

// Icon configurations
const icons = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
];

// Maskable icon needs extra padding (safe zone is 80% of icon)
// We scale down the content to 80% and add padding
const maskableConfig = {
  name: 'pwa-512x512-maskable.png',
  size: 512,
  isMaskable: true,
};

async function generateIcon(config) {
  const { name, size, isMaskable } = config;
  const outputPath = join(publicDir, name);

  try {
    if (isMaskable) {
      // For maskable icons, we need to ensure the content fits in the safe zone
      // Safe zone is the center 80% circle, so we add padding
      const paddingPercent = 0.1; // 10% padding on each side = 80% content
      const contentSize = Math.round(size * (1 - paddingPercent * 2));
      const padding = Math.round(size * paddingPercent);

      // First resize SVG to content size
      const resized = await sharp(svgBuffer)
        .resize(contentSize, contentSize, { fit: 'contain' })
        .toBuffer();

      // Then extend with background color to add padding
      await sharp(resized)
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: '#1976d2', // Match the SVG background color
        })
        .png()
        .toFile(outputPath);
    } else {
      await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    }

    console.log(`Generated: ${name} (${size}x${size})`);
  } catch (error) {
    console.error(`Failed to generate ${name}:`, error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('Generating PWA icons from SVG...\n');

  // Ensure public directory exists
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  // Generate standard icons
  for (const config of icons) {
    await generateIcon(config);
  }

  // Generate maskable icon
  await generateIcon(maskableConfig);

  console.log('\nAll icons generated successfully!');
}

main();
