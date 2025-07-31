import Client from "../../client/Client";

export interface ReadyHandler {
  name: string;
  alias: string;
  transform: (client: Client, rawData: any) => any;
  handler: (client: Client, message: any, shardId: number) => void;
}

const Ready: ReadyHandler = {
  name: "READY",
  alias: "onReady",
  transform: (client, rawData) => rawData,
  handler: (client, message, shardId) => {
    client.user = message.user;
  },
};

export default Ready;
