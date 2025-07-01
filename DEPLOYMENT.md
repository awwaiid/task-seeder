# TaskSeeder Deployment Guide

TaskSeeder has been converted from a static site to a full-stack application with Express.js backend and SQLite database for robust bracket sharing functionality.

## Architecture

- **Frontend**: Vue 3 SPA (served as static files)
- **Backend**: Express.js API server
- **Database**: SQLite for shared bracket storage
- **Deployment**: Docker container with volume persistence

## Quick Start with Docker

### 1. Build and Run

```bash
# Build the Docker image
docker build -t taskseeder .

# Run with docker-compose (recommended)
docker-compose up -d
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/health
- **API Documentation**: http://localhost:3000/api/brackets/stats

## Manual Development Setup

### Prerequisites

- Node.js 20+
- npm

### Development

```bash
# Install dependencies
npm install

# Start frontend development (Vite)
npm run dev

# Build and start backend (separate terminal)
npm run build:server
npm run server:dev
```

## Production Deployment

### Docker Compose (Recommended)

1. **Update docker-compose.yml**:
   - Change the domain in traefik labels
   - Configure your reverse proxy settings
   - Adjust port mapping if needed

2. **Deploy**:
```bash
docker-compose up -d
```

3. **Database Persistence**:
   - SQLite database is stored in `taskseeder_data` volume
   - Automatic backups recommended for production

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Production mode |
| `PORT` | `3000` | Server port |

### Reverse Proxy Configuration

#### Nginx Example

```nginx
server {
    listen 80;
    server_name taskseeder.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Traefik Example

```yaml
# Already configured in docker-compose.yml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.taskseeder.rule=Host(`taskseeder.yourdomain.com`)"
  - "traefik.http.routers.taskseeder.tls=true"
  - "traefik.http.routers.taskseeder.tls.certresolver=letsencrypt"
```

## API Endpoints

### Bracket Sharing

- `POST /api/brackets/share` - Share a bracket
- `GET /api/brackets/shared/:id` - Get shared bracket
- `GET /api/brackets/stats` - Get sharing statistics
- `POST /api/brackets/cleanup` - Clean expired brackets

### Health Check

- `GET /api/health` - Server health status

## Database Management

### SQLite Database

- **Location**: `/app/data/taskseeder.db` (in container)
- **Schema**: Single table `shared_brackets`
- **Cleanup**: Automatic expiration after 30 days

### Backup

```bash
# Backup database
docker exec taskseeder sqlite3 /app/data/taskseeder.db ".backup /app/data/backup.db"

# Copy backup to host
docker cp taskseeder:/app/data/backup.db ./taskseeder-backup-$(date +%Y%m%d).db
```

### Database Operations

```bash
# Connect to database
docker exec -it taskseeder sqlite3 /app/data/taskseeder.db

# View shared brackets
SELECT id, created_at, access_count FROM shared_brackets;

# Manual cleanup
DELETE FROM shared_brackets WHERE expires_at < datetime('now');
```

## Monitoring

### Health Checks

- Container health check: `/api/health`
- Database connectivity verified
- Automatic restarts on failure

### Logs

```bash
# View logs
docker-compose logs -f taskseeder

# View specific service logs
docker logs taskseeder
```

### Metrics

```bash
# Get sharing statistics
curl http://localhost:3000/api/brackets/stats
```

## Security Considerations

### Production Checklist

- [ ] Configure proper domain/SSL certificates
- [ ] Set up regular database backups
- [ ] Configure log rotation
- [ ] Monitor disk usage (SQLite database growth)
- [ ] Set up monitoring/alerting
- [ ] Review rate limiting configuration
- [ ] Validate CORS settings for your domain

### Rate Limiting

- API endpoints are rate-limited (100 requests/15 minutes per IP)
- Adjust in `server/index.ts` if needed

### Data Retention

- Shared brackets expire after 30 days by default
- Automatic cleanup runs on demand via `/api/brackets/cleanup`
- Consider setting up a cron job for regular cleanup

## Troubleshooting

### Common Issues

1. **Database Permission Errors**:
   ```bash
   # Ensure proper ownership
   docker exec taskseeder chown -R taskseeder:nodejs /app/data
   ```

2. **Port Already in Use**:
   ```bash
   # Change port in docker-compose.yml
   ports:
     - "3001:3000"  # Host:Container
   ```

3. **Large Database Size**:
   ```bash
   # Run cleanup
   curl -X POST http://localhost:3000/api/brackets/cleanup
   ```

### Performance Tuning

- SQLite works well for moderate traffic
- For high traffic, consider PostgreSQL migration
- Monitor database size and implement rotation if needed
- Consider adding Redis for session management

## Migration from Static Version

If upgrading from the static version:

1. Existing local storage brackets remain functional
2. URL-based sharing is deprecated but still supported as fallback
3. New sharing uses backend API for better reliability
4. No data migration required - both systems coexist