/**
 * API client for bracket sharing functionality
 */

export interface ShareBracketResponse {
  shareId: string;
  shareUrl: string;
  expiresInDays: number;
}

export interface SharedBracketResponse {
  bracketData: any;
  sharedAt: string;
  expiresAt?: string;
  accessCount: number;
}

export class BracketSharingAPI {
  private baseUrl: string;

  constructor() {
    // Use the current origin for API calls
    this.baseUrl = `${window.location.origin}/api`;
  }

  /**
   * Share a bracket by uploading it to the server
   */
  async shareBracket(bracketData: any, expiresInDays: number = 30): Promise<ShareBracketResponse> {
    const response = await fetch(`${this.baseUrl}/brackets/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bracketData,
        expiresInDays,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to share bracket' }));
      throw new Error(error.error || 'Failed to share bracket');
    }

    return response.json();
  }

  /**
   * Get a shared bracket by its ID
   */
  async getSharedBracket(shareId: string): Promise<SharedBracketResponse> {
    const response = await fetch(`${this.baseUrl}/brackets/shared/${shareId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Shared bracket not found or expired');
      }
      const error = await response.json().catch(() => ({ error: 'Failed to retrieve bracket' }));
      throw new Error(error.error || 'Failed to retrieve bracket');
    }

    return response.json();
  }

  /**
   * Check if a URL contains a shared bracket ID
   */
  static extractShareIdFromURL(): string | null {
    const path = window.location.pathname;
    const match = path.match(/^\/shared\/([a-f0-9-]+)$/i);
    return match?.[1] ?? null;
  }

  /**
   * Create a shareable URL for a given share ID
   */
  static createShareURL(shareId: string): string {
    return `${window.location.origin}/shared/${shareId}`;
  }

  /**
   * Update the current URL to reflect a shared bracket
   */
  static updateURLWithShareId(shareId: string, replaceState: boolean = true): void {
    const newURL = this.createShareURL(shareId);
    
    if (replaceState) {
      window.history.replaceState({}, '', newURL);
    } else {
      window.history.pushState({}, '', newURL);
    }
  }

  /**
   * Clear the shared bracket from the URL
   */
  static clearShareFromURL(): void {
    const newURL = window.location.origin;
    window.history.replaceState({}, '', newURL);
  }

  /**
   * Check if the current URL is a shared bracket URL
   */
  static isSharedBracketURL(): boolean {
    return this.extractShareIdFromURL() !== null;
  }
}