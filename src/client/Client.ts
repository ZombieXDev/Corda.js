import EventEmitter from "events";
import ShardManager from "../gateway/ShardManager";
import RestManager from "../rest/RestManager";
import EventManager from "../events/EventManager";
import Logger from "../utils/Logger";
import Constants from "../utils/Constants";
import { uptime } from "process";

interface ClientOptions {
  token: string;
  intents?: number;
  presence?: object | null;
  totalShards?: number;
  debug?: boolean; // Enable debug mode
}

class Client extends EventEmitter {
  token: string;
  intents: number;
  presence: object | null;
  debug: boolean;
  totalShards: number;
  shardManager: ShardManager;
  rest: RestManager;
  eventManager: EventManager;
  user: any;

  // No need to redeclare emit, inherited from EventEmitter

  /**
   * @param {object} options
   * @param {string} options.token
   * @param {number} [options.intents=Constants.DefaultIntents]
   * @param {object} [options.presence=null]
   * @param {number} [options.totalShards=1]
   */
  constructor(options: ClientOptions) {
    super();

    if (!options.token) {
      throw new Error("Token is required to initialize the client.");
    }

    this.token = options.token;
    this.intents = options.intents ?? Constants.DefaultIntents;
    this.presence = options.presence ?? null;
    this.debug = options.debug ?? false;
    this.totalShards = options.totalShards ?? 1;

    /**
     * @type {ShardManager}
     */
    this.shardManager = new ShardManager(this.token, {
      totalShards: this.totalShards,
      intents: this.intents,
      presence: this.presence,
      debug: this.debug, // Pass debug option to ShardManager
    });

    /**
     * @type {RestManager}
     */
    this.rest = new RestManager(this.token);

    /**
     * @type {EventManager}
     */
    this.eventManager = new EventManager(this); //

    /**
     * @type {object|null}
     */
    this.user = null; // user object after login

    this._setupListeners();
  }

  _setupListeners() {
    // listeners for ShardManager events
    this.shardManager.on("raw", (shardId: number, payload: any) => {
      this.eventManager.handleGatewayPayload(shardId, payload);
    });

    // listeners for Client events
    this.shardManager.on("ready", (shardId: number, data: any) => {
      if (shardId === 0) {
        // only set user on the first shard
        this.user = data.user;
        Logger.info(
          `[Client] Client is ready as ${this.user.username}#${this.user.discriminator}`
        );
        super.emit("ready", this);
      }
      super.emit("shardReady", shardId, data);
    });

    this.shardManager.on("disconnect", (shardId: number, code: number) => {
      Logger.warn(`[Client] Shard ${shardId} disconnected with code ${code}.`);
      super.emit("shardDisconnect", shardId, code);
    });

    this.shardManager.on("error", (shardId: number, err: any) => {
      Logger.error(`[Client] Shard ${shardId} encountered an error:`, err);
      super.emit("shardError", shardId, err);
    });

    this.shardManager.on("ping", (shardId: number, ping: number) => {
      super.emit("shardPing", shardId, ping);
    });

    // listeners for EventManager events
    this.eventManager.on("messageCreate", (message: any) => {
      super.emit("messageCreate", message);
    });
    // you can add more event listeners as needed
  }

  /**
   * Logs in the client and connects to the gateway.
   * @returns {Promise<void>}
   */
  async login() {
    Logger.info("[Client] Logging in...");
    await this.shardManager.connectAll();
  }

  /**
   * Destroys the client, disconnecting all shards and cleaning up resources.
   * @param {number} [code=1000]
   * @param {string} [reason=""]
   */
  async destroy(code = 1000, reason = "Client destroyed") {
    Logger.info("[Client] Destroying client...");
    this.shardManager.disconnectAll(code, reason);
    this.emit("destroy");
  }

  /**
   * Send a message to a channel. Accepts a string (content) or a full Discord API message object.
   * @param channelId Channel ID
   * @param contentOrOptions Message content as string, or full message object (per Discord API)
   */
  async sendMessage(channelId: string, contentOrOptions: string | object) {
    let body: any;
    if (typeof contentOrOptions === "string") {
      body = { content: contentOrOptions };
    } else {
      body = contentOrOptions;
    }
    return this.rest.post(`/channels/${channelId}/messages`, body);
  }

  async getUser(userId: string) {
    return this.rest.get(`/users/${userId}`);
  }

  get ws() {
    return {
      status: this.shardManager.shards.size > 0 ? "connected" : "disconnected",
      shards: Array.from(this.shardManager.shards.keys()),
      uptime: uptime(),
      user: this.user,
      totalShards: this.totalShards,
      intents: this.intents,
      presence: this.presence,
      ping:
        this.shardManager.shards.size > 0
          ? this.shardManager.getShard(0)?.ping ?? null
          : null,
      shardsReady: this.shardManager.shards.size,
    };
  }

  OnShutDown() {
    process.on("SIGINT", async () => {
      console.log("Shutting down client...");
      await this.destroy();
      process.exit(0);
    });
  }
}

export default Client;
