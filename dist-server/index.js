import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from './database.js';
import { BracketRouter } from './routes/brackets.js';
import { TournamentRouter } from './routes/tournaments.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
// Initialize database
const db = new Database();
await db.init();
// Security middleware
app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));
// Rate limiting for API endpoints
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);
// CORS configuration
const corsOptions = {
    origin: NODE_ENV === 'production'
        ? true // Allow all origins in production (adjust as needed)
        : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'],
    credentials: true
};
app.use(cors(corsOptions));
// Compression middleware
app.use(compression());
// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// API routes
app.use('/api/brackets', BracketRouter(db));
app.use('/api/tournaments', TournamentRouter(db));
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV
    });
});
// Serve static files from dist directory
app.use(express.static(distPath));
// Catch-all handler for SPA routing
app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.join(distPath, 'index.html'));
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await db.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await db.close();
    process.exit(0);
});
app.listen(PORT, () => {
    console.log(`TaskSeeder running on port ${PORT} in ${NODE_ENV} mode`);
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
});
//# sourceMappingURL=index.js.map