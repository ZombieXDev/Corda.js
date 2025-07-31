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
const index_js_1 = require("../../src/index.js");
const client = new index_js_1.Client({
    token: "YOUR_BOT_TOKEN",
    intents: index_js_1.Constants.DefaultIntents,
    presence: {
        status: "online",
        activities: [{ name: "My Awesome Bot", type: 0 }],
    },
    debug: true,
});
client
    .on("onReady", () => {
    console.log(`${client.user.username} is ready!`);
})
    .on("messageCreate", (message) => __awaiter(void 0, void 0, void 0, function* () {
    if (message.author.bot)
        return;
    if (message.content === "!ping") {
        client.sendMessage(message.channel_id, "🏓 Pong!");
    }
}));
client.login();
client.OnShutDown();
