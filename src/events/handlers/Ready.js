"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Ready = {
    name: "READY",
    alias: "onReady",
    transform: (client, rawData) => rawData,
    handler: (client, message, shardId) => {
        client.user = message.user;
    },
};
exports.default = Ready;
