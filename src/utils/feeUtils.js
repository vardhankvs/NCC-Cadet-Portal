// src/utils/feeUtils.js

/**
 * Formats a raw number amount into an Indian Rupee string.
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
    // Check for NaN since it can result from bad data calculation
    if (typeof amount !== 'number' || isNaN(amount)) return '₹ N/A';
    return `₹ ${amount.toLocaleString('en-IN')}`;
};

/**
 * Calculates the amount due (Total - Paid).
 * @param {number} total - The total required fee.
 * @param {number} paid - The amount already paid.
 * @returns {number} The due amount.
 */
export const calculateDue = (total, paid) => {
    if (typeof total !== 'number' || typeof paid !== 'number') return NaN;
    return total - paid;
};
