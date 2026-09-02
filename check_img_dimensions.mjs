import fs from 'fs';

const buf = fs.readFileSync('e:\\NCC\\src_stable\\assets\\ncc_logo.png');

// Check PNG dimensions from header
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);

console.log(`Dimensions: ${width} x ${height}`);
console.log(`Aspect ratio (W:H): ${(width / height).toFixed(3)}`);
