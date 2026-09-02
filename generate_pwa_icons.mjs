import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImg = 'C:\\Users\\GMRVF\\.gemini\\antigravity-ide\\brain\\0aee0991-da53-4d7c-a1ad-d498c5025a21\\.user_uploaded\\media_1788081277989.png';

async function generateIcons() {
    console.log('Generating pixel-perfect PWA & App Icons with Sharp...');

    const imgBuffer = fs.readFileSync(sourceImg);

    // 1. Standard 512x512 (purpose: "any") - Transparent canvas with emblem scaled to fit naturally
    // Height: 460px, Width: ~306px (exact 2:3 aspect ratio preserved)
    const resized512 = await sharp(imgBuffer)
        .resize({ height: 460, fit: 'inside' })
        .toBuffer();

    await sharp({
        create: {
            width: 512,
            height: 512,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([{ input: resized512, gravity: 'center' }])
    .png()
    .toFile('e:\\NCC\\public\\pwa-512x512.png');
    console.log('Created: public/pwa-512x512.png (512x512 transparent)');

    // 2. Android Maskable 512x512 (purpose: "maskable")
    // Safe-zone for Android adaptive icon is inner 66% (340px circle)
    // We scale the emblem to height 340px so the entire crest & ribbon sit 100% within the safe circle
    const resizedMaskable = await sharp(imgBuffer)
        .resize({ height: 340, fit: 'inside' })
        .toBuffer();

    // Maskable with solid dark navy theme background #0a1628
    await sharp({
        create: {
            width: 512,
            height: 512,
            channels: 4,
            background: { r: 10, g: 22, b: 40, alpha: 1 } // #0a1628
        }
    })
    .composite([{ input: resizedMaskable, gravity: 'center' }])
    .png()
    .toFile('e:\\NCC\\public\\pwa-maskable-512x512.png');
    console.log('Created: public/pwa-maskable-512x512.png (512x512 safe-zone maskable)');

    // 3. 192x192 Icon
    const resized192 = await sharp(imgBuffer)
        .resize({ height: 170, fit: 'inside' })
        .toBuffer();

    await sharp({
        create: {
            width: 192,
            height: 192,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([{ input: resized192, gravity: 'center' }])
    .png()
    .toFile('e:\\NCC\\public\\pwa-192x192.png');
    console.log('Created: public/pwa-192x192.png (192x192 transparent)');

    // 4. Favicon 64x64
    const resized64 = await sharp(imgBuffer)
        .resize({ height: 58, fit: 'inside' })
        .toBuffer();

    await sharp({
        create: {
            width: 64,
            height: 64,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([{ input: resized64, gravity: 'center' }])
    .png()
    .toFile('e:\\NCC\\public\\favicon.png');
    console.log('Created: public/favicon.png (64x64 transparent)');

    // Also copy to dist if dist exists
    const distPublic = 'e:\\NCC\\dist';
    if (fs.existsSync(distPublic)) {
        fs.copyFileSync('e:\\NCC\\public\\pwa-512x512.png', 'e:\\NCC\\dist\\pwa-512x512.png');
        fs.copyFileSync('e:\\NCC\\public\\pwa-maskable-512x512.png', 'e:\\NCC\\dist\\pwa-maskable-512x512.png');
        fs.copyFileSync('e:\\NCC\\public\\pwa-192x192.png', 'e:\\NCC\\dist\\pwa-192x192.png');
        fs.copyFileSync('e:\\NCC\\public\\favicon.png', 'e:\\NCC\\dist\\favicon.png');
    }

    console.log('🎉 All icons created with exact aspect ratio and safe zone margins!');
}

generateIcons().catch(err => {
    console.error(err);
    process.exit(1);
});
