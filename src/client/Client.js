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
const events_1 = __importDefault(require("events"));
const ShardManager_1 = __importDefault(require("../gateway/ShardManager"));
const RestManager_1 = __importDefault(require("../rest/RestManager"));
const EventManager_1 = __importDefault(require("../events/EventManager"));
const Logger_1 = __importDefault(require("../utils/Logger"));
const Constants_1 = __importDefault(require("../utils/Constants"));
const process_1 = require("process");
class Client extends events_1.default {
    // No need to redeclare emit, inherited from EventEmitter
    /**
     * @param {object} options
     * @param {string} options.token
     * @param {number} [options.intents=Constants.DefaultIntents]
     * @param {object} [options.presence=null]
     * @param {number} [options.totalShards=1]
     */
    constructor(options) {
        var _a, _b, _c, _d;
        super();
        if (!options.token) {
            throw new Error("Token is required to initialize the client.");
        }
        this.token = options.token;
        this.intents = (_a = options.intents) !== null && _a !== void 0 ? _a : Constants_1.default.DefaultIntents;
        this.presence = (_b = options.presence) !== null && _b !== void 0 ? _b : null;
        this.debug = (_c = options.debug) !== null && _c !== void 0 ? _c : false;
        this.totalShards = (_d = options.totalShards) !== null && _d !== void 0 ? _d : 1;
        /**
         * @type {ShardManager}
         */
        this.shardManager = new ShardManager_1.default(this.token, {
            totalShards: this.totalShards,
            intents: this.intents,
            presence: this.presence,
            debug: this.debug, // Pass debug option to ShardManager
        });
        /**
         * @type {RestManager}
         */
        this.rest = new RestManager_1.default(this.token);
        /**
         * @type {EventManager}
         */
        this.eventManager = new EventManager_1.default(this); //
        /**
         * @type {object|null}
         */
        this.user = null; // user object after login
        this._setupListeners();
    }
    _setupListeners() {
        // listeners for ShardManager events
        this.shardManager.on("raw", (shardId, payload) => {
            this.eventManager.handleGatewayPayload(shardId, payload);
        });
        // listeners for Client events
        this.shardManager.on("ready", (shardId, data) => {
            if (shardId === 0) {
                // only set user on the first shard
                this.user = data.user;
                Logger_1.default.info(`[Client] Client is ready as ${this.user.username}#${this.user.discriminator}`);
                super.emit("ready", this);
            }
            super.emit("shardReady", shardId, data);
        });
        this.shardManager.on("disconnect", (shardId, code) => {
            Logger_1.default.warn(`[Client] Shard ${shardId} disconnected with code ${code}.`);
            super.emit("shardDisconnect", shardId, code);
        });
        this.shardManager.on("error", (shardId, err) => {
            Logger_1.default.error(`[Client] Shard ${shardId} encountered an error:`, err);
            super.emit("shardError", shardId, err);
        });
        this.shardManager.on("ping", (shardId, ping) => {
            super.emit("shardPing", shardId, ping);
        });
        // listeners for EventManager events
        this.eventManager.on("messageCreate", (message) => {
            super.emit("messageCreate", message);
        });
        // you can add more event listeners as needed
    }
    /**
     * Logs in the client and connects to the gateway.
     * @returns {Promise<void>}
     */
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            Logger_1.default.info("[Client] Logging in...");
            yield this.shardManager.connectAll();
        });
    }
    /**
     * Destroys the client, disconnecting all shards and cleaning up resources.
     * @param {number} [code=1000]
     * @param {string} [reason=""]
     */
    destroy() {
        return __awaiter(this, arguments, void 0, function* (code = 1000, reason = "Client destroyed") {
            Logger_1.default.info("[Client] Destroying client...");
            this.shardManager.disconnectAll(code, reason);
            this.emit("destroy");
        });
    }
    /**
     * Send a message to a channel. Accepts a string (content) or a full Discord API message object.
     * @param channelId Channel ID
     * @param contentOrOptions Message content as string, or full message object (per Discord API)
     */
    sendMessage(channelId, contentOrOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            let body;
            if (typeof contentOrOptions === "string") {
                body = { content: contentOrOptions };
            }
            else {
                body = contentOrOptions;
            }
            return this.rest.post(`/channels/${channelId}/messages`, body);
        });
    }
    getUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.rest.get(`/users/${userId}`);
        });
    }
    get ws() {
        var _a, _b;
        return {
            status: this.shardManager.shards.size > 0 ? "connected" : "disconnected",
            shards: Array.from(this.shardManager.shards.keys()),
            uptime: (0, process_1.uptime)(),
            user: this.user,
            totalShards: this.totalShards,
            intents: this.intents,
            presence: this.presence,
            ping: this.shardManager.shards.size > 0
                ? (_b = (_a = this.shardManager.getShard(0)) === null || _a === void 0 ? void 0 : _a.ping) !== null && _b !== void 0 ? _b : null
                : null,
            shardsReady: this.shardManager.shards.size,
        };
    }
    OnShutDown() {
        process.on("SIGINT", () => __awaiter(this, void 0, void 0, function* () {
            console.log("Shutting down client...");
            yield this.destroy();
            process.exit(0);
        }));
    }
}
exports.default = Client;
