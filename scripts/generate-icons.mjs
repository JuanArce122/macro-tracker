/**
 * Genera los íconos de la app a partir del SVG fuente editorial.
 *
 * Concepto: círculo con 3 barras horizontales descendentes (proteína /
 * carbos / grasa). Paleta tinta + crema + terracota, coherente con el
 * sistema de diseño.
 *
 *   - Fondo:    #0F0F0F (tinta absoluta)
 *   - Trazo:    #F5F1EA (crema, --bg-primary)
 *   - Acento:   #C66B4A (terracota, --accent-warm) — solo barra superior
 *
 * Uso:
 *   node scripts/generate-icons.mjs
 *
 * Salida (public/):
 *   icon.svg, favicon.ico, favicon-16x16.png, favicon-32x32.png,
 *   apple-touch-icon.png (180), icon-192.png, icon-512.png,
 *   icon-maskable-192.png, icon-maskable-512.png
 */

import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFile } from "node:fs/promises";

/* ─── SVG fuente ───────────────────────────────────────────────────── */

// Versión con esquinas redondeadas tipo iOS (squircle aproximado con rx=230).
// Contenido al 100% del cuadro (cubre todo).
const svgRounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="230" ry="230" fill="#0F0F0F"/>
  <g transform="translate(512 512) scale(7.2) translate(-60 -60)">
    <circle cx="60" cy="60" r="50" fill="none" stroke="#F5F1EA" stroke-width="3"/>
    <rect x="30" y="40" width="60" height="7" rx="3.5" fill="#C66B4A"/>
    <rect x="35" y="56" width="50" height="7" rx="3.5" fill="#F5F1EA"/>
    <rect x="40" y="72" width="40" height="7" rx="3.5" fill="#F5F1EA"/>
  </g>
</svg>`;

// Versión maskable: fondo plano (sin radius), contenido al 80% — Android
// puede recortar los bordes externos así que el círculo + barras viven en
// el safe-zone central.
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#0F0F0F"/>
  <g transform="translate(512 512) scale(5.76) translate(-60 -60)">
    <circle cx="60" cy="60" r="50" fill="none" stroke="#F5F1EA" stroke-width="3"/>
    <rect x="30" y="40" width="60" height="7" rx="3.5" fill="#C66B4A"/>
    <rect x="35" y="56" width="50" height="7" rx="3.5" fill="#F5F1EA"/>
    <rect x="40" y="72" width="40" height="7" rx="3.5" fill="#F5F1EA"/>
  </g>
</svg>`;

// Versión pequeña: barras un poco más gruesas (height=9, rx=4.5) para que
// se lean a 16/32 px. El círculo también con stroke-width=5.
const svgSmall = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="230" ry="230" fill="#0F0F0F"/>
  <g transform="translate(512 512) scale(7.2) translate(-60 -60)">
    <circle cx="60" cy="60" r="50" fill="none" stroke="#F5F1EA" stroke-width="5"/>
    <rect x="30" y="39" width="60" height="9" rx="4.5" fill="#C66B4A"/>
    <rect x="35" y="55" width="50" height="9" rx="4.5" fill="#F5F1EA"/>
    <rect x="40" y="71" width="40" height="9" rx="4.5" fill="#F5F1EA"/>
  </g>
</svg>`;

/* ─── Definición de exports ────────────────────────────────────────── */

const targets = [
  { name: "favicon-16x16.png",      svg: svgSmall,    size: 16  },
  { name: "favicon-32x32.png",      svg: svgSmall,    size: 32  },
  { name: "apple-touch-icon.png",   svg: svgRounded,  size: 180 },
  { name: "icon-192.png",           svg: svgRounded,  size: 192 },
  { name: "icon-512.png",           svg: svgRounded,  size: 512 },
  { name: "icon-maskable-192.png",  svg: svgMaskable, size: 192 },
  { name: "icon-maskable-512.png",  svg: svgMaskable, size: 512 },
];

async function generate() {
  // PNGs
  for (const { name, svg, size } of targets) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(`public/${name}`);
    console.log(`✓ public/${name} (${size}×${size})`);
  }

  // SVG fuente (servible directamente en navegadores modernos)
  await writeFile("public/icon.svg", svgRounded);
  console.log("✓ public/icon.svg");

  // favicon.ico multi-resolución 16+32+48 (combina 3 PNGs en un .ico)
  const pngs = await Promise.all(
    [16, 32, 48].map((s) =>
      sharp(Buffer.from(svgSmall)).resize(s, s).png().toBuffer()
    )
  );
  const ico = await pngToIco(pngs);
  await writeFile("public/favicon.ico", ico);
  console.log("✓ public/favicon.ico (16+32+48)");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
