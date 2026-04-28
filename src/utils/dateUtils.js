/**
 * Utility to format dates to DD/MM/YYYY
 * @param {Date | string | number | object} dateInput - The date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    
    let date;
    
    // Handle Firestore Timestamps
    if (dateInput && typeof dateInput === 'object' && 'seconds' in dateInput) {
        date = new Date(dateInput.seconds * 1000);
    } 
    // Handle strings or numbers
    else {
        date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) return 'N/A';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};
