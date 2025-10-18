// Simple script to create placeholder PNG icons for PWA
const fs = require('fs');
const path = require('path');

// Create a simple SVG that can be converted to PNG
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.25}" fill="#3B82F6"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="#1E40AF" opacity="0.3"/>
  <text x="${size/2}" y="${size * 0.7}" font-family="Arial, sans-serif" font-size="${size * 0.55}" font-weight="bold" fill="#FFFFFF" text-anchor="middle">F</text>
</svg>
`;

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create SVG icons for different sizes
[192, 512].forEach(size => {
  const svg = createIconSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(publicDir, filename), svg);
  console.log(`Created ${filename}`);
});

console.log('\n✅ SVG icons created!');
console.log('📝 Note: Chrome prefers PNG icons. Convert these SVGs to PNG for better PWA support.');
console.log('You can use an online converter like https://cloudconvert.com/svg-to-png\n');
