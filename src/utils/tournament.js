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