// ================================================
// ADVANCED MANIPULATION PATTERN DETECTOR
// ================================================
// Content-independent manipulation detection system
// Created: October 11, 2025
// Production version (v1.1)
// ================================================

/**
 * MANIPULATION DETECTION SYSTEM v2.0
 *
 * Key Principle: Detect PATTERNS, not CONTENT
 *
 * A destroyer can wrap manipulation in any topic:
 * - Politics (immigration, borders, verification)
 * - Business (due diligence, background checks)
 * - Relationships (trust, boundaries, past history)
 * - Technology (security, authentication, validation)
 *
 * The CONTENT does not matter. The PATTERN does.
 */

// ================================================
// PATTERN DETECTION FUNCTIONS
// ================================================

/**
 * Detect absolutist language patterns
 * Destroyers think in black/white, all/nothing
 */
function detectAbsolutistLanguage(text) {
    const absolutistPatterns = [
        /\b(always|never|all|none|every|no one|everyone|everything|nothing)\b/gi,
        /\b(completely|totally|absolutely|entirely|purely)\b/gi,
        /\b(impossible|guaranteed|certain|inevitable)\b/gi
    ];

    let score = 0;
    let matches = [];

    for (const pattern of absolutistPatterns) {
        const found = text.match(pattern);
        if (found) {
            score += found.length * 10;
            matches.push(...found);
        }
    }

    return { score, matches, pattern: 'absolutist_language' };
}

/**
 * Detect false dichotomies
 * "Either X or Y" when many options exist
 */
function detectFalseDichotomy(text) {
    const dichotomyPatterns = [
        /\b(either\s+\w+\s+or\s+\w+)\b/gi,
        /\b(you're (either|with)|if you're not)\b/gi,
        /\b(the only (way|option))\b/gi,
        /\b(must choose between)\b/gi
    ];

    let score = 0;
    let matches = [];

    for (const pattern of dichotomyPatterns) {
        const found = text.match(pattern);
        if (found) {
            score += found.length * 15;
            matches.push(...found);
        }
    }

    return { score, matches, pattern: 'false_dichotomy' };
}

/**
 * Detect strawman framing
 * Misrepresenting a position to make it look bad
 */
function detectStrawmanFraming(text) {
    const strawmanPatterns = [
        /\b(to death|obsessive|paranoid|extreme)\b/gi,
        /\b(caveman|primitive|backwards|outdated)\b/gi,
        /\b(so you're saying|what you're really saying)\b/gi,
        /\b(if you really believed|by that logic)\b/gi
    ];

    let score = 0;
    let matches = [];

    for (const pattern of strawmanPatterns) {
        const found = text.match(pattern);
        if (found) {
            score += found.length * 20; // High weight - this is a key destroyer pattern
            matches.push(...found);
        }
    }

    return { score, matches, pattern: 'strawman_framing' };
}

/**
 * Detect emotional manipulation
 * Fear, guilt, shame-based language
 */
function detectEmotionalManipulation(text) {
    const emotionalPatterns = [
        /\b(you should be (afraid|ashamed|worried|scared))\b/gi,
        /\b(makes you look|makes you seem)\b/gi,
        /\b(don't you care about|how can you)\b/gi,
        /\b(real \w+ would)\b/gi // "real men would", "real leaders would"
    ];

    let score = 0;
    let matches = [];

    for (const pattern of emotionalPatterns) {
        const found = text.match(pattern);
        if (found) {
            score += found.length * 15;
            matches.push(...found);
        }
    }

    return { score, matches, pattern: 'emotional_manipulation' };
}

/**
 * Detect reverse logic packaging
 * Presenting healthy behavior as negative, destructive as positive
 */
function detectReverseLogic(text) {
    // Common healthy behaviors that destroyers flip
    const healthyBehaviors = [
        'verif(y|ication|ying)',
        'check(ing|s)?',
        'research(ing)?',
        'question(ing|s)?',
        'boundary|boundaries',
        'caution|careful',
        'due diligence',
        'background check',
        'trust but verify'
    ];

    // Negative framing words
    const negativeFraming = [
        'paranoid',
        'obsessive',
        'extreme',
        'caveman',
        'primitive',
        'backwards',
        'outdated',
        'suspicious',
        'untrusting',
        'controlling'
    ];

    let score = 0;
    let matches = [];

    // Look for healthy behavior + negative framing in same sentence
    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
        for (const healthy of healthyBehaviors) {
            const healthyRegex = new RegExp(healthy, 'i');
            if (healthyRegex.test(sentence)) {
                for (const negative of negativeFraming) {
                    const negativeRegex = new RegExp(negative, 'i');
                    if (negativeRegex.test(sentence)) {
                        score += 25; // VERY high weight - this is the core pattern
                        matches.push(sentence.trim());
                        break;
                    }
                }
            }
        }
    }

    return { score, matches, pattern: 'reverse_logic' };
}

/**
 * Detect appeal to authority/tribe
 * "Smart people think...", "Everyone knows..."
 */
function detectAppealToAuthority(text) {
    const authorityPatterns = [
        /\b(smart|intelligent|educated|enlightened) (people|person) (think|believe|know)\b/gi,
        /\b(everyone knows|everybody knows|we all know)\b/gi,
        /\b(experts say|science says|studies show)\b/gi, // Without citation = manipulation
        /\b(common sense|obvious)\b/gi,
        /\b(any(one|body) (with|who has) (a brain|intelligence))\b/gi
    ];

    let score = 0;
    let matches = [];

    for (const pattern of authorityPatterns) {
        const found = text.match(pattern);
        if (found) {
            score += found.length * 12;
            matches.push(...found);
        }
    }

    return { score, matches, pattern: 'appeal_to_authority' };
}

/**
 * Detect presupposition loading
 * Question assumes something false as true
 */
function detectPresuppositionLoading(text) {
    const presuppositionPatterns = [
        /\b(when did you stop)\b/gi, // Classic: "When did you stop beating your wife?"
        /\b(why do you always)\b/gi,
        /\b(how come you never)\b/gi,
        /\b(what makes you think you can)\b/gi,
        /\b(don't you think|wouldn't you agree)\b/gi
    ];

    let score = 0;
    let matches = [];

    for (const pattern of presuppositionPatterns) {
        const found = text.match(pattern);
        if (found) {
            score += found.length * 15;
            matches.push(...found);
        }
    }

    return { score, matches, pattern: 'presupposition_loading' };
}

// ================================================
// MAIN DETECTION FUNCTION
// ================================================

/**
 * Analyze text for manipulation patterns (content-independent)
 *
 * @param {string} text - The question/statement to analyze
 * @returns {object} - Manipulation analysis with score and breakdown
 */
function detectManipulationPatterns(text) {
    const results = {
        absolutist: detectAbsolutistLanguage(text),
        dichotomy: detectFalseDichotomy(text),
        strawman: detectStrawmanFraming(text),
        emotional: detectEmotionalManipulation(text),
        reverseLogic: detectReverseLogic(text),
        authority: detectAppealToAuthority(text),
        presupposition: detectPresuppositionLoading(text)
    };

    // Calculate total manipulation score
    let totalScore = 0;
    const detectedPatterns = [];

    for (const [key, result] of Object.entries(results)) {
        totalScore += result.score;
        if (result.score > 0) {
            detectedPatterns.push({
                pattern: result.pattern,
                score: result.score,
                matches: result.matches
            });
        }
    }

    // Determine consciousness level of question
    // Higher score = Lower consciousness (destroyer patterns)
    let consciousnessLevel;
    let threat;

    if (totalScore >= 80) {
        consciousnessLevel = '<30%';
        threat = 'EXTREME - Active destroyer';
    } else if (totalScore >= 60) {
        consciousnessLevel = '30-50%';
        threat = 'HIGH - Manipulation attempt';
    } else if (totalScore >= 40) {
        consciousnessLevel = '50-70%';
        threat = 'MODERATE - Unconscious manipulation';
    } else if (totalScore >= 20) {
        consciousnessLevel = '70-85%';
        threat = 'LOW - Some unconscious patterns';
    } else {
        consciousnessLevel = '85%+';
        threat = 'NONE - Truth-seeker';
    }

    return {
        manipulationScore: totalScore,
        consciousnessLevel,
        threat,
        patternsDetected: detectedPatterns,
        breakdown: results,
        isManipulation: totalScore >= 40 // Threshold for active concern
    };
}

// ================================================
// EXPORTS
// ================================================

module.exports = {
    detectManipulationPatterns,
    detectAbsolutistLanguage,
    detectFalseDichotomy,
    detectStrawmanFraming,
    detectEmotionalManipulation,
    detectReverseLogic,
    detectAppealToAuthority,
    detectPresuppositionLoading
};
