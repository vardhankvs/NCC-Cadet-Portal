// src_stable/features/Engagement/cadetContextBuilder.js
/**
 * Utility to extract live user/cadet performance metrics and build:
 * 1. Customized context prompt for Vanguard AI (Groq API System Prompt injection)
 * 2. YouTube Studio-style prompt suggestion categories tailored to the user's active profile.
 */

export const buildCadetContextPrompt = ({
    userRole,
    userName,
    userEnrollmentId,
    userInstitutionId,
    cadets = [],
    attendanceData = {},
    camps = [],
    grievances = [],
    quizAttempts = []
}) => {
    if (userRole !== 'cadet') {
        const totalCadets = cadets.length;
        const avgAtt = attendanceData?.overallAverage || 0;
        const pendingGrievances = (grievances || []).filter(g => g.status === 'pending' || g.status === 'Open').length;

        return `
=== CURRENT LOGGED-IN USER CONTEXT (ADMIN / OFFICER) ===
- Name: ${userName || 'Officer'}
- Role: ${userRole ? userRole.toUpperCase() : 'ADMIN'}
- Unit/Institution ID: ${userInstitutionId || '14a-bn-srikakulam'}
- Total Unit Cadets: ${totalCadets}
- Unit Attendance Average: ${avgAtt}%
- Pending Grievances: ${pendingGrievances}
========================================================
INSTRUCTION: You are speaking to an NCC Officer / Administrator. Provide concise unit insights, administrative support, and defense leadership guidance.`;
    }

    // Robust multi-criteria lookup for current cadet (works for ALL cadet accounts)
    const normId = String(userEnrollmentId || '').trim().toUpperCase();
    const normName = String(userName || '').trim().toLowerCase();

    const currentCadet = cadets.find(c => {
        const cId = String(c.enrollmentId || c.regimentalNumber || c.regNo || '').trim().toUpperCase();
        if (normId && cId === normId) return true;
        if (normId && (cId.includes(normId) || normId.includes(cId))) return true;
        if (normName && String(c.name || '').trim().toLowerCase() === normName) return true;
        return false;
    }) || cadets.find(c => normName && String(c.name || '').toLowerCase().includes(normName)) || cadets[0] || {};

    const name = currentCadet.name || userName || 'Cadet';
    const regNo = currentCadet.enrollmentId || userEnrollmentId || 'N/A';
    const rank = currentCadet.rank || 'Cadet (CDT)';
    const cert = currentCadet.currentCertificate || currentCadet.certificate || 'B Certificate';
    const company = currentCadet.company || currentCadet.platoon || 'Alpha Co';
    const unit = currentCadet.institutionId || userInstitutionId || '14(A) BN NCC';

    // Attendance breakdown
    const personalAtt = attendanceData?.personalSummary || 
        (attendanceData?.individualSummaries || []).find(s => {
            const sId = String(s.enrollmentId || '').trim().toUpperCase();
            return sId && (sId === normId || (regNo && sId === String(regNo).toUpperCase()));
        });
    
    const attPct = personalAtt?.percentage ?? personalAtt?.attendancePercentage ?? currentCadet.attendancePercentage ?? 0;
    const presentCount = personalAtt?.presentCount ?? personalAtt?.attendancePresentCount ?? 0;
    const totalPeriods = personalAtt?.totalPeriods ?? personalAtt?.attendanceTotalPeriods ?? 0;
    const cutoffMet = attPct >= 75 ? 'YES (Eligible for exams/camps)' : 'NO (Below 75% cutoff - needs improvement)';

    // Camps analysis
    const userCamps = camps.filter(camp => {
        const isRegistered = camp.registeredCadets && (
            camp.registeredCadets.includes(regNo) || 
            camp.registeredCadets.some(r => typeof r === 'string' && r.toUpperCase() === normId)
        );
        const isAttended = currentCadet.campHistory && currentCadet.campHistory.some(ch => 
            (typeof ch === 'string' && ch.toLowerCase().includes(camp.name?.toLowerCase())) ||
            (ch.name && ch.name.toLowerCase().includes(camp.name?.toLowerCase()))
        );
        return isRegistered || isAttended;
    });
    const campCount = userCamps.length || (currentCadet.campHistory?.length || 0);
    const campNames = userCamps.map(c => c.name || c.title).slice(0, 3).join(', ') || 'No camps registered yet';

    // PFT Fitness Score
    const pftScore = currentCadet.pftScore || currentCadet.fitnessScore || currentCadet.pftGrade || 'Not Evaluated';

    // Mock Exam Performance
    const userQuizzes = (quizAttempts || []).filter(q => {
        const qId = String(q.cadetReg || q.cadetId || '').trim().toUpperCase();
        return qId && (qId === normId || (regNo && qId === String(regNo).toUpperCase()));
    });
    const lastQuiz = userQuizzes.length > 0 ? userQuizzes[userQuizzes.length - 1] : null;
    const lastQuizScore = lastQuiz ? `${lastQuiz.score}/${lastQuiz.totalQuestions || lastQuiz.maxScore} (${Math.round((lastQuiz.score/(lastQuiz.totalQuestions||1))*100)}%)` : 'No mock tests taken yet';



    // Next Rank Target calculation
    const nextRankMap = {
        'Cadet': 'Lance Corporal (L/Cpl)',
        'Cadet (CDT)': 'Lance Corporal (L/Cpl)',
        'CDT': 'Lance Corporal (L/Cpl)',
        'Lance Corporal': 'Corporal (Cpl)',
        'Lance Corporal (L/Cpl)': 'Corporal (Cpl)',
        'L/CPL': 'Corporal (Cpl)',
        'Corporal': 'Sergeant (Sgt)',
        'Corporal (Cpl)': 'Sergeant (Sgt)',
        'CPL': 'Sergeant (Sgt)',
        'Sergeant': 'Company Quartermaster Sergeant (CQMS)',
        'Sergeant (Sgt)': 'Company Quartermaster Sergeant (CQMS)',
        'SGT': 'Company Quartermaster Sergeant (CQMS)',
        'Company Quartermaster Sergeant': 'Under Officer (UO)',
        'Company Quartermaster Sergeant (CQMS)': 'Under Officer (UO)',
        'CQMS': 'Under Officer (UO)',
        'Company Sergeant Major (CSM)': 'Under Officer (UO)',
        'Under Officer': 'Senior Under Officer (SUO)',
        'Under Officer (UO)': 'Senior Under Officer (SUO)',
        'UO': 'Senior Under Officer (SUO)',
        'Senior Under Officer': 'Highest Cadet Rank Achieved (SUO)',
        'Senior Under Officer (SUO)': 'Highest Cadet Rank Achieved (SUO)',
        'SUO': 'Highest Cadet Rank Achieved (SUO)'
    };
    const nextRank = nextRankMap[rank] || 'Under Officer (UO)';

    const kitSizes = currentCadet.shirtSize || currentCadet.pantSize || currentCadet.shoeSize 
        ? `Shirt: ${currentCadet.shirtSize || '38'}, Pant: ${currentCadet.pantSize || '32'}, Boot: ${currentCadet.shoeSize || '8'}`
        : 'Shirt: 38/M, Pant: 32, Boot: 8 (Default recommendations)';

    return `
=== CURRENT LOGGED-IN CADET PROFILE CONTEXT ===
- Cadet Name: ${name}
- Regimental / Enrollment ID: ${regNo}
- Current Rank: ${rank}
- Next Rank Target: ${nextRank}
- Certificate Track: ${cert}
- Unit / Company: ${unit} (${company})
- Parade Attendance: ${attPct}% (${presentCount} present out of ${totalPeriods} parades held)
- Exam Eligibility Cutoff Status: ${cutoffMet}
- Camps Recorded: ${campCount} camp(s) [${campNames}]
- Physical Fitness (PFT) Status: ${pftScore}
- Recent Mock Exam Score: ${lastQuizScore}
- Uniform Kit Sizes: ${kitSizes}

================================================
CRITICAL PERSONALIZATION MANDATE:
When the cadet asks to summarize their performance, attendance, camps, rank, or exam eligibility:
YOU MUST EXTRACT AND DISPLAY THEIR ACTUAL NUMBERS & METRICS DIRECTLY FROM THE "CURRENT LOGGED-IN CADET PROFILE CONTEXT" ABOVE!

DO NOT give generic portal navigation advice (such as "visit My Hub") when asked for performance or attendance summary. Present exact metrics clearly using Markdown bolding and bullet points! Address them as "${name}" or "${rank}".`;
};

/**
 * Generate YouTube Studio-style categorized prompt suggestions based on live cadet metrics.
 */
export const getSuggestionLibrary = ({
    userRole,
    userName,
    userEnrollmentId,
    cadets = [],
    attendanceData = {},
    camps = []
}) => {
    const normId = String(userEnrollmentId || '').trim().toUpperCase();
    const currentCadet = cadets.find(c => String(c.enrollmentId || c.regNo || '').trim().toUpperCase() === normId) || {};
    
    const personalAtt = attendanceData?.personalSummary || 
        (attendanceData?.individualSummaries || []).find(s => String(s.enrollmentId || '').trim().toUpperCase() === normId);
    
    const attPct = personalAtt?.percentage ?? currentCadet.attendancePercentage ?? 75;

    // Dynamic personalized prompts
    const personalizedPrompts = [
        `Summarize my overall performance & attendance (${attPct}%)`,
        attPct < 75 
            ? `How can I raise my ${attPct}% attendance to meet the 75% exam cutoff?` 
            : `Am I eligible for 'C' Certificate exam with my ${attPct}% attendance?`,
        `Check my registered camps and camp history`,
        `How do I prepare for my next Rank promotion?`,
        `Review my PFT fitness score and improvement tips`
    ];

    return [
        {
            category: "Personalized for You",
            icon: "Sparkles",
            badge: "LIVE PROFILE",
            description: "Tailored insights built from your active cadet performance",
            suggestions: personalizedPrompts
        },
        {
            category: "Catch up on Profile & Performance",
            icon: "User",
            description: "Attendance rules, eligibility, rank structure and fitness",
            suggestions: [
                "Summarize my attendance & performance record",
                "What are the minimum eligibility criteria for 'B' & 'C' certificate exams?",
                "How does the NCC rank promotion system work from Cadet to SUO?",
                "What fitness standards are required in PFT (Physical Fitness Test)?",
                "How do I submit a leave application when absent from parade?"
            ]
        },
        {
            category: "Camps & Training Guidance",
            icon: "Compass",
            description: "RDC, TSC, ATC, NIC and international YEP camps",
            suggestions: [
                "What happens at Republic Day Camp (RDC) in New Delhi?",
                "How do I get selected for Thal Sainik Camp (TSC)?",
                "What is the syllabus covered in Annual Training Camp (ATC)?",
                "Tell me about National Integration Camp (NIC) & Trekking camps",
                "What is Youth Exchange Programme (YEP) and how to qualify?"
            ]
        },
        {
            category: "Exams & Study Guide",
            icon: "BookOpen",
            description: "Weapons, drill commands, map reading, compass bearings, and first aid syllabus",
            suggestions: [
                "How to read a 6-figure grid reference on a topographic map?",
                "Generate a quick 5-question drill command quiz for me",
                "What are the technical specs of .22 Deluxe Rifle & 5.56mm INSAS?",
                "How to read a 6-figure grid reference on a topographic map?",
                "What are the 5 'C's of Camouflage & Concealment in Field Craft?",
                "Explain the ABC rule of First Aid & CPR procedures"
            ]
        },
        {
            category: "SSB & Defence Career",
            icon: "Shield",
            description: "SSB 5-day interview, OLQs, UPSC exemptions and bonus marks",
            suggestions: [
                "What are the 15 Officer Like Qualities (OLQs) evaluated in SSB?",
                "What direct entry benefits do NCC 'C' certificate holders get in CDS/UPSC?",
                "Explain the 5-day SSB interview process step-by-step",
                "How do I prepare for Picture Perception & Discussion Test (PP&DT)?",
                "What topics are asked in the SSB Personal Interview & Lecturette?"
            ]
        },
        {
            category: "Portal Navigation & Tools",
            icon: "HelpCircle",
            description: "How to use Vanguard portal features & services",
            suggestions: [
                "Where can I find my kit size recommendations?",
                "How do I attempt mock exams on this portal?",
                "How to request blood donation in Blood Registry?",
                "Where can I report a grievance or technical issue?",
                "How to download certificate study materials from Digital Library?"
            ]
        }
    ];
};
