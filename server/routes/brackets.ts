import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database.js';

export function BracketRouter(db: Database) {
  const router = express.Router();

  // Share a bracket - creates a shareable link
  router.post('/share', async (req: Request, res: Response) => {
    try {
      const { bracketData, expiresInDays = 30 } = req.body;

      if (!bracketData) {
        return res.status(400).json({ error: 'Bracket data is required' });
      }

      // Validate expires in days
      const expires = Math.min(Math.max(1, expiresInDays), 365); // 1-365 days

      // Generate a unique ID for the shared bracket
      const shareId = uuidv4();

      // Save to database
      await db.saveBracket(shareId, bracketData, expires);

      // Return the share URL
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const shareUrl = `${protocol}://${host}/shared/${shareId}`;

      res.json({
        shareId,
        shareUrl,
        expiresInDays: expires,
      });
    } catch (error) {
      console.error('Error sharing bracket:', error);
      res.status(500).json({ error: 'Failed to share bracket' });
    }
  });

  // Get a shared bracket by ID
  router.get('/shared/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid share ID' });
      }

      const sharedBracket = await db.getBracket(id);

      if (!sharedBracket) {
        return res
          .status(404)
          .json({ error: 'Shared bracket not found or expired' });
      }

      // Increment access count
      await db.incrementAccessCount(id);

      // Parse and return bracket data
      const bracketData = JSON.parse(sharedBracket.bracketData);

      res.json({
        bracketData,
        sharedAt: sharedBracket.createdAt,
        expiresAt: sharedBracket.expiresAt,
        accessCount: sharedBracket.accessCount + 1, // Include the current access
      });
    } catch (error) {
      console.error('Error getting shared bracket:', error);
      res.status(500).json({ error: 'Failed to retrieve shared bracket' });
    }
  });

  // Get sharing statistics (optional admin endpoint)
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = await db.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
  });

  // Clean up expired brackets (optional admin endpoint)
  router.post('/cleanup', async (req: Request, res: Response) => {
    try {
      const deletedCount = await db.cleanupExpiredBrackets();
      res.json({
        message: 'Cleanup completed',
        deletedBrackets: deletedCount,
      });
    } catch (error) {
      console.error('Error during cleanup:', error);
      res.status(500).json({ error: 'Failed to cleanup expired brackets' });
    }
  });

  return router;
}
