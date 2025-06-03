/**
 * Calculate the total number of matches needed for a tournament
 * @param {number} participantCount - Number of participants
 * @returns {number} Total matches needed
 */
export function calculateTotalMatches(participantCount) {
    return participantCount > 0 ? participantCount - 1 : 0;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array
 */
export function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Create a tournament bracket with proper seeding
 * @param {Array} tasksList - List of tasks/participants
 * @returns {Array} Tournament bracket structure
 */
export function createTournamentBracket(tasksList) {
    if (!tasksList || tasksList.length < 2) {
        throw new Error('At least 2 participants required for tournament');
    }

    const bracket = [];
    
    // Calculate bracket size (power of 2)
    const participantCount = tasksList.length;
    let bracketSize = 1;
    while (bracketSize < participantCount) {
        bracketSize *= 2;
    }
    
    // Create seeded participant list with proper tournament seeding
    const seededParticipants = [];
    
    // Fill bracket with participants and nulls for byes
    for (let i = 0; i < bracketSize; i++) {
        seededParticipants.push(i < tasksList.length ? tasksList[i] : null);
    }
    
    // Apply tournament seeding pattern (1 vs last, 2 vs second-to-last, etc.)
    const firstRound = [];
    for (let i = 0; i < bracketSize / 2; i++) {
        const topSeed = seededParticipants[i];
        const bottomSeed = seededParticipants[bracketSize - 1 - i];
        
        firstRound.push({
            teams: [topSeed, bottomSeed],
            winner: null
        });
    }
    
    bracket.push(firstRound);
    
    // Create subsequent rounds
    let matchesInRound = bracketSize / 4;
    while (matchesInRound >= 1) {
        const round = [];
        for (let i = 0; i < matchesInRound; i++) {
            round.push({
                teams: [null, null],
                winner: null
            });
        }
        bracket.push(round);
        matchesInRound /= 2;
    }
    
    return bracket;
}

/**
 * Get the current matchup from bracket state
 * @param {Array} bracket - Tournament bracket
 * @param {number} currentRound - Current round index
 * @param {number} currentMatchup - Current matchup index
 * @returns {Array} [task1, task2] or [null, null] if invalid
 */
export function getCurrentMatchup(bracket, currentRound, currentMatchup) {
    if (!bracket || bracket.length === 0 || 
        currentRound >= bracket.length || 
        currentMatchup >= bracket[currentRound].length) {
        return [null, null];
    }
    
    return bracket[currentRound][currentMatchup].teams;
}

/**
 * Advance a winner to the next round
 * @param {Array} bracket - Tournament bracket (mutated)
 * @param {Object} winner - Winning task/participant
 * @param {number} currentRound - Current round index
 * @param {number} currentMatchup - Current matchup index
 */
export function advanceWinner(bracket, winner, currentRound, currentMatchup) {
    if (currentRound >= bracket.length - 1) return;
    
    const nextRoundMatchIndex = Math.floor(currentMatchup / 2);
    const nextRoundTeamIndex = currentMatchup % 2;
    
    bracket[currentRound + 1][nextRoundMatchIndex].teams[nextRoundTeamIndex] = winner;
}

/**
 * Check if tournament is complete
 * @param {Array} bracket - Tournament bracket
 * @param {number} currentRound - Current round index
 * @returns {boolean} True if tournament is complete
 */
export function isTournamentComplete(bracket, currentRound) {
    return currentRound >= bracket.length;
}

/**
 * Auto-detect task name column from CSV headers
 * @param {Array} headers - CSV headers
 * @returns {string|null} Best guess for task name column
 */
export function autoDetectTaskNameColumn(headers) {
    if (!headers || headers.length === 0) return null;
    
    // Prioritize keywords in order of preference
    const keywords = ['name', 'title', 'task', 'summary'];
    
    // Look for exact matches first (case insensitive)
    for (const keyword of keywords) {
        const found = headers.find(header => header.toLowerCase() === keyword);
        if (found) return found;
    }
    
    // Look for partial matches, with priority for more specific keywords
    for (const keyword of keywords) {
        const found = headers.find(header => header.toLowerCase().includes(keyword));
        if (found) return found;
    }
    
    return headers[0];
}

/**
 * Auto-select common secondary fields
 * @param {Array} headers - CSV headers
 * @param {string} taskNameColumn - Already selected task name column
 * @param {number} maxFields - Maximum number of fields to select
 * @returns {Array} Array of selected field names
 */
export function autoSelectSecondaryFields(headers, taskNameColumn, maxFields = 4) {
    if (!headers || headers.length === 0) return [];
    
    const commonFields = ['Assignee', 'Status', 'Product area', 'Sprint', 'Priority', 'Due Date'];
    const autoSelectedFields = headers.filter(header => 
        header !== taskNameColumn && 
        commonFields.some(common => header.toLowerCase().includes(common.toLowerCase()))
    );
    
    return autoSelectedFields.slice(0, maxFields);
}

/**
 * Create a double elimination tournament bracket
 * @param {Array} tasksList - List of tasks/participants
 * @returns {Object} Double elimination bracket structure with winners, losers, and finals
 */
export function createDoubleEliminationBracket(tasksList) {
    if (!tasksList || tasksList.length < 2) {
        throw new Error('At least 2 participants required for tournament');
    }

    const participantCount = tasksList.length;
    let bracketSize = 1;
    while (bracketSize < participantCount) {
        bracketSize *= 2;
    }

    // Create seeded participant list with proper tournament seeding
    const seededParticipants = [];
    for (let i = 0; i < bracketSize; i++) {
        seededParticipants.push(i < tasksList.length ? tasksList[i] : null);
    }

    // Winners bracket - same as single elimination
    const winners = [];
    
    // Create first round with proper seeding
    const firstRound = [];
    for (let i = 0; i < bracketSize / 2; i++) {
        const topSeed = seededParticipants[i];
        const bottomSeed = seededParticipants[bracketSize - 1 - i];
        
        firstRound.push({
            teams: [topSeed, bottomSeed],
            winner: null
        });
    }
    winners.push(firstRound);
    
    // Create subsequent winners bracket rounds
    let matchesInRound = bracketSize / 4;
    while (matchesInRound >= 1) {
        const round = [];
        for (let i = 0; i < matchesInRound; i++) {
            round.push({
                teams: [null, null],
                winner: null
            });
        }
        winners.push(round);
        matchesInRound /= 2;
    }

    // Losers bracket - create proper structure based on bracket size
    const losers = [];
    const winnersRounds = winners.length;
    
    // For double elimination, losers bracket follows a specific pattern
    // 4 teams: 3 losers rounds (1,1,1 matches)
    // 8 teams: 5 losers rounds (2,1,2,1,1 matches)
    // 16 teams: 7 losers rounds (4,2,2,1,2,1,1 matches)
    
    let losersRounds;
    let losersMatchPattern;
    
    if (bracketSize === 2) {
        losersRounds = 1;
        losersMatchPattern = [1];
    } else if (bracketSize === 4) {
        losersRounds = 3;
        losersMatchPattern = [1, 1, 1];
    } else if (bracketSize === 8) {
        losersRounds = 5;
        losersMatchPattern = [2, 1, 2, 1, 1];
    } else if (bracketSize === 16) {
        losersRounds = 7;
        losersMatchPattern = [4, 2, 2, 1, 2, 1, 1];
    } else {
        // General formula for larger brackets
        losersRounds = 2 * winnersRounds - 3;
        losersMatchPattern = [];
        for (let i = 0; i < losersRounds; i++) {
            if (i === losersRounds - 1) {
                losersMatchPattern.push(1); // Final round always 1
            } else if (i % 2 === 0) {
                // Even rounds get dropouts from winners
                losersMatchPattern.push(Math.floor(bracketSize / Math.pow(2, Math.floor(i / 2) + 3)));
            } else {
                // Odd rounds consolidate
                losersMatchPattern.push(Math.floor(bracketSize / Math.pow(2, Math.floor(i / 2) + 3)));
            }
        }
    }

    for (let round = 0; round < losersRounds; round++) {
        const roundMatches = [];
        const matchCount = losersMatchPattern[round];
        
        for (let i = 0; i < matchCount; i++) {
            roundMatches.push({
                teams: [null, null],
                winner: null
            });
        }
        losers.push(roundMatches);
    }

    // Finals bracket - grand final and potential reset
    const finals = [
        {
            teams: [null, null], // Winners bracket winner vs Losers bracket winner
            winner: null,
            isGrandFinal: true
        },
        {
            teams: [null, null], // Reset match if needed
            winner: null,
            isReset: true,
            isActive: false
        }
    ];

    // Calculate total matches for double elimination
    // Double elimination requires 2n-1 matches (where n is number of participants)
    const totalMatches = (participantCount * 2) - 1;

    return {
        winners,
        losers,
        finals,
        metadata: {
            participantCount,
            bracketSize,
            winnersRounds,
            losersRounds,
            totalMatches
        }
    };
}

/**
 * Get current matchup from double elimination bracket
 * @param {Object} bracket - Double elimination bracket
 * @param {string} bracketType - 'winners', 'losers', or 'finals'
 * @param {number} round - Round index
 * @param {number} matchIndex - Match index
 * @returns {Array} [team1, team2] or [null, null]
 */
export function getCurrentDoubleEliminationMatchup(bracket, bracketType, round, matchIndex) {
    if (!bracket || !bracket[bracketType]) {
        return [null, null];
    }

    if (bracketType === 'finals') {
        // Finals array is directly an array of matches
        if (matchIndex >= bracket.finals.length) {
            return [null, null];
        }
        return bracket.finals[matchIndex].teams;
    }

    const targetBracket = bracket[bracketType];
    if (round >= targetBracket.length || matchIndex >= targetBracket[round].length) {
        return [null, null];
    }

    return targetBracket[round][matchIndex].teams;
}

/**
 * Advance winner in double elimination tournament
 * @param {Object} bracket - Double elimination bracket (mutated)
 * @param {Object} winner - Winning participant
 * @param {string} bracketType - 'winners', 'losers', or 'finals'
 * @param {number} round - Current round index
 * @param {number} matchIndex - Current match index
 */
export function advanceDoubleEliminationWinner(bracket, winner, bracketType, round, matchIndex) {
    let currentMatch;
    if (bracketType === 'finals') {
        // Finals array is directly an array of matches, not rounds
        currentMatch = bracket.finals[matchIndex];
    } else {
        currentMatch = bracket[bracketType][round][matchIndex];
    }
    
    if (!currentMatch) {
        console.error(`No match found at ${bracketType}[${round}][${matchIndex}]`);
        return;
    }
    
    const [team1, team2] = currentMatch.teams;
    const loser = team1 === winner ? team2 : team1;
    
    currentMatch.winner = winner;

    if (bracketType === 'winners') {
        // Advance winner to next winners round
        if (round < bracket.winners.length - 1) {
            const nextRoundMatchIndex = Math.floor(matchIndex / 2);
            const nextRoundTeamIndex = matchIndex % 2;
            bracket.winners[round + 1][nextRoundMatchIndex].teams[nextRoundTeamIndex] = winner;
        } else {
            // Winners bracket complete - advance to grand final
            bracket.finals[0].teams[0] = winner;
        }
        
        // Send loser to losers bracket
        if (loser !== null) {
            // Map winners round to appropriate losers round
            // Round 0 winners go to Round 0 losers
            // Round 1 winners go to Round 2 losers, etc.
            let losersRoundIndex;
            if (round === 0) {
                losersRoundIndex = 0;
            } else {
                losersRoundIndex = round * 2;
            }
            
            if (losersRoundIndex < bracket.losers.length) {
                // Find appropriate spot in losers bracket
                for (let i = 0; i < bracket.losers[losersRoundIndex].length; i++) {
                    if (bracket.losers[losersRoundIndex][i].teams[0] === null) {
                        bracket.losers[losersRoundIndex][i].teams[0] = loser;
                        break;
                    }
                    if (bracket.losers[losersRoundIndex][i].teams[1] === null) {
                        bracket.losers[losersRoundIndex][i].teams[1] = loser;
                        break;
                    }
                }
            }
        }
    } else if (bracketType === 'losers') {
        // Advance winner to next losers round or finals
        if (round < bracket.losers.length - 1) {
            // Find next available spot in next losers round
            for (let i = 0; i < bracket.losers[round + 1].length; i++) {
                if (bracket.losers[round + 1][i].teams[0] === null) {
                    bracket.losers[round + 1][i].teams[0] = winner;
                    break;
                }
                if (bracket.losers[round + 1][i].teams[1] === null) {
                    bracket.losers[round + 1][i].teams[1] = winner;
                    break;
                }
            }
        } else {
            // Losers bracket complete - advance to grand final
            bracket.finals[0].teams[1] = winner;
        }
        // Loser is eliminated completely
    } else if (bracketType === 'finals') {
        if (matchIndex === 0) { // Grand final
            if (winner === bracket.finals[0].teams[0]) {
                // Winners bracket winner wins - tournament over
                bracket.finals[0].winner = winner;
            } else {
                // Losers bracket winner wins - bracket reset needed
                bracket.finals[0].winner = winner;
                bracket.finals[1].teams = [bracket.finals[0].teams[0], bracket.finals[0].teams[1]];
                bracket.finals[1].isActive = true;
            }
        } else { // Reset match
            bracket.finals[1].winner = winner;
        }
    }
}

/**
 * Check if double elimination tournament is complete
 * @param {Object} bracket - Double elimination bracket
 * @returns {boolean} True if tournament is complete
 */
export function isDoubleEliminationComplete(bracket) {
    // Tournament is complete if:
    // 1. Grand final has a winner and it's the winners bracket team (no reset needed), OR
    // 2. Reset match is active and has a winner
    
    if (bracket.finals[0].winner && bracket.finals[0].winner === bracket.finals[0].teams[0]) {
        // Winners bracket winner won grand final - no reset needed
        return true;
    }
    
    if (bracket.finals[1].isActive && bracket.finals[1].winner) {
        // Reset match was played and completed
        return true;
    }
    
    return false;
}