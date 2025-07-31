"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const Logger_1 = __importDefault(require("../utils/Logger"));
class EventManager extends events_1.default {
    constructor(client) {
        super();
        this.client = client;
        this.events = new Map();
        this.loadEvents();
    }
    loadEvents() {
        const handlersPath = path_1.default.join(__dirname, "handlers");
        if (!fs_1.default.existsSync(handlersPath)) {
            Logger_1.default.warn("[EventManager] Event handlers folder not found.");
            return;
        }
        // Support both .ts and .js for dev/prod
        const files = fs_1.default
            .readdirSync(handlersPath)
            .filter((f) => f.endsWith(".ts") || f.endsWith(".js"));
        for (const file of files) {
            try {
                // Use dynamic import for .ts/.js compatibility
                const event = require(path_1.default.join(handlersPath, file)).default ||
                    require(path_1.default.join(handlersPath, file));
                if (!event.name) {
                    Logger_1.default.warn(`[EventManager] Event file ${file} missing 'name' export.`);
                    continue;
                }
                this.events.set(event.name, event);
                Logger_1.default.debug(`[EventManager] Loaded event handler: ${event.name}`);
            }
            catch (err) {
                Logger_1.default.error(`[EventManager] Failed to load event handler ${file}:`, err);
            }
        }
    }
    handleGatewayPayload(shardId, payload) {
        const { t: eventName, d: data } = payload;
        if (!eventName)
            return;
        const eventHandler = this.events.get(eventName);
        const transformedData = (eventHandler === null || eventHandler === void 0 ? void 0 : eventHandler.transform)
            ? (() => {
                try {
                    return eventHandler.transform(this.client, data);
                }
                catch (err) {
                    Logger_1.default.error(`[EventManager] Error transforming event ${eventName}:`, err);
                    return data;
                }
            })()
            : data;
        if (eventHandler === null || eventHandler === void 0 ? void 0 : eventHandler.handler) {
            try {
                eventHandler.handler(this.client, transformedData, shardId);
            }
            catch (err) {
                Logger_1.default.error(`[EventManager] Error in event handler ${eventName}:`, err);
            }
        }
        if (eventHandler === null || eventHandler === void 0 ? void 0 : eventHandler.alias) {
            this.client.emit(eventHandler.alias, transformedData);
        }
        this.client.emit(eventName, transformedData);
        if (!eventHandler) {
            this.client.emit(eventName.toLowerCase(), data);
        }
    }
}
exports.default = EventManager;
