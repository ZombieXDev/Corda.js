import chalk from "chalk";
let debugEnabled = false;

const Logger = {
  setDebug(enabled: boolean) {
    debugEnabled = enabled;
  },
  info: (...args: any[]) => {
    if (!debugEnabled) return;
    console.log(chalk.blue("[INFO]"), ...args);
  },
  warn: (...args: any[]) => {
    if (!debugEnabled) return;
    console.warn(chalk.yellow("[WARN]"), ...args);
  },
  error: (...args: any[]) => {
    if (!debugEnabled) return;
    console.error(chalk.red("[ERROR]"), ...args);
  },
  debug: (...args: any[]) => {
    if (!debugEnabled) return;
    console.log(chalk.gray("[DEBUG]"), ...args);
  },
};

export default Logger;
