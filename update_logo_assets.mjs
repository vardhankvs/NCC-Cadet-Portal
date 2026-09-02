import fs from 'fs';
import path from 'path';

const sourceImg = 'C:\\Users\\GMRVF\\.gemini\\antigravity-ide\\brain\\0aee0991-da53-4d7c-a1ad-d498c5025a21\\.user_uploaded\\media_1788081277989.png';

const targets = [
    'e:\\NCC\\src_stable\\assets\\ncc_logo.png',
    'e:\\NCC\\src_stable\\assets\\ncc_logo.jpg',
    'e:\\NCC\\public\\favicon.png',
    'e:\\NCC\\public\\pwa-192x192.png',
    'e:\\NCC\\public\\pwa-512x512.png'
];

const imgBuffer = fs.readFileSync(sourceImg);

targets.forEach(target => {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(target, imgBuffer);
    console.log(`Updated: ${target}`);
});

console.log('All logo assets updated successfully!');
