import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SharedBracket {
  id: string;
  bracketData: string; // JSON string
  createdAt: string;
  expiresAt?: string;
  accessCount: number;
}

export interface Tournament {
  id: string;
  name: string;
  status: 'setup' | 'matchups' | 'results';
  tournamentType: string;
  data: string; // JSON string of all tournament data
  createdAt: string;
  lastModified: string;
  isShared: boolean;
  shareId?: string;
}

export class Database {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor() {
    // Store database in the data directory for Docker volume persistence
    const dataDir =
      process.env.NODE_ENV === 'production'
        ? path.join(process.cwd(), 'data')
        : __dirname;

    // Use separate database files for testing to avoid conflicts
    const dbName =
      process.env.NODE_ENV === 'test' || process.env.CI
        ? `taskseeder-test-${process.pid}-${Date.now()}.db`
        : 'taskseeder.db';

    this.dbPath = path.join(dataDir, dbName);
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, err => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
          return;
        }

        console.log('Connected to SQLite database:', this.dbPath);

        // Enable WAL mode for better concurrent access
        this.db!.run('PRAGMA journal_mode = WAL', walErr => {
          if (walErr) {
            console.warn('Warning: Could not enable WAL mode:', walErr);
          }

          // Set busy timeout to handle concurrent access
          this.db!.run('PRAGMA busy_timeout = 5000', timeoutErr => {
            if (timeoutErr) {
              console.warn('Warning: Could not set busy timeout:', timeoutErr);
            }

            this.createTables().then(resolve).catch(reject);
          });
        });
      });
    });
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createSharedBracketsTable = `
      CREATE TABLE IF NOT EXISTS shared_brackets (
        id TEXT PRIMARY KEY,
        bracket_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        access_count INTEGER DEFAULT 0
      )
    `;

    const createTournamentsTable = `
      CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('setup', 'matchups', 'results')),
        tournament_type TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_shared BOOLEAN DEFAULT FALSE,
        share_id TEXT UNIQUE,
        FOREIGN KEY (share_id) REFERENCES shared_brackets(id)
      )
    `;

    const createIndex = `
      CREATE INDEX IF NOT EXISTS idx_tournaments_last_modified
      ON tournaments(last_modified DESC)
    `;

    // Run table creation sequentially using async/await
    try {
      await new Promise<void>((resolve, reject) => {
        this.db!.run(createSharedBracketsTable, err => {
          if (err) {
            console.error('Error creating shared_brackets table:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      await new Promise<void>((resolve, reject) => {
        this.db!.run(createTournamentsTable, err => {
          if (err) {
            console.error('Error creating tournaments table:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      await new Promise<void>((resolve, reject) => {
        this.db!.run(createIndex, err => {
          if (err) {
            console.error('Error creating index:', err);
            reject(err);
          } else {
            console.log('Database tables initialized');
            resolve();
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  async saveBracket(
    id: string,
    bracketData: any,
    expiresInDays: number = 30
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const query = `
      INSERT OR REPLACE INTO shared_brackets (id, bracket_data, expires_at)
      VALUES (?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db!.run(
        query,
        [id, JSON.stringify(bracketData), expiresAt.toISOString()],
        function (err) {
          if (err) {
            console.error('Error saving bracket:', err);
            reject(err);
          } else {
            console.log('Bracket saved with ID:', id);
            resolve();
          }
        }
      );
    });
  }

  async getBracket(id: string): Promise<SharedBracket | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT id, bracket_data, created_at, expires_at, access_count
      FROM shared_brackets 
      WHERE id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `;

    return new Promise((resolve, reject) => {
      this.db!.get(query, [id], (err, row: any) => {
        if (err) {
          console.error('Error getting bracket:', err);
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve({
            id: row.id,
            bracketData: row.bracket_data,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            accessCount: row.access_count,
          });
        }
      });
    });
  }

  async incrementAccessCount(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      UPDATE shared_brackets 
      SET access_count = access_count + 1 
      WHERE id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db!.run(query, [id], function (err) {
        if (err) {
          console.error('Error incrementing access count:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async cleanupExpiredBrackets(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      DELETE FROM shared_brackets 
      WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
    `;

    return new Promise((resolve, reject) => {
      this.db!.run(query, function (err) {
        if (err) {
          console.error('Error cleaning up expired brackets:', err);
          reject(err);
        } else {
          console.log('Cleaned up', this.changes, 'expired brackets');
          resolve(this.changes);
        }
      });
    });
  }

  async getStats(): Promise<{ totalBrackets: number; totalAccesses: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT 
        COUNT(*) as total_brackets,
        COALESCE(SUM(access_count), 0) as total_accesses
      FROM shared_brackets 
      WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP
    `;

    return new Promise((resolve, reject) => {
      this.db!.get(query, (err, row: any) => {
        if (err) {
          console.error('Error getting stats:', err);
          reject(err);
        } else {
          resolve({
            totalBrackets: row.total_brackets || 0,
            totalAccesses: row.total_accesses || 0,
          });
        }
      });
    });
  }

  // Tournament CRUD operations
  async saveTournament(
    tournament: Omit<Tournament, 'createdAt' | 'lastModified'>
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO tournaments
      (id, name, status, tournament_type, data, is_shared, share_id, last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    return new Promise((resolve, reject) => {
      this.db!.run(
        query,
        [
          tournament.id,
          tournament.name,
          tournament.status,
          tournament.tournamentType,
          tournament.data,
          tournament.isShared,
          tournament.shareId || null,
        ],
        function (err) {
          if (err) {
            console.error('Error saving tournament:', err);
            reject(err);
          } else {
            console.log('Tournament saved with ID:', tournament.id);
            resolve();
          }
        }
      );
    });
  }

  async getTournament(id: string): Promise<Tournament | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT id, name, status, tournament_type, data, created_at, last_modified, is_shared, share_id
      FROM tournaments 
      WHERE id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db!.get(query, [id], (err, row: any) => {
        if (err) {
          console.error('Error getting tournament:', err);
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve({
            id: row.id,
            name: row.name,
            status: row.status,
            tournamentType: row.tournament_type,
            data: row.data,
            createdAt: row.created_at,
            lastModified: row.last_modified,
            isShared: !!row.is_shared,
            shareId: row.share_id,
          });
        }
      });
    });
  }

  async getTournaments(limit: number = 50): Promise<Tournament[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT id, name, status, tournament_type, data, created_at, last_modified, is_shared, share_id
      FROM tournaments 
      ORDER BY last_modified DESC
      LIMIT ?
    `;

    return new Promise((resolve, reject) => {
      this.db!.all(query, [limit], (err, rows: any[]) => {
        if (err) {
          console.error('Error getting tournaments:', err);
          reject(err);
        } else {
          const tournaments = rows.map(row => ({
            id: row.id,
            name: row.name,
            status: row.status,
            tournamentType: row.tournament_type,
            data: row.data,
            createdAt: row.created_at,
            lastModified: row.last_modified,
            isShared: !!row.is_shared,
            shareId: row.share_id,
          }));
          resolve(tournaments);
        }
      });
    });
  }

  async deleteTournament(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `DELETE FROM tournaments WHERE id = ?`;

    return new Promise((resolve, reject) => {
      this.db!.run(query, [id], function (err) {
        if (err) {
          console.error('Error deleting tournament:', err);
          reject(err);
        } else {
          console.log('Tournament deleted:', id, 'Changes:', this.changes);
          resolve();
        }
      });
    });
  }

  async updateTournamentShareStatus(
    id: string,
    isShared: boolean,
    shareId?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      UPDATE tournaments 
      SET is_shared = ?, share_id = ?, last_modified = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db!.run(query, [isShared, shareId || null, id], function (err) {
        if (err) {
          console.error('Error updating tournament share status:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close(err => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          console.log('Database connection closed');
          this.db = null;
          resolve();
        }
      });
    });
  }
}
