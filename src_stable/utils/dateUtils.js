/**
 * Utility to format dates to DD/MM/YYYY
 * @param {Date | string | number | object} dateInput - The date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateInput, fallback = 'N/A') => {
    if (!dateInput) return fallback;
    if (typeof dateInput === 'string' && (dateInput.includes('•') || dateInput.includes('X'))) {
        return dateInput;
    }
    
    // Try parsing string patterns directly to avoid timezone/invalid parsing bugs
    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        if (!trimmed || trimmed.toLowerCase() === 'n/a' || trimmed === '-') {
            return fallback;
        }

        // Match DD-MM-YYYY or DD/MM/YYYY
        const dmyPattern = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
        const dmyMatch = trimmed.match(dmyPattern);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const month = dmyMatch[2].padStart(2, '0');
            const year = dmyMatch[3];
            return `${day}/${month}/${year}`;
        }

        // Match YYYY-MM-DD or YYYY/MM/DD
        const ymdPattern = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
        const ymdMatch = trimmed.match(ymdPattern);
        if (ymdMatch) {
            const year = ymdMatch[1];
            const month = ymdMatch[2].padStart(2, '0');
            const day = ymdMatch[3].padStart(2, '0');
            return `${day}/${month}/${year}`;
        }
    }

    let date;
    
    // Handle Firestore Timestamps
    if (dateInput && typeof dateInput === 'object' && 'seconds' in dateInput) {
        date = new Date(dateInput.seconds * 1000);
    } 
    // Handle strings or numbers
    else {
        date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) return fallback;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

/**
 * Utility to normalize date strings to standard YYYY-MM-DD format
 * @param {Date | string | number | object} dateInput
 * @returns {string} - Standardized YYYY-MM-DD date string
 */
export const normalizeDate = (dateInput) => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        if (!trimmed || trimmed.toLowerCase() === 'n/a' || trimmed === '-') return '';

        // Match YYYY-MM-DD or YYYY/MM/DD
        const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (ymdMatch) {
            const y = ymdMatch[1];
            const m = ymdMatch[2].padStart(2, '0');
            const d = ymdMatch[3].padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        // Match DD-MM-YYYY or DD/MM/YYYY
        const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (dmyMatch) {
            const d = dmyMatch[1].padStart(2, '0');
            const m = dmyMatch[2].padStart(2, '0');
            const y = dmyMatch[3];
            return `${y}-${m}-${d}`;
        }
    }

    let date;
    if (dateInput && typeof dateInput === 'object' && 'seconds' in dateInput) {
        date = new Date(dateInput.seconds * 1000);
    } else {
        date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) return String(dateInput || '').trim();

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Returns today's date in local timezone formatted as YYYY-MM-DD.
 * Avoids UTC offset bugs caused by .toISOString().split('T')[0].
 * @param {Date} [d=new Date()]
 * @returns {string} - YYYY-MM-DD
 */
export const getTodayDateString = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Parses a time string like "09:00", "9:00 AM", "6:30pm", "18:30", "9 AM" to { hours, minutes }
 * @param {string} str
 * @returns {{ hours: number, minutes: number } | null}
 */
export const parseTimeToHoursMinutes = (str) => {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    
    // Match "9:00 AM", "09:00", "9:00am", "6:30 PM", "9am", "9 PM", "06.30"
    const match = trimmed.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*([aApP][mM])?$/);
    if (!match) return null;
    
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const meridian = match[3]?.toUpperCase();

    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return { hours, minutes };
};

/**
 * Returns a robust Date object for display (extracting local year/month/day).
 * @param {Date | string | number | object} dateInput
 * @returns {Date}
 */
export const getEventDisplayDate = (dateInput) => {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput;
    if (typeof dateInput === 'string') {
        const parts = dateInput.split('T')[0].split('-');
        if (parts.length === 3) {
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
    }
    if (dateInput && typeof dateInput === 'object' && 'seconds' in dateInput) {
        return new Date(dateInput.seconds * 1000);
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Returns the Date object representing when an event ends.
 * If an event has a specific end time (e.g. 09:00 on 29th Aug), returns 2026-08-29 09:00:00.
 * If no time is specified, defaults to the end of that day (23:59:59.999).
 * @param {object} event
 * @returns {Date}
 */
export const getEventEndDateTime = (event) => {
    if (!event) return new Date(0);

    // Extract base date
    const rawDate = event.date || event.startDate;
    const baseDate = getEventDisplayDate(rawDate);

    if (isNaN(baseDate.getTime()) || baseDate.getTime() === 0) {
        return new Date(0);
    }

    // Look for end time in event.endTime, event.time, or event.description
    let endTimeStr = null;

    if (event.endTime && typeof event.endTime === 'string') {
        endTimeStr = event.endTime.trim();
    } else if (event.time && typeof event.time === 'string') {
        // Look for end time in range (e.g. "06:30-09:00", "06:30 to 09:00", "6:30 AM - 9:00 AM")
        const rangeMatch = event.time.match(/(?:-|–|to)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:[aApP][mM])?)/i);
        if (rangeMatch) {
            endTimeStr = rangeMatch[1].trim();
        } else {
            endTimeStr = event.time.trim();
        }
    }

    if (!endTimeStr && event.description && typeof event.description === 'string') {
        // Match "Time: 06:30-09:00" or "Time: 06:30 to 09:00" or "Time: 6:30 AM - 9:00 AM"
        const descRangeMatch = event.description.match(/Time:\s*[^|\n]*?(?:-|–|to)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:[aApP][mM])?)/i);
        if (descRangeMatch) {
            endTimeStr = descRangeMatch[1].trim();
        } else {
            // Match "Time: 09:00"
            const descSingleMatch = event.description.match(/Time:\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:[aApP][mM])?)/i);
            if (descSingleMatch) {
                endTimeStr = descSingleMatch[1].trim();
            } else {
                // Generalized fallback: match any "6:30 AM to 9:00 AM" or "06:30-09:00" in description
                const generalRangeMatch = event.description.match(/(\d{1,2}(?:[:.]\d{2})?\s*(?:[aApP][mM])?)\s*(?:-|–|to)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:[aApP][mM])?)/i);
                if (generalRangeMatch) {
                    endTimeStr = generalRangeMatch[2].trim();
                }
            }
        }
    }

    const parsedTime = parseTimeToHoursMinutes(endTimeStr);
    const endDateTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

    if (parsedTime) {
        endDateTime.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    } else {
        // Default to end of day if no specific time is found
        endDateTime.setHours(23, 59, 59, 999);
    }

    return endDateTime;
};

/**
 * Checks if an event has already concluded relative to reference time (defaults to now)
 * @param {object} event
 * @param {Date} [refTime]
 * @returns {boolean}
 */
export const isEventPast = (event, refTime = new Date()) => {
    if (!event) return true;
    const endDateTime = getEventEndDateTime(event);
    if (isNaN(endDateTime.getTime()) || endDateTime.getTime() === 0) return true;
    return refTime.getTime() > endDateTime.getTime();
};


