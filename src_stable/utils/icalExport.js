// src_stable/utils/icalExport.js
// RFC 5545 compliant iCal (.ics) file generator for NCC Portal events

/**
 * Pad a number to 2 digits
 * @param {number} n
 */
const pad = (n) => String(n).padStart(2, '0');

/**
 * Convert a Date object to iCal DTSTART / DTEND format
 * Format: YYYYMMDDTHHMMSS (local time, no Z)
 * @param {Date} date
 * @param {string} timeStr - "HH:MM" string
 */
const toICalDate = (date, timeStr = '00:00') => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h || 0, m || 0, 0, 0);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
};

/**
 * Escape special chars in iCal text fields
 * @param {string} str
 */
const escapeIcal = (str = '') =>
    str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');

/**
 * Generate a UUID-like string for UID field
 */
const generateUID = () =>
    'ncc-' + Math.random().toString(36).slice(2) + '-' + Date.now() + '@14abn.in';

/**
 * Fold long lines per RFC 5545 (max 75 octets per line)
 * @param {string} line
 */
const foldLine = (line) => {
    if (line.length <= 75) return line;
    const chunks = [];
    chunks.push(line.slice(0, 75));
    let i = 75;
    while (i < line.length) {
        chunks.push(' ' + line.slice(i, i + 74));
        i += 74;
    }
    return chunks.join('\r\n');
};

/**
 * Build a complete iCal (.ics) file string for a single event
 * @param {Object} event - Event object from Firestore
 * @param {{ reminderMinutes?: number }} options
 * @returns {string} - Full .ics file content
 */
export const generateICalEvent = (event, { reminderMinutes = 60 } = {}) => {
    const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
    const startTime = event.time || '06:00';
    const endTime   = event.endTime || event.time || '08:00';

    const dtStart = toICalDate(eventDate, startTime);
    const dtEnd   = toICalDate(eventDate, endTime);
    const now     = toICalDate(new Date(), '00:00').replace('T000000', 'T' + pad(new Date().getHours()) + pad(new Date().getMinutes()) + '00');

    // Parse description from the stored format: "[Type] desc | Time: ... | Dress: ..."
    const rawDesc = event.description || '';
    const cleanDesc = rawDesc
        .replace(/^\[.*?\]\s*/,'')
        .replace(/\|\s*/g, '\n');

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//14(A) BN NCC//NCC Portal//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:14(A) BN NCC - ' + escapeIcal(event.name || 'Event'),
        'X-WR-TIMEZONE:Asia/Kolkata',
        'BEGIN:VEVENT',
        foldLine(`UID:${generateUID()}`),
        `DTSTAMP:${now}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        foldLine(`SUMMARY:${escapeIcal(event.name || 'NCC Event')}`),
        foldLine(`DESCRIPTION:${escapeIcal(cleanDesc || 'NCC Training Event')}`),
        foldLine(`LOCATION:${escapeIcal(event.location || 'Unit Ground, GMRIT')}`),
        `CATEGORIES:NCC,${escapeIcal(event.type || 'Training')}`,
        `STATUS:CONFIRMED`,
        `TRANSP:OPAQUE`,
        // Alarm / Reminder
        `BEGIN:VALARM`,
        `TRIGGER:-PT${reminderMinutes}M`,
        `ACTION:DISPLAY`,
        foldLine(`DESCRIPTION:Reminder: ${escapeIcal(event.name || 'NCC Event')} starts in ${reminderMinutes} minutes at ${escapeIcal(event.location || 'Unit Ground')}`),
        `END:VALARM`,
        `END:VEVENT`,
        `END:VCALENDAR`,
    ];

    return lines.join('\r\n');
};

/**
 * Trigger a browser download of the .ics file
 * @param {Object} event
 * @param {{ reminderMinutes?: number }} options
 */
export const downloadICalFile = (event, options = {}) => {
    const icsContent = generateICalEvent(event, options);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const safeName = (event.name || 'ncc-event').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    a.href     = url;
    a.download = `${safeName}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
