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
const ws_1 = __importDefault(require("ws"));
const events_1 = __importDefault(require("events"));
const OPCodes_1 = __importDefault(require("./OPCodes"));
const Logger_1 = __importDefault(require("../utils/Logger"));
class Gateway extends events_1.default {
    /**
     * @param {string} token
     * @param {object} options
     * @param {number} options.intents
     * @param {object} [options.presence=null]
     * @param {[number, number]} [options.shard=null]
     */
    constructor(token, options) {
        var _a, _b;
        super();
        this.token = token;
        this.intents = options.intents;
        this.presence = (_a = options.presence) !== null && _a !== void 0 ? _a : null;
        this.shard = options.shard;
        this.ws = null;
        this.session_id = null;
        this.sequence = null;
        this.heartbeatInterval = null;
        this.heartbeatAcked = true;
        this._lastHeartbeatSent = null;
        this.ping = null;
        this._reconnectAttempts = 0;
        this._maxReconnectAttempts = 10;
        this._reconnectTimeout = null;
        this.user = null;
        this.debug = (_b = options.debug) !== null && _b !== void 0 ? _b : false;
        // Rate Limit
        this._sendQueue = [];
        this._isSending = false;
        this._lastSendTimestamp = 0;
        this._sendInterval = 100;
        Logger_1.default.setDebug(this.debug);
    }
    /**
     * Connect Discord Gateway.
     */
    connect() {
        if (this.ws && this.ws.readyState === ws_1.default.OPEN) {
            Logger_1.default.warn("[Gateway] Already connected.");
            return;
        }
        const url = `wss://gateway.discord.gg/?v=10&encoding=json`;
        this.ws = new ws_1.default(url);
        this.ws.on("open", this._onOpen.bind(this));
        this.ws.on("message", this._onMessage.bind(this));
        this.ws.on("close", this._onClose.bind(this));
        this.ws.on("error", this._onError.bind(this));
        Logger_1.default.info(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Connecting...`);
    }
    /**
     * Disconnect Gateway.
     * @param {number} [code=1000] - close code for WebSocket.
     * @param {string} [reason=""] - reason for disconnection.
     */
    disconnect(code = 1000, reason = "") {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this._reconnectTimeout) {
            clearTimeout(this._reconnectTimeout);
            this._reconnectTimeout = null;
        }
        if (this.ws) {
            if (this.ws.readyState === ws_1.default.OPEN) {
                this.ws.close(code, reason);
            }
            else {
                this.ws.terminate(); // if not open, force close
            }
            this.ws = null;
        }
        this._isSending = false;
        this._sendQueue = [];
        Logger_1.default.info(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Disconnected.`);
    }
    _onOpen() {
        Logger_1.default.info(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Connected to Discord Gateway.`);
        this._reconnectAttempts = 0;
        this.emit("open");
    }
    _onMessage(data) {
        try {
            const payload = JSON.parse(data.toString());
            this._handlePayload(payload);
        }
        catch (err) {
            Logger_1.default.error(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Failed to parse message:`, err);
        }
    }
    _handlePayload(payload) {
        const { op, t: eventName, d, s } = payload;
        if (s !== null && s !== undefined)
            this.sequence = s;
        switch (op) {
            case OPCodes_1.default.HELLO:
                this._startHeartbeat(d.heartbeat_interval);
                if (this.session_id) {
                    Logger_1.default.info(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Resuming session...`);
                    this._resume();
                }
                else {
                    Logger_1.default.info(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Identifying...`);
                    this._identify();
                }
                break;
            case OPCodes_1.default.DISPATCH:
                if (eventName === "READY") {
                    this.session_id = d.session_id;
                    this.user = d.user;
                    Logger_1.default.info(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] READY as ${this.user.username}#${this.user.discriminator}`);
                }
                // emit raw payload for EventManager to handle
                this.emit("raw", payload);
                break;
            case OPCodes_1.default.HEARTBEAT_ACK:
                if (this._lastHeartbeatSent !== null) {
                    this.ping = Date.now() - this._lastHeartbeatSent;
                }
                else {
                    this.ping = null;
                }
                this.heartbeatAcked = true;
                this.emit("ping", this.ping);
                break;
            case OPCodes_1.default.HEARTBEAT:
                Logger_1.default.debug(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Received HEARTBEAT, sending ACK.`);
                this._sendHeartbeat();
                break;
            case OPCodes_1.default.RECONNECT:
                Logger_1.default.warn(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Server requested reconnect.`);
                this._handleReconnect();
                break;
            case OPCodes_1.default.INVALID_SESSION:
                Logger_1.default.warn(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Invalid session, re-identifying...`);
                this.session_id = null; // delete session_id
                this.sequence = null; // delete sequence
                setTimeout(() => this._identify(), 1000);
                break;
            default:
                Logger_1.default.debug(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Unhandled opcode: ${op}`);
                break;
        }
    }
    _startHeartbeat(interval) {
        if (this.heartbeatInterval)
            clearInterval(this.heartbeatInterval);
        this.heartbeatAcked = true;
        this.heartbeatInterval = setInterval(() => {
            if (!this.heartbeatAcked) {
                Logger_1.default.warn(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Missed heartbeat ACK, reconnecting...`);
                this._handleReconnect();
                return;
            }
            this._sendHeartbeat();
        }, interval);
        Logger_1.default.debug(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Heartbeat started with interval ${interval}ms.`);
        this._sendHeartbeat(); // send first heartbeat immediately
    }
    _sendHeartbeat() {
        this._lastHeartbeatSent = Date.now();
        this.heartbeatAcked = false;
        this.sendPayload({ op: OPCodes_1.default.HEARTBEAT, d: this.sequence });
    }
    _identify() {
        const payload = {
            op: OPCodes_1.default.IDENTIFY,
            d: Object.assign(Object.assign({ token: this.token, intents: this.intents, properties: {
                    $os: process.platform,
                    $browser: "Corda", 
                    $device: "Corda", 
                } }, (this.presence ? { presence: this.presence } : {})), (this.shard ? { shard: this.shard } : {})),
        };
        this.sendPayload(payload);
    }
    _resume() {
        if (!this.session_id) {
            Logger_1.default.warn(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] No session_id to resume with. Identifying instead.`);
            this._identify();
            return;
        }
        const payload = {
            op: OPCodes_1.default.RESUME,
            d: {
                token: this.token,
                session_id: this.session_id,
                seq: this.sequence,
            },
        };
        this.sendPayload(payload);
    }
    /**
     * sends a payload to the Discord Gateway.
     * @param {object} payload - payload to send.
     * @returns {Promise<void>}
     */
    sendPayload(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this._sendQueue.push({ payload, resolve, reject });
                if (!this._isSending)
                    this._processSendQueue();
            });
        });
    }
    _processSendQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this._sendQueue.length === 0) {
                this._isSending = false;
                return;
            }
            this._isSending = true;
            const now = Date.now();
            const timeSinceLastSend = now - this._lastSendTimestamp;
            if (timeSinceLastSend < this._sendInterval) {
                const delay = this._sendInterval - timeSinceLastSend;
                yield new Promise((r) => setTimeout(r, delay));
            }
            const item = this._sendQueue.shift();
            if (!item) {
                this._isSending = false;
                return;
            }
            const { payload, resolve, reject } = item;
            if (this.ws && this.ws.readyState === ws_1.default.OPEN) {
                try {
                    this.ws.send(JSON.stringify(payload));
                    this._lastSendTimestamp = Date.now();
                    Logger_1.default.debug(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Sent payload: ${(_a = OPCodes_1.default[payload.op]) !== null && _a !== void 0 ? _a : payload.op}`);
                    resolve();
                }
                catch (err) {
                    Logger_1.default.error(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Failed to send payload:`, err);
                    reject(err);
                }
            }
            else {
                Logger_1.default.warn(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Cannot send payload: WebSocket not open.`);
                reject(new Error("WebSocket not open"));
            }
            // process next payload in queue
            this._processSendQueue();
        });
    }
    _onClose(code, reason) {
        Logger_1.default.warn(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Connection closed: ${code} - ${reason}`);
        this.emit("close", code, reason);
        this._handleReconnect(code);
    }
    _onError(error) {
        Logger_1.default.error(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] WebSocket error:`, error.message);
        this.emit("error", error);
        this._handleReconnect();
    }
    /**
     * Handles reconnection logic.
     * @param {number} [closeCode] - close code from WebSocket.
     */
    _handleReconnect(closeCode = null) {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this._reconnectTimeout) {
            clearTimeout(this._reconnectTimeout);
            this._reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.terminate();
            this.ws = null;
        }
        // Handle specific close codes
        if (closeCode === 4004) {
            Logger_1.default.error(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Authentication failed (Code 4004). Cannot reconnect.`);
            this.emit("disconnect", closeCode);
            return;
        }
        if (this._reconnectAttempts < this._maxReconnectAttempts) {
            const delay = Math.min(1000 * 2 ** this._reconnectAttempts, 30000); // exponential backoff with max 30s
            Logger_1.default.info(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts + 1}/${this._maxReconnectAttempts})`);
            this._reconnectAttempts++;
            this._reconnectTimeout = setTimeout(() => this.connect(), delay);
        }
        else {
            Logger_1.default.error(`[Gateway${this.shard ? ` Shard ${this.shard[0]}` : ""}] Max reconnect attempts reached. Giving up.`);
            this.emit("disconnect", closeCode);
        }
    }
}
exports.default = Gateway;
