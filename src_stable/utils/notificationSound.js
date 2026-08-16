// src_stable/utils/notificationSound.js
// Custom Official Branded Notification Sound Utility for NCC Portal
// Plays the uploaded energetic defence audio ("Jai Hind!") across all accounts & roles

let cachedBuffer = null;
let audioCtx = null;
let isPreloading = false;

const getAudioCtx = () => {
    if (!audioCtx || audioCtx.state === 'closed') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
};

// Pre-fetch and decode the uploaded audio file into Web Audio API memory
const preloadAudioBuffer = async () => {
    if (cachedBuffer || isPreloading) return;
    isPreloading = true;

    try {
        const ctx = getAudioCtx();
        if (!ctx) return;

        // Fetch sound from public directory (try mp3, wav, ogg, webm)
        const soundUrls = [
            '/sounds/ncc_notification.mp3',
            '/sounds/ncc_notification.wav',
            '/sounds/ncc_notification.ogg',
            '/sounds/ncc_notification.webm'
        ];

        for (const url of soundUrls) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const arrayBuf = await res.arrayBuffer();
                    cachedBuffer = await ctx.decodeAudioData(arrayBuf);
                    console.log('✅ [NCC Sound] Preloaded official defence notification sound into Web Audio buffer.');
                    break;
                }
            } catch (err) {
                // try next format
            }
        }
    } catch (e) {
        console.warn('⚠️ [NCC Sound] Preload warning:', e);
    } finally {
        isPreloading = false;
    }
};

// Auto-preload on load & unlock Web Audio API on first user gesture
if (typeof window !== 'undefined') {
    preloadAudioBuffer();

    const unlockWebAudio = async () => {
        try {
            const ctx = getAudioCtx();
            if (ctx) {
                if (ctx.state === 'suspended') {
                    await ctx.resume();
                    console.log('✅ [NCC Sound] AudioContext resumed by user gesture. State:', ctx.state);
                }
                preloadAudioBuffer();
            }
        } catch (e) {
            console.warn('[NCC Sound] Unlock error:', e);
        }
    };

    ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(evt => {
        window.addEventListener(evt, unlockWebAudio, { passive: true });
    });
}

/**
 * Play the official NCC energetic defence notification sound ("Jai Hind!")
 * Guaranteed to play for Cadets, ANOs, and Battalion Admins.
 */
export const playNccNotificationSound = async () => {
    try {
        const ctx = getAudioCtx();
        if (ctx) {
            if (ctx.state === 'suspended') {
                await ctx.resume().catch(() => {});
            }

            if (!cachedBuffer && !isPreloading) {
                await preloadAudioBuffer();
            }

            if (cachedBuffer) {
                const source = ctx.createBufferSource();
                source.buffer = cachedBuffer;
                source.connect(ctx.destination);
                source.start(0);
                return;
            }
        }

        // Fallback: HTML5 Audio
        const soundUrls = ['/sounds/ncc_notification.mp3', '/sounds/ncc_notification.wav', '/sounds/ncc_notification.webm'];
        for (const url of soundUrls) {
            try {
                const audio = new Audio(url);
                audio.volume = 1.0;
                const p = audio.play();
                if (p !== undefined) {
                    await p;
                    return;
                }
            } catch (err) {
                // try next format
            }
        }
    } catch (err) {
        console.warn('⚠️ [NCC Sound] Playback error:', err);
    }
};
