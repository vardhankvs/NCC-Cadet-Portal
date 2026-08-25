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

