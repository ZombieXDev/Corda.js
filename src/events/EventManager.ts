import EventEmitter from "events";
import path from "path";
import fs from "fs";
import Logger from "../utils/Logger";

import Client from "../client/Client";

interface EventHandler {
  name: string;
  alias?: string;
  transform?: (client: Client, data: any) => any;
  handler?: (client: Client, message: any, shardId: number) => void;
}

class EventManager extends EventEmitter {
  client: Client;
  events: Map<string, EventHandler>;

  constructor(client: Client) {
    super();
    this.client = client;
    this.events = new Map();
    this.loadEvents();
  }

  loadEvents() {
    const handlersPath = path.join(__dirname, "handlers");
    if (!fs.existsSync(handlersPath)) {
      Logger.warn("[EventManager] Event handlers folder not found.");
      return;
    }

    // Support both .ts and .js for dev/prod
    const files = fs
      .readdirSync(handlersPath)
      .filter((f) => f.endsWith(".ts") || f.endsWith(".js"));
    for (const file of files) {
      try {
        // Use dynamic import for .ts/.js compatibility
        const event: EventHandler =
          require(path.join(handlersPath, file)).default ||
          require(path.join(handlersPath, file));
        if (!event.name) {
          Logger.warn(
            `[EventManager] Event file ${file} missing 'name' export.`
          );
          continue;
        }
        this.events.set(event.name, event);
        Logger.debug(`[EventManager] Loaded event handler: ${event.name}`);
      } catch (err) {
        Logger.error(
          `[EventManager] Failed to load event handler ${file}:`,
          err
        );
      }
    }
  }

  handleGatewayPayload(shardId: number, payload: any) {
    const { t: eventName, d: data } = payload;
    if (!eventName) return;

    const eventHandler = this.events.get(eventName);
    const transformedData = eventHandler?.transform
      ? (() => {
          try {
            return eventHandler.transform(this.client, data);
          } catch (err) {
            Logger.error(
              `[EventManager] Error transforming event ${eventName}:`,
              err
            );
            return data;
          }
        })()
      : data;

    if (eventHandler?.handler) {
      try {
        eventHandler.handler(this.client, transformedData, shardId);
      } catch (err) {
        Logger.error(
          `[EventManager] Error in event handler ${eventName}:`,
          err
        );
      }
    }

    if (eventHandler?.alias) {
      this.client.emit(eventHandler.alias, transformedData);
    }

    this.client.emit(eventName, transformedData);

    if (!eventHandler) {
      this.client.emit(eventName.toLowerCase(), data);
    }
  }
}

export default EventManager;
