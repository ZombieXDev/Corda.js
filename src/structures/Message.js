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
Object.defineProperty(exports, "__esModule", { value: true });
class Message {
    constructor(client, data) {
        var _a;
        this.client = client;
        this.id = data.id;
        this.channel_id = data.channel_id;
        this.guild_id = (_a = data.guild_id) !== null && _a !== void 0 ? _a : null;
        this.author = data.author;
        this.content = data.content;
        this.timestamp = new Date(data.timestamp);
    }
    reply(content) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.sendMessage(this.channel_id, { content });
        });
    }
}
exports.default = Message;
