// Minimal structured logger shared by all data apps.
export type LogLevel = "debug" | "info" | "warn" | "error";

function format(level: LogLevel, service: string, message: string): string {
  return JSON.stringify({ ts: new Date().toISOString(), level, service, message });
}

export function createLogger(service: string): Record<LogLevel, (message: string) => void> {
  const emit = (level: LogLevel) => (message: string): void => {
    if (level === "error") console.error(format(level, service, message));
    else console.log(format(level, service, message));
  };
  return { debug: emit("debug"), info: emit("info"), warn: emit("warn"), error: emit("error") };
}
