"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const Logger_1 = __importDefault(require("../utils/Logger"));
class RestManager {
    constructor(token) {
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
    request(method_1, path_1) {
        return __awaiter(this, arguments, void 0, function* (method, path, body = null) {
            const url = `${this.baseURL}${path}`;
            const headers = {
                Authorization: `Bot ${this.token}`,
                "Content-Type": "application/json",
                "User-Agent": "DiscordBot (yourlib, 1.0.0)",
            };
            const options = {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            };
            // Global Rate Limit Handling
            yield this._waitForGlobalRateLimit();
            const response = yield (0, node_fetch_1.default)(url, options);
            // Handle Rate Limits
            const retryAfter = parseInt(response.headers.get("retry-after") || "0", 10) * 1000;
            if (response.status === 429) {
                Logger_1.default.warn(`[RestManager] Rate limited on ${method} ${path}. Retrying after ${retryAfter}ms.`);
                this.globalRateLimitReset = Date.now() + retryAfter;
                this.globalRateLimitRemaining = 0;
                yield new Promise((r) => setTimeout(r, retryAfter));
                return this.request(method, path, body); // Retry after waiting
            }
            if (!response.ok) {
                const errorData = yield response.json().catch(() => ({}));
                Logger_1.default.error(`[RestManager] API Error ${response.status} on ${method} ${path}:`, errorData);
                throw new Error(`Discord API Error ${response.status}: ${JSON.stringify(errorData)}`);
            }
            try {
                return (yield response.json());
            }
            catch (_a) {
                return null;
            }
        });
    }
    _waitForGlobalRateLimit() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.globalRateLimitRemaining > 0 &&
                Date.now() < this.globalRateLimitReset) {
                const delay = this.globalRateLimitReset - Date.now();
                Logger_1.default.debug(`[RestManager] Global rate limit active. Waiting ${delay}ms.`);
                yield new Promise((r) => setTimeout(r, delay));
            }
            this.globalRateLimitRemaining = 0;
        });
    }
    // Methods for specific HTTP methods
    get(path) {
        return this.request("GET", path);
    }
    post(path, body) {
        return this.request("POST", path, body);
    }
    put(path, body) {
        return this.request("PUT", path, body);
    }
    delete(path) {
        return this.request("DELETE", path);
    }
    patch(path, body) {
        return this.request("PATCH", path, body);
    }
}
exports.default = RestManager;
