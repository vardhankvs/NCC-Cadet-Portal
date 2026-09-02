import sharp from 'sharp';
import fs from 'fs';

const sourceImg = 'C:\\Users\\GMRVF\\.gemini\\antigravity-ide\\brain\\0aee0991-da53-4d7c-a1ad-d498c5025a21\\.user_uploaded\\media_1788081277989.png';

async function makeWider() {
    const imgBuffer = fs.readFileSync(sourceImg);

    // 1. Widen the base asset horizontally so it has a bolder, wider shield (Width increased by ~25-30%)
    // Original: 682 x 1024 -> Wide version: 860 x 1024
    const wideBaseBuffer = await sharp(imgBuffer)
        .resize({ width: 860, height: 1024, fit: 'fill' })
        .png()
        .toBuffer();

    // Save wide version as primary asset
    fs.writeFileSync('e:\\NCC\\src_stable\\assets\\ncc_logo.png', wideBaseBuffer);
    fs.writeFileSync('e:\\NCC\\src_stable\\assets\\ncc_logo.jpg', wideBaseBuffer);

    // 2. Generate 512x512 PWA Icon (Wide, filling width comfortably)
    // Width: 420px, Height: 500px centered on 512x512 transparent canvas
    const wide512Resized = await sharp(wideBaseBuffer)
        .resize({ width: 420, height: 500, fit: 'inside' })
        .toBuffer();

    await sharp({
        create: {
            width: 512,
            height: 512,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([{ input: wide512Resized, gravity: 'center' }])
    .png()
    .toFile('e:\\NCC\\public\\pwa-512x512.png');

    // 3. Generate 512x512 Maskable Icon for Android Splash Screen
    // For Android splash screen, we want the wide shield to fill the safe area (width: 380px, height: 420px)
    const wideMaskableResized = await sharp(wideBaseBuffer)
        .resize({ width: 380, height: 430, fit: 'inside' })
        .toBuffer();

    await sharp({
        create: {
            width: 512,
            height: 512,
            channels: 4,
            background: { r: 10, g: 22, b: 40, alpha: 1 } // #0a1628
        }
    })
    .composite([{ input: wideMaskableResized, gravity: 'center' }])
    .png()
    .toFile('e:\\NCC\\public\\pwa-maskable-512x512.png');

    // 4. Generate 192x192 Icon (Wide)
    const wide192Resized = await sharp(wideBaseBuffer)
        .resize({ width: 160, height: 180, fit: 'inside' })
        .toBuffer();

    await sharp({
        create: {
            width: 192,
            height: 192,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([{ input: wide192Resized, gravity: 'center' }])
    .png()
    .toFile('e:\\NCC\\public\\pwa-192x192.png');

    // 5. Generate Favicon
    const wideFaviconResized = await sharp(wideBaseBuffer)
        .resize({ width: 54, height: 60, fit: 'inside' })
        .toBuffer();

    await sharp({
        create: {
            width: 64,
            height: 64,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([{ input: wideFaviconResized, gravity: 'center' }])
    .png()
    .toFile('e:\\NCC\\public\\favicon.png');

    console.log('✅ Wide shield logo & PWA icons generated successfully!');
}

makeWider().catch(err => {
    console.error(err);
    process.exit(1);
});
