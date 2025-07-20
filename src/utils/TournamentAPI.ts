/**
 * API client for tournament persistence
 */

export interface TournamentData {
  tournamentName: string;
  currentPhase: string;
  csvData: any[];
  csvDataUUID?: string[];
  csvHeaders: string[];
  taskNameColumn: string;
  selectedSecondaryFields: string[];
  tournamentType: string;
  seedingMethod: string;
  tasks: any[];
  tournament: any;
  currentMatch: any;
  matchHistory: Map<any, any>;
}

export interface TournamentSummary {
  id: string;
  name: string;
  status: 'setup' | 'matchups' | 'results';
  tournamentType: string;
  createdAt: string;
  lastModified: string;
  isShared: boolean;
}

export interface TournamentResponse {
  id: string;
  name: string;
  status: 'setup' | 'matchups' | 'results';
  tournamentType: string;
  data: TournamentData;
  createdAt: string;
  lastModified: string;
  isShared: boolean;
  shareId?: string;
}

export interface ShareTournamentResponse {
  shareId: string;
  shareUrl: string;
  expiresInDays: number;
}

export class TournamentAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${window.location.origin}/api`;
  }

  /**
   * Create a new tournament
   */
  async createTournament(
    name: string,
    tournamentType: string,
    data: TournamentData
  ): Promise<string> {
    // Convert Map to array for JSON serialization
    const serializedData: any = {
      ...data,
      matchHistory:
        data.matchHistory instanceof Map
          ? Array.from(data.matchHistory.entries())
          : data.matchHistory,
    };

    const response = await fetch(`${this.baseUrl}/tournaments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        tournamentType,
        data: serializedData,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Failed to create tournament' }));
      throw new Error(error.error || 'Failed to create tournament');
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * Get all tournaments (summary list)
   */
  async getTournaments(limit: number = 50): Promise<TournamentSummary[]> {
    const response = await fetch(`${this.baseUrl}/tournaments?limit=${limit}`);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Failed to retrieve tournaments' }));
      throw new Error(error.error || 'Failed to retrieve tournaments');
    }

    const result = await response.json();
    return result.tournaments;
  }

  /**
   * Get a specific tournament with full data
   */
  async getTournament(id: string): Promise<TournamentResponse> {
    const response = await fetch(`${this.baseUrl}/tournaments/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Tournament not found');
      }
      const error = await response
        .json()
        .catch(() => ({ error: 'Failed to retrieve tournament' }));
      throw new Error(error.error || 'Failed to retrieve tournament');
    }

    return response.json();
  }

  /**
   * Update a tournament
   */
  async updateTournament(
    id: string,
    updates: Partial<{ name: string; status: string; data: TournamentData }>
  ): Promise<void> {
    // Convert Map to array for JSON serialization if data contains matchHistory
    const serializedUpdates: any = { ...updates };
    if (updates.data && updates.data.matchHistory instanceof Map) {
      serializedUpdates.data = {
        ...updates.data,
        matchHistory: Array.from(updates.data.matchHistory.entries()),
      };
    }

    const response = await fetch(`${this.baseUrl}/tournaments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serializedUpdates),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Failed to update tournament' }));
      throw new Error(error.error || 'Failed to update tournament');
    }
  }

  /**
   * Delete a tournament
   */
  async deleteTournament(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tournaments/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Failed to delete tournament' }));
      throw new Error(error.error || 'Failed to delete tournament');
    }
  }

  /**
   * Share a tournament
   */
  async shareTournament(
    id: string,
    expiresInDays: number = 30
  ): Promise<ShareTournamentResponse> {
    const response = await fetch(`${this.baseUrl}/tournaments/${id}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresInDays }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Failed to share tournament' }));
      throw new Error(error.error || 'Failed to share tournament');
    }

    return response.json();
  }

  /**
   * Convert localStorage bracket data to tournament data format
   */
  static convertBracketToTournament(bracketData: any): TournamentData {
    return {
      tournamentName: bracketData.name || '',
      currentPhase: bracketData.status || 'setup',
      csvData: bracketData.csvData || [],
      csvDataUUID: bracketData.csvDataUUID || [],
      csvHeaders: bracketData.csvHeaders || [],
      taskNameColumn: bracketData.taskNameColumn || '',
      selectedSecondaryFields: bracketData.selectedSecondaryFields || [],
      tournamentType: bracketData.tournamentType || 'single',
      seedingMethod: bracketData.seedingMethod || 'order',
      tasks: bracketData.tasks || [],
      tournament: bracketData.tournament || null,
      currentMatch: bracketData.currentMatch || null,
      matchHistory: bracketData.matchHistory || new Map(),
    };
  }

  /**
   * Convert tournament data back to bracket format for compatibility
   */
  static convertTournamentToBracket(tournament: TournamentResponse): any {
    return {
      name: tournament.data.tournamentName,
      status: tournament.data.currentPhase,
      csvData: tournament.data.csvData,
      csvDataUUID: tournament.data.csvDataUUID,
      csvHeaders: tournament.data.csvHeaders,
      taskNameColumn: tournament.data.taskNameColumn,
      selectedSecondaryFields: tournament.data.selectedSecondaryFields,
      tournamentType: tournament.data.tournamentType,
      seedingMethod: tournament.data.seedingMethod,
      tasks: tournament.data.tasks,
      tournament: tournament.data.tournament,
      currentMatch: tournament.data.currentMatch,
      matchHistory: Array.isArray(tournament.data.matchHistory)
        ? new Map(tournament.data.matchHistory)
        : tournament.data.matchHistory,
      createdAt: tournament.createdAt,
      lastModified: tournament.lastModified,
    };
  }
}
