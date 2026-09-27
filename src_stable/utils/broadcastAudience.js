// src_stable/utils/broadcastAudience.js
/**
 * Utility to match whether a cadet is part of the targeted audience for a broadcast.
 * Supports:
 * - Target Group: 'All' (active cadets only), 'Ex-Cadets' (alumni only), or Company name ('Alpha', 'Bravo', etc.)
 * - Target Certificate: 'All', 'B1', 'B2', 'C', 'A'
 * - Target Division: 'All', 'SD', 'SW'
 * - Specific cadet / enrollment IDs (targeted push / personal alerts)
 * - Multi-tenancy institution check
 */

export const isCadetTargetedByBroadcast = (cadet, broadcast) => {
    if (!cadet || !broadcast) return false;

    // 1. Personal / direct message check
    const broadcastUserId = broadcast.userId ? String(broadcast.userId).trim() : null;
    const broadcastEnrollmentId = broadcast.enrollmentId ? String(broadcast.enrollmentId).trim().toUpperCase() : null;
    const isPersonal = Boolean(broadcastUserId || broadcastEnrollmentId);

    if (isPersonal) {
        const cadetEnrollment = String(cadet.enrollmentId || cadet.regimentalNumber || '').trim().toUpperCase();
        const cadetUid = String(cadet.uid || cadet.id || '').trim();
        const matchesEnrollment = broadcastEnrollmentId && cadetEnrollment && (broadcastEnrollmentId === cadetEnrollment);
        const matchesUserId = broadcastUserId && (broadcastUserId === cadetUid || broadcastUserId === cadetEnrollment);
        return Boolean(matchesEnrollment || matchesUserId);
    }

    // 2. Explicit targeted ID lists if saved
    if (Array.isArray(broadcast.targetEnrollmentIds) && broadcast.targetEnrollmentIds.length > 0) {
        const cEnroll = String(cadet.enrollmentId || cadet.regimentalNumber || '').trim().toUpperCase();
        if (cEnroll && broadcast.targetEnrollmentIds.map(e => String(e).trim().toUpperCase()).includes(cEnroll)) {
            return true;
        }
    }

    if (Array.isArray(broadcast.targetCadetIds) && broadcast.targetCadetIds.length > 0) {
        const cId = String(cadet.id || '').trim();
        const cUid = String(cadet.uid || '').trim();
        if (broadcast.targetCadetIds.some(id => id === cId || id === cUid)) {
            return true;
        }
    }

    if (Array.isArray(broadcast.targetUids) && broadcast.targetUids.length > 0) {
        const cUid = String(cadet.uid || '').trim();
        if (cUid && broadcast.targetUids.includes(cUid)) {
            return true;
        }
    }

    if (Array.isArray(broadcast.targetEmails) && broadcast.targetEmails.length > 0) {
        const cEmail = String(cadet.email || '').trim().toLowerCase();
        if (cEmail && broadcast.targetEmails.map(e => String(e).toLowerCase()).includes(cEmail)) {
            return true;
        }
    }

    // 3. Institution / College Check (if broadcast is scoped to an institution)
    if (broadcast.institutionId && broadcast.institutionId !== 'all' && cadet.institutionId) {
        if (broadcast.institutionId.toLowerCase() !== cadet.institutionId.toLowerCase()) {
            return false;
        }
    }

    // 4. Target Group (Company or Alumni)
    const targetGroup = broadcast.target || 'All';
    const isAlumni = cadet.status === 'alumni';

    if (targetGroup === 'Admin') {
        return false; // Cadets never receive admin-internal broadcasts
    } else if (targetGroup === 'All') {
        // "All" targets active cadets
        if (isAlumni) return false;
    } else if (targetGroup === 'Ex-Cadets') {
        // "Ex-Cadets" only targets alumni
        if (!isAlumni) return false;
    } else {
        // Specific company (e.g. 'Alpha', 'Bravo', 'Charlie', 'Delta')
        if (isAlumni) return false;
        const cadetCompany = String(cadet.company || '').trim().toLowerCase();
        if (cadetCompany !== targetGroup.trim().toLowerCase()) return false;
    }

    // 5. Target Certificate ('All', 'B1', 'B2', 'C', 'A')
    const targetCert = broadcast.targetCertificate || 'All';
    if (targetCert !== 'All') {
        const cadetCert = String(cadet.certificate || cadet.B || cadet.cert || '').trim().toUpperCase();
        if (cadetCert !== targetCert.toUpperCase()) return false;
    }

    // 6. Target Division ('All', 'SD', 'SW')
    const targetDiv = broadcast.targetDivision || 'All';
    if (targetDiv !== 'All') {
        const regNo = String(cadet.enrollmentId || cadet.regimentalNumber || '').toUpperCase();
        const cadetDiv = String(cadet.division || cadet.wing || '').toUpperCase();
        const targetUpper = targetDiv.toUpperCase();
        const matchesDiv = cadetDiv === targetUpper || regNo.includes(targetUpper);
        if (!matchesDiv) return false;
    }

    return true;
};
