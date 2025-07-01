import express from 'express';
import { v4 as uuidv4 } from 'uuid';
export function TournamentRouter(db) {
    const router = express.Router();
    // Create a new tournament
    router.post('/', async (req, res) => {
        try {
            const { name, tournamentType, data } = req.body;
            if (!name || !tournamentType || !data) {
                return res.status(400).json({
                    error: 'Name, tournament type, and data are required'
                });
            }
            const tournamentId = uuidv4();
            const tournament = {
                id: tournamentId,
                name,
                status: 'setup',
                tournamentType,
                data: JSON.stringify(data),
                isShared: false
            };
            await db.saveTournament(tournament);
            res.status(201).json({
                id: tournamentId,
                message: 'Tournament created successfully'
            });
        }
        catch (error) {
            console.error('Error creating tournament:', error);
            res.status(500).json({ error: 'Failed to create tournament' });
        }
    });
    // Get all tournaments
    router.get('/', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const tournaments = await db.getTournaments(limit);
            // Return metadata without full data for listing
            const tournamentList = tournaments.map(t => ({
                id: t.id,
                name: t.name,
                status: t.status,
                tournamentType: t.tournamentType,
                createdAt: t.createdAt,
                lastModified: t.lastModified,
                isShared: t.isShared
            }));
            res.json({ tournaments: tournamentList });
        }
        catch (error) {
            console.error('Error getting tournaments:', error);
            res.status(500).json({ error: 'Failed to retrieve tournaments' });
        }
    });
    // Get a specific tournament by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ error: 'Invalid tournament ID' });
            }
            const tournament = await db.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ error: 'Tournament not found' });
            }
            // Parse the JSON data before returning
            const tournamentData = JSON.parse(tournament.data);
            res.json({
                id: tournament.id,
                name: tournament.name,
                status: tournament.status,
                tournamentType: tournament.tournamentType,
                data: tournamentData,
                createdAt: tournament.createdAt,
                lastModified: tournament.lastModified,
                isShared: tournament.isShared,
                shareId: tournament.shareId
            });
        }
        catch (error) {
            console.error('Error getting tournament:', error);
            res.status(500).json({ error: 'Failed to retrieve tournament' });
        }
    });
    // Update a tournament
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, status, data } = req.body;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ error: 'Invalid tournament ID' });
            }
            // Get existing tournament to preserve other fields
            const existingTournament = await db.getTournament(id);
            if (!existingTournament) {
                return res.status(404).json({ error: 'Tournament not found' });
            }
            const updatedTournament = {
                id,
                name: name || existingTournament.name,
                status: status || existingTournament.status,
                tournamentType: existingTournament.tournamentType,
                data: data ? JSON.stringify(data) : existingTournament.data,
                isShared: existingTournament.isShared,
                shareId: existingTournament.shareId
            };
            await db.saveTournament(updatedTournament);
            res.json({ message: 'Tournament updated successfully' });
        }
        catch (error) {
            console.error('Error updating tournament:', error);
            res.status(500).json({ error: 'Failed to update tournament' });
        }
    });
    // Delete a tournament
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ error: 'Invalid tournament ID' });
            }
            const tournament = await db.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ error: 'Tournament not found' });
            }
            await db.deleteTournament(id);
            res.json({ message: 'Tournament deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting tournament:', error);
            res.status(500).json({ error: 'Failed to delete tournament' });
        }
    });
    // Share a tournament (create shareable link)
    router.post('/:id/share', async (req, res) => {
        try {
            const { id } = req.params;
            const { expiresInDays = 30 } = req.body;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ error: 'Invalid tournament ID' });
            }
            const tournament = await db.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ error: 'Tournament not found' });
            }
            // Generate a unique share ID
            const shareId = uuidv4();
            // Parse tournament data to create bracket data format
            const tournamentData = JSON.parse(tournament.data);
            const bracketData = {
                ...tournamentData,
                name: tournament.name,
                status: tournament.status,
                tournamentType: tournament.tournamentType
            };
            // Save to shared_brackets table
            await db.saveBracket(shareId, bracketData, expiresInDays);
            // Update tournament to mark as shared
            await db.updateTournamentShareStatus(id, true, shareId);
            // Generate share URL
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const host = req.headers['x-forwarded-host'] || req.get('host');
            const shareUrl = `${protocol}://${host}/shared/${shareId}`;
            res.json({
                shareId,
                shareUrl,
                expiresInDays
            });
        }
        catch (error) {
            console.error('Error sharing tournament:', error);
            res.status(500).json({ error: 'Failed to share tournament' });
        }
    });
    return router;
}
//# sourceMappingURL=tournaments.js.map