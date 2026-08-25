// src_stable/utils/notificationSound.js
// Custom Official Branded Notification Sound Utility for NCC Portal
// Plays the uploaded energetic defence audio ("Jai Hind!") across all accounts & roles

let cachedBuffer = null;
let audioCtx = null;
let rawAudioArrayBuffer = null;
let isFetchingRaw = false;

const SOUND_URLS = [
    '/sounds/ncc_notification.mp3',
    '/sounds/ncc_notification.wav',
    '/sounds/ncc_notification.ogg',
    '/sounds/ncc_notification.webm'
];

// Lazily get or create AudioContext ONLY when allowed
const getAudioCtx = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtx || audioCtx.state === 'closed') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        audioCtx = new AudioContextClass();
    }
    return audioCtx;
};

// Pre-fetch the raw audio file into memory over HTTP without touching AudioContext
const fetchRawAudio = async () => {
    if (rawAudioArrayBuffer || isFetchingRaw) return;
    isFetchingRaw = true;

    try {
        for (const url of SOUND_URLS) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    rawAudioArrayBuffer = await res.arrayBuffer();
                    break;
                }
            } catch (err) {
                // Try next URL format
            }
        }
    } catch (e) {
        // Silent catch
    } finally {
        isFetchingRaw = false;
    }
};

// Decode raw bytes into Web Audio Buffer once AudioContext is initialized
const decodeIntoBuffer = async () => {
    if (cachedBuffer) return cachedBuffer;
    if (!rawAudioArrayBuffer) {
        await fetchRawAudio();
    }
    if (!rawAudioArrayBuffer) return null;

    try {
        const ctx = getAudioCtx();
        if (!ctx) return null;
        cachedBuffer = await ctx.decodeAudioData(rawAudioArrayBuffer.slice(0));
        return cachedBuffer;
    } catch (e) {
        return null;
    }
};

// Unlock Web Audio API strictly upon a valid user gesture
if (typeof window !== 'undefined') {
    // Silently pre-fetch network asset
    fetchRawAudio();

    const handleUserGesture = async () => {
        try {
            const ctx = getAudioCtx();
            if (ctx && ctx.state === 'suspended') {
                await ctx.resume().catch(() => {});
            }
            await decodeIntoBuffer().catch(() => {});
        } catch (e) {
            // Ignore gesture resume errors
        }
    };

    const GESTURE_EVENTS = ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'];
    const onGesture = () => {
        handleUserGesture();
        // Remove gesture listeners once unlocked
        GESTURE_EVENTS.forEach(evt => window.removeEventListener(evt, onGesture));
    };

    GESTURE_EVENTS.forEach(evt => {
        window.addEventListener(evt, onGesture, { passive: true, once: false });
    });

    // Listen for Service Worker postMessage bridge (for background mobile push events)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'PLAY_NCC_SOUND') {
                playNccNotificationSound();
            }
        });
    }
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

            let buffer = cachedBuffer;
            if (!buffer) {
                buffer = await decodeIntoBuffer();
            }

            if (buffer) {
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(0);
                return;
            }
        }

        // Fallback: HTML5 Audio
        for (const url of SOUND_URLS) {
            try {
                const audio = new Audio(url);
                audio.volume = 1.0;
                const p = audio.play();
                if (p !== undefined) {
                    await p;
                    return;
                }
            } catch (err) {
                // Try next format
            }
        }
    } catch (err) {
        // Fallback silently
    }
};
