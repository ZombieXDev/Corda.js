import Gateway from "./Gateway";
import EventEmitter from "events";
import Logger from "../utils/Logger";
import Constants from "../utils/Constants";

interface ShardManagerOptions {
  totalShards?: number;
  intents?: number;
  presence?: object | null;
  debug?: boolean;
}

class ShardManager extends EventEmitter {
  token: string;
  totalShards: number;
  intents: number;
  presence: object | null;
  debug: boolean;
  shards: Map<number, Gateway>;
  _spawnedShards: number;
  _spawnInterval: number;
  _spawnQueue: number[];
  _isSpawning: boolean;
  /**
   * @param {string} token
   * @param {object} options
   * @param {number} [options.totalShards=1]
   * @param {number} [options.intents=Constants.DefaultIntents]
   * @param {object} [options.presence=null]
   */
  constructor(token: string, options: ShardManagerOptions = {}) {
    super();
    this.token = token;
    this.totalShards = options.totalShards ?? 1;
    this.intents = options.intents ?? Constants.DefaultIntents;
    this.presence = options.presence ?? null;
    this.debug = options.debug ?? false;
    this.shards = new Map<number, Gateway>();
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
  async connectAll() {
    if (this._isSpawning) {
      Logger.warn("[ShardManager] Shards are already spawning.");
      return;
    }
    this._isSpawning = true;
    this._processSpawnQueue();
  }

  async _processSpawnQueue() {
    if (this._spawnQueue.length === 0) {
      this._isSpawning = false;
      Logger.info("[ShardManager] All shards spawned.");
      return;
    }

    const shardId = this._spawnQueue.shift()!;
    Logger.info(
      `[ShardManager] Spawning shard ${shardId}/${this.totalShards - 1}...`
    );

    const shard = new Gateway(this.token, {
      intents: this.intents,
      presence: this.presence,
      shard: [shardId, this.totalShards],
      debug: this.debug,
    });

    // Attach event listeners to the shard
    shard.on("raw", (payload: any) => this.emit("raw", shardId, payload));
    shard.on("ready", (data: any) => this.emit("ready", shardId, data));
    shard.on("disconnect", (code: number) =>
      this.emit("disconnect", shardId, code)
    );
    shard.on("error", (err: any) => this.emit("error", shardId, err));
    shard.on("ping", (ping: number) => this.emit("ping", shardId, ping));
    shard.on("close", (code: number, reason: string) =>
      this.emit("close", shardId, code, reason)
    );
    shard.on("open", () => this.emit("shardReady", shardId));

    this.shards.set(shardId, shard);
    shard.connect();

    this._spawnedShards++;

    if (this._spawnQueue.length > 0) {
      await new Promise((r) => setTimeout(r, this._spawnInterval));
      this._processSpawnQueue();
    } else {
      this._isSpawning = false;
      Logger.info("[ShardManager] All shards have been initiated.");
    }
  }

  /**
   * Gets a shard by its ID.
   * @param {number} id - ID of the shard to retrieve.
   * @returns {Gateway|null}
   */
  getShard(id: number): Gateway | null {
    return this.shards.get(id) ?? null;
  }

  /**
   * Broadcasts a payload to all shards.
   * @param {object} payload - The payload to send.
   */
  broadcast(payload: any) {
    for (const shard of this.shards.values()) {
      if (shard.ws && shard.ws.readyState === (shard.ws.OPEN ?? 1)) {
        shard.sendPayload(payload).catch((err: any) => {
          Logger.error(
            `[ShardManager] Failed to broadcast payload to shard ${
              shard.shard ? shard.shard[0] : "?"
            }:`,
            err
          );
        });
      }
    }
  }

  /**
   * Disconnects all shards.
   * @param {number} [code=1000]
   * @param {string} [reason=""]
   */
  disconnectAll(code: number = 1000, reason: string = "") {
    for (const shard of this.shards.values()) {
      shard.disconnect(code, reason);
    }
    this.shards.clear();
    this._spawnQueue = [];
    this._isSpawning = false;
    this._spawnedShards = 0;
    Logger.info("[ShardManager] All shards disconnected.");
  }
}

export default ShardManager;
