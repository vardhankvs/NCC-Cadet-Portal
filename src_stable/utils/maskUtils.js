export const isMaskedValue = (val) => {
    if (!val) return false;
    const str = String(val);
    return str.includes('•') || str.includes('XXXX-XXXX-') || str.includes('******');
};

export const maskEmail = (val) => {
    if (!val) return '';
    if (isMaskedValue(val)) return val;
    return '••••••••@••••.com';
};

export const maskAadhaar = (val) => {
    if (!val) return '';
    if (isMaskedValue(val)) return val;
    return '••••-••••-••••';
};

export const maskPhone = (val) => {
    if (!val) return '';
    if (isMaskedValue(val)) return val;
    return '••••••••••';
};

export const maskAddress = (val) => {
    if (!val) return '';
    if (isMaskedValue(val)) return val;
    return '••••••••••••';
};

export const maskDob = (val) => {
    if (!val) return '';
    if (isMaskedValue(val)) return val;
    return '••••-••-••';
};

export const maskBloodGroup = (val) => {
    if (!val) return '';
    if (isMaskedValue(val)) return val;
    return '••';
};

export const getMaskedCadet = (cadet, currentUserRole, currentUserEnrollmentId) => {
    if (!cadet) return null;
    
    // Officers, Unit Admins, ANOs, Superadmins, Battalion Admins see unmasked details
    const isOfficerOrAdmin = ['admin', 'officer', 'ano', 'superadmin', 'battalion_admin'].includes((currentUserRole || '').toLowerCase());
    
    // Check if the current user is the cadet themselves
    const isSelf = currentUserRole === 'cadet' && 
        String(cadet.enrollmentId || cadet.regimentalNumber || '').trim().toLowerCase() === 
        String(currentUserEnrollmentId || '').trim().toLowerCase();

    if (isOfficerOrAdmin || isSelf) {
        return cadet;
    }
    
    // For ANO / Admin / Officers / Cadets: Mask personal details in UI
    return {
        ...cadet,
        aadhaarNumber: cadet.aadhaarNumber ? maskAadhaar(cadet.aadhaarNumber) : '',
        phonePersonal: (cadet.phonePersonal || cadet.phone) ? maskPhone(cadet.phonePersonal || cadet.phone) : '',
        phone: (cadet.phonePersonal || cadet.phone) ? maskPhone(cadet.phonePersonal || cadet.phone) : '',
        phoneParents: cadet.phoneParents ? maskPhone(cadet.phoneParents) : '',
        addressPresent: (cadet.addressPresent || cadet.address) ? maskAddress(cadet.addressPresent || cadet.address) : '',
        address: (cadet.addressPresent || cadet.address) ? maskAddress(cadet.addressPresent || cadet.address) : '',
        addressPermanent: cadet.addressPermanent ? maskAddress(cadet.addressPermanent) : '',
        personalEmail: cadet.personalEmail ? maskEmail(cadet.personalEmail) : '',
        collegeEmail: cadet.collegeEmail ? maskEmail(cadet.collegeEmail) : '',
        bloodGroup: cadet.bloodGroup ? maskBloodGroup(cadet.bloodGroup) : ''
    };
};
