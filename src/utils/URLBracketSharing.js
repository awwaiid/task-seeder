/**
 * URL Bracket Sharing Utility - Encodes/decodes bracket data in URLs
 */

export class URLBracketSharing {
    static encodeBracketToURL(bracketData) {
        try {
            // Create a simplified version of the bracket data for URL encoding
            const urlData = {
                n: bracketData.name,
                s: bracketData.status,
                t: bracketData.tournamentType,
                sm: bracketData.seedingMethod,
                tnc: bracketData.taskNameColumn,
                sf: bracketData.selectedSecondaryFields,
                d: bracketData.csvData,
                h: bracketData.csvHeaders,
                ts: bracketData.tasks,
                tm: bracketData.tournament ? this.simplifyTournament(bracketData.tournament) : null,
                cm: bracketData.currentMatch,
                mh: bracketData.matchHistory ? Array.from(bracketData.matchHistory.entries()) : []
            }
            
            // Compress and encode
            const jsonString = JSON.stringify(urlData)
            const compressed = this.compressString(jsonString)
            const encoded = btoa(compressed).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
            
            return encoded
        } catch (error) {
            console.error('Error encoding bracket to URL:', error)
            throw new Error('Failed to create shareable URL')
        }
    }
    
    static decodeBracketFromURL(encodedData) {
        try {
            // Decode and decompress
            const base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/')
            // Add padding if needed
            const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
            const compressed = atob(padded)
            const jsonString = this.decompressString(compressed)
            const urlData = JSON.parse(jsonString)
            
            // Convert back to full bracket data format
            const bracketData = {
                name: urlData.n,
                status: urlData.s,
                tournamentType: urlData.t,
                seedingMethod: urlData.sm,
                taskNameColumn: urlData.tnc,
                selectedSecondaryFields: urlData.sf,
                csvData: urlData.d,
                csvHeaders: urlData.h,
                tasks: urlData.ts,
                tournament: urlData.tm ? this.expandTournament(urlData.tm) : null,
                currentMatch: urlData.cm,
                matchHistory: new Map(urlData.mh || []),
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            }
            
            return bracketData
        } catch (error) {
            console.error('Error decoding bracket from URL:', error)
            throw new Error('Invalid or corrupted bracket URL')
        }
    }
    
    static simplifyTournament(tournament) {
        return {
            t: tournament.type,
            oe: tournament.originalEntrants,
            cm: tournament.completedMatches,
            rp: tournament.remainingParticipants,
            eo: tournament.eliminationOrder,
            b: tournament.bracket,
            lc: tournament.lossCount ? Array.from(tournament.lossCount.entries()) : [],
            mi: tournament.matchIndex ? Array.from(tournament.matchIndex.entries()) : [],
            cr: tournament._currentRound,
            mc: tournament.currentMatch
        }
    }
    
    static expandTournament(simplifiedTournament) {
        return {
            type: simplifiedTournament.t,
            originalEntrants: simplifiedTournament.oe,
            completedMatches: simplifiedTournament.cm,
            remainingParticipants: simplifiedTournament.rp,
            eliminationOrder: simplifiedTournament.eo,
            bracket: simplifiedTournament.b,
            lossCount: simplifiedTournament.lc,
            matchIndex: simplifiedTournament.mi,
            _currentRound: simplifiedTournament.cr,
            currentMatch: simplifiedTournament.mc
        }
    }
    
    static compressString(str) {
        // Simple compression by removing common JSON patterns
        return str
            .replace(/{"Task Name":/g, '{"TN":')
            .replace(/,"Assignee":/g, ',"A":')
            .replace(/,"Status":/g, ',"S":')
            .replace(/,"Priority":/g, ',"P":')
            .replace(/,"Due Date":/g, ',"DD":')
            .replace(/,"Product area":/g, ',"PA":')
            .replace(/,"Sprint":/g, ',"SP":')
            .replace(/"player1":/g, '"p1":')
            .replace(/"player2":/g, '"p2":')
            .replace(/"winner":/g, '"w":')
            .replace(/"loser":/g, '"l":')
            .replace(/"round":/g, '"r":')
            .replace(/"match":/g, '"m":')
            .replace(/"bracket":/g, '"b":')
    }
    
    static decompressString(str) {
        // Reverse the compression
        return str
            .replace(/{"TN":/g, '{"Task Name":')
            .replace(/,"A":/g, ',"Assignee":')
            .replace(/,"S":/g, ',"Status":')
            .replace(/,"P":/g, ',"Priority":')
            .replace(/,"DD":/g, ',"Due Date":')
            .replace(/,"PA":/g, ',"Product area":')
            .replace(/,"SP":/g, ',"Sprint":')
            .replace(/"p1":/g, '"player1":')
            .replace(/"p2":/g, '"player2":')
            .replace(/"w":/g, '"winner":')
            .replace(/"l":/g, '"loser":')
            .replace(/"r":/g, '"round":')
            .replace(/"m":/g, '"match":')
            .replace(/"b":/g, '"bracket":')
    }
    
    static createShareableURL(bracketData, baseURL = window.location.origin + window.location.pathname) {
        const encoded = this.encodeBracketToURL(bracketData)
        return `${baseURL}?bracket=${encoded}`
    }
    
    static extractBracketFromCurrentURL() {
        const urlParams = new URLSearchParams(window.location.search)
        const bracketParam = urlParams.get('bracket')
        
        if (bracketParam) {
            return this.decodeBracketFromURL(bracketParam)
        }
        
        return null
    }
    
    static updateURLWithBracket(bracketData, replaceState = true) {
        try {
            const encoded = this.encodeBracketToURL(bracketData)
            const newURL = `${window.location.origin}${window.location.pathname}?bracket=${encoded}`
            
            if (replaceState) {
                window.history.replaceState({}, '', newURL)
            } else {
                window.history.pushState({}, '', newURL)
            }
        } catch (error) {
            console.error('Error updating URL with bracket:', error)
        }
    }
    
    static clearBracketFromURL() {
        const newURL = `${window.location.origin}${window.location.pathname}`
        window.history.replaceState({}, '', newURL)
    }
    
    static isValidBracketURL(url) {
        try {
            const urlObj = new URL(url)
            const bracketParam = urlObj.searchParams.get('bracket')
            
            if (!bracketParam) return false
            
            // Try to decode it
            this.decodeBracketFromURL(bracketParam)
            return true
        } catch (error) {
            return false
        }
    }
}