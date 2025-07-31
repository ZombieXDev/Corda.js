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
const Gateway_1 = __importDefault(require("./Gateway"));
const events_1 = __importDefault(require("events"));
const Logger_1 = __importDefault(require("../utils/Logger"));
const Constants_1 = __importDefault(require("../utils/Constants"));
class ShardManager extends events_1.default {
    /**
     * @param {string} token
     * @param {object} options
     * @param {number} [options.totalShards=1]
     * @param {number} [options.intents=Constants.DefaultIntents]
     * @param {object} [options.presence=null]
     */
    constructor(token, options = {}) {
        var _a, _b, _c, _d;
        super();
        this.token = token;
        this.totalShards = (_a = options.totalShards) !== null && _a !== void 0 ? _a : 1;
        this.intents = (_b = options.intents) !== null && _b !== void 0 ? _b : Constants_1.default.DefaultIntents;
        this.presence = (_c = options.presence) !== null && _c !== void 0 ? _c : null;
        this.debug = (_d = options.debug) !== null && _d !== void 0 ? _d : false;
        this.shards = new Map();
        this._spawnedShards = 0;
        this._spawnInterval = 5500;
        this._spawnQueue = [];
        this._isSpawning = false;
        this._setupShards();
    }
    _setupShards() {
        for (let i = 0; i < this.totalShards; i++) {
            this._spawnQueue.push(i);
        }
    }
    /**
     * Connects all shards in the spawn queue.
     */
    connectAll() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isSpawning) {
                Logger_1.default.warn("[ShardManager] Shards are already spawning.");
                return;
            }
            this._isSpawning = true;
            this._processSpawnQueue();
        });
    }
    _processSpawnQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._spawnQueue.length === 0) {
                this._isSpawning = false;
                Logger_1.default.info("[ShardManager] All shards spawned.");
                return;
            }
            const shardId = this._spawnQueue.shift();
            Logger_1.default.info(`[ShardManager] Spawning shard ${shardId}/${this.totalShards - 1}...`);
            const shard = new Gateway_1.default(this.token, {
                intents: this.intents,
                presence: this.presence,
                shard: [shardId, this.totalShards],
                debug: this.debug,
            });
            // Attach event listeners to the shard
            shard.on("raw", (payload) => this.emit("raw", shardId, payload));
            shard.on("ready", (data) => this.emit("ready", shardId, data));
            shard.on("disconnect", (code) => this.emit("disconnect", shardId, code));
            shard.on("error", (err) => this.emit("error", shardId, err));
            shard.on("ping", (ping) => this.emit("ping", shardId, ping));
            shard.on("close", (code, reason) => this.emit("close", shardId, code, reason));
            shard.on("open", () => this.emit("shardReady", shardId));
            this.shards.set(shardId, shard);
            shard.connect();
            this._spawnedShards++;
            if (this._spawnQueue.length > 0) {
                yield new Promise((r) => setTimeout(r, this._spawnInterval));
                this._processSpawnQueue();
            }
            else {
                this._isSpawning = false;
                Logger_1.default.info("[ShardManager] All shards have been initiated.");
            }
        });
    }
    /**
     * Gets a shard by its ID.
     * @param {number} id - ID of the shard to retrieve.
     * @returns {Gateway|null}
     */
    getShard(id) {
        var _a;
        return (_a = this.shards.get(id)) !== null && _a !== void 0 ? _a : null;
    }
    /**
     * Broadcasts a payload to all shards.
     * @param {object} payload - The payload to send.
     */
    broadcast(payload) {
        var _a;
        for (const shard of this.shards.values()) {
            if (shard.ws && shard.ws.readyState === ((_a = shard.ws.OPEN) !== null && _a !== void 0 ? _a : 1)) {
                shard.sendPayload(payload).catch((err) => {
                    Logger_1.default.error(`[ShardManager] Failed to broadcast payload to shard ${shard.shard ? shard.shard[0] : "?"}:`, err);
                });
            }
        }
    }
    /**
     * Disconnects all shards.
     * @param {number} [code=1000]
     * @param {string} [reason=""]
     */
    disconnectAll(code = 1000, reason = "") {
        for (const shard of this.shards.values()) {
            shard.disconnect(code, reason);
        }
        this.shards.clear();
        this._spawnQueue = [];
        this._isSpawning = false;
        this._spawnedShards = 0;
        Logger_1.default.info("[ShardManager] All shards disconnected.");
    }
}
exports.default = ShardManager;
