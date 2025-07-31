import fetch, { RequestInit, Response } from "node-fetch";
import Logger from "../utils/Logger";

interface RateLimitBucket {
  limit: number;
  remaining: number;
  reset: number;
  queue: Array<() => void>;
}

type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

class RestManager {
  private token: string;
  private baseURL: string;
  private globalRateLimitReset: number;
  private globalRateLimitRemaining: number;
  private globalRateLimitQueue: Array<() => void>;
  private _isProcessingGlobalQueue: boolean;
  private bucketLimits: Map<string, RateLimitBucket>;

  constructor(token: string) {
    this.token = token;
    this.baseURL = "https://discord.com/api/v10";
    this.globalRateLimitReset = 0;
    this.globalRateLimitRemaining = 1;
    this.globalRateLimitQueue = [];
    this._isProcessingGlobalQueue = false;
    this.bucketLimits = new Map();
  }

  /**
   * Sends a request to the Discord API.
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH).
   * @param {string} path - API endpoint path (e.g., /users/@me).
   * @param {object} [body=null] - Request body for POST/PUT requests.
   * @returns {Promise<object>} - Parsed JSON response from the API.
   */

  /**
   * Sends a request to the Discord API.
   * @param method HTTP method (GET, POST, PUT, DELETE, PATCH).
   * @param path API endpoint path (e.g., /users/@me).
   * @param body Request body for POST/PUT requests.
   * @returns Parsed JSON response from the API.
   */
  async request<T = any>(
    method: HTTPMethod,
    path: string,
    body: object | null = null
  ): Promise<T | null> {
    const url = `${this.baseURL}${path}`;
    const headers = {
      Authorization: `Bot ${this.token}`,
      "Content-Type": "application/json",
      "User-Agent": "DiscordBot (yourlib, 1.0.0)",
    };

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    // Global Rate Limit Handling
    await this._waitForGlobalRateLimit();

    const response: Response = await fetch(url, options);

    // Handle Rate Limits
    const retryAfter =
      parseInt(response.headers.get("retry-after") || "0", 10) * 1000;
    if (response.status === 429) {
      Logger.warn(
        `[RestManager] Rate limited on ${method} ${path}. Retrying after ${retryAfter}ms.`
      );
      this.globalRateLimitReset = Date.now() + retryAfter;
      this.globalRateLimitRemaining = 0;
      await new Promise((r) => setTimeout(r, retryAfter));
      return this.request(method, path, body); // Retry after waiting
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      Logger.error(
        `[RestManager] API Error ${response.status} on ${method} ${path}:`,
        errorData
      );
      throw new Error(
        `Discord API Error ${response.status}: ${JSON.stringify(errorData)}`
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  private async _waitForGlobalRateLimit(): Promise<void> {
    if (
      this.globalRateLimitRemaining > 0 &&
      Date.now() < this.globalRateLimitReset
    ) {
      const delay = this.globalRateLimitReset - Date.now();
      Logger.debug(
        `[RestManager] Global rate limit active. Waiting ${delay}ms.`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
    this.globalRateLimitRemaining = 0;
  }

  // Methods for specific HTTP methods
  get<T = any>(path: string): Promise<T | null> {
    return this.request<T>("GET", path);
  }

  post<T = any>(path: string, body: object): Promise<T | null> {
    return this.request<T>("POST", path, body);
  }

  put<T = any>(path: string, body: object): Promise<T | null> {
    return this.request<T>("PUT", path, body);
  }

  delete<T = any>(path: string): Promise<T | null> {
    return this.request<T>("DELETE", path);
  }

  patch<T = any>(path: string, body: object): Promise<T | null> {
    return this.request<T>("PATCH", path, body);
  }
}

export default RestManager;
