/**
 * Storage Optimizer - Simple storage monitoring and basic optimization
 */

export class StorageOptimizer {
    static getStorageUsage() {
        try {
            let totalSize = 0
            
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length
                }
            }
            
            const brackets = JSON.parse(localStorage.getItem('bracketology_saved_brackets') || '{}')
            const bracketCount = Object.keys(brackets).length
            
            return {
                totalBytes: totalSize,
                totalKB: Math.round(totalSize / 1024 * 100) / 100,
                totalMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
                bracketCount,
                estimatedLimit: 5 * 1024 * 1024, // 5MB typical limit
                usagePercent: Math.round((totalSize / (5 * 1024 * 1024)) * 100)
            }
        } catch (error) {
            console.error('Error analyzing storage usage:', error)
            return { totalBytes: 0, totalKB: 0, totalMB: 0, bracketCount: 0, usagePercent: 0 }
        }
    }
    
    static shouldWarnAboutStorage() {
        const usage = this.getStorageUsage()
        return usage.usagePercent > 80 // Warn when over 80% full
    }
    
    static cleanupOldBrackets(keepCount = 10) {
        try {
            const brackets = JSON.parse(localStorage.getItem('bracketology_saved_brackets') || '{}')
            const bracketList = Object.entries(brackets)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
            
            if (bracketList.length <= keepCount) {
                return 0 // No cleanup needed
            }
            
            const toDelete = bracketList.slice(keepCount)
            const cleanedBrackets = {}
            
            bracketList.slice(0, keepCount).forEach(bracket => {
                const { id, ...data } = bracket
                cleanedBrackets[id] = data
            })
            
            localStorage.setItem('bracketology_saved_brackets', JSON.stringify(cleanedBrackets))
            
            return toDelete.length
        } catch (error) {
            console.error('Error cleaning up old brackets:', error)
            return 0
        }
    }
    
}