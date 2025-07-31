"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Message_1 = __importDefault(require("../../structures/Message"));
const MessageCreate = {
    name: "MESSAGE_CREATE",
    alias: "messageCreate",
    transform: (client, rawData) => {
        return new Message_1.default(client, rawData);
    },
    handler: (client, message, shardId) => {
        // here you can handle the message event
        console.log(`Message from ${message.author.username}: ${message.content}`);
    },
};
exports.default = MessageCreate;
