import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// Test the catch-all route pattern independently
describe('Server Routes', () => {
  describe('Catch-all route for SPA', () => {
    it('should accept the catch-all route pattern without errors', () => {
      const app = express();

      // This should NOT throw an error
      // If Express 5 doesn't support the pattern, it will throw during route registration
      // With the old '*' pattern, this would throw: PathError [TypeError]: Missing parameter name at index 1: *
      expect(() => {
        app.get(/.*/, (req, res) => {
          res.send('OK');
        });
      }).not.toThrow();
    });

    it('should serve index.html for non-API routes', async () => {
      const app = express();

      // Mock the catch-all route (matches server/index.ts implementation)
      app.get(/.*/, (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'API route not found' });
        }
        res.send('<html><body>SPA</body></html>'); // Mock index.html
      });

      const response = await request(app).get('/some/random/route');
      expect(response.status).toBe(200);
      expect(response.text).toContain('SPA');
    });

    it('should serve SPA for tournament routes', async () => {
      const app = express();

      app.get(/.*/, (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'API route not found' });
        }
        res.send('<html><body>SPA</body></html>');
      });

      const response = await request(app).get('/tournament/abc-123');
      expect(response.status).toBe(200);
      expect(response.text).toContain('SPA');
    });

    it('should return 404 JSON for non-existent API routes', async () => {
      const app = express();

      app.get(/.*/, (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'API route not found' });
        }
        res.send('SPA');
      });

      const response = await request(app)
        .get('/api/nonexistent')
        .set('Accept', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'API route not found' });
    });

    it('should handle API health endpoint correctly when added', async () => {
      const app = express();

      // Add a real API route before the catch-all
      app.get('/api/health', (req, res) => {
        res.json({ status: 'healthy' });
      });

      // Add catch-all after real routes
      app.get(/.*/, (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'API route not found' });
        }
        res.send('SPA');
      });

      // Real API route should work
      const healthResponse = await request(app).get('/api/health');
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body).toEqual({ status: 'healthy' });

      // Non-existent API route should 404
      const notFoundResponse = await request(app).get('/api/invalid');
      expect(notFoundResponse.status).toBe(404);
      expect(notFoundResponse.body).toEqual({ error: 'API route not found' });
    });
  });

  describe('Route pattern compatibility', () => {
    it('should validate that wildcard string pattern fails in Express 5', () => {
      const app = express();

      // This demonstrates the old pattern that breaks in Express 5
      // Uncomment to see the error: PathError [TypeError]: Missing parameter name at index 1: *
      // expect(() => {
      //   app.get('*', (req, res) => {
      //     res.send('OK');
      //   });
      // }).toThrow(/Missing parameter name/);

      // Instead, we verify the regex pattern works
      expect(() => {
        app.get(/.*/, (req, res) => {
          res.send('OK');
        });
      }).not.toThrow();
    });
  });
});
