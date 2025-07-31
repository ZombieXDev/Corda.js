"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
let debugEnabled = false;
const Logger = {
    setDebug(enabled) {
        debugEnabled = enabled;
    },
    info: (...args) => {
        if (!debugEnabled)
            return;
        console.log(chalk_1.default.blue("[INFO]"), ...args);
    },
    warn: (...args) => {
        if (!debugEnabled)
            return;
        console.warn(chalk_1.default.yellow("[WARN]"), ...args);
    },
    error: (...args) => {
        if (!debugEnabled)
            return;
        console.error(chalk_1.default.red("[ERROR]"), ...args);
    },
    debug: (...args) => {
        if (!debugEnabled)
            return;
        console.log(chalk_1.default.gray("[DEBUG]"), ...args);
    },
};
exports.default = Logger;
