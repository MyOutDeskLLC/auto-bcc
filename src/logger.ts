/**
 * Console logging for the content script. Debug and info messages only show when "Debug logs" is turned on in the
 * options, so Gmail's console stays quiet for everyone else. Warnings and errors always show.
 */

const TAG = "%cAutoBCC";
const TAG_STYLE = "background: #EF6A02; color: #fff; padding: 1px 6px; border-radius: 4px; font-weight: 600;";

let debugEnabled = false;
const warned = new Set<string>();

export const setDebugLogging = (enabled: boolean) => {
    debugEnabled = enabled;
};

// Debug messages use console.log because Chrome hides console.debug unless the console's "Verbose" level is on.
// Warnings and errors also appear on the extension's Errors page in chrome://extensions, which prints styling
// directives as raw text, so those are written unstyled.
const write = (method: "log" | "info" | "warn" | "error", message: string, details: unknown[]) => {
    if (method === "warn" || method === "error") {
        console[method](`[AutoBCC] ${message}`, ...details);
        return;
    }
    console[method](`${TAG}%c ${message}`, TAG_STYLE, "", ...details);
};

export const log = {
    debug: (message: string, ...details: unknown[]) => {
        if (debugEnabled) {
            write("log", message, details);
        }
    },
    info: (message: string, ...details: unknown[]) => {
        if (debugEnabled) {
            write("info", message, details);
        }
    },
    warn: (message: string, ...details: unknown[]) => write("warn", message, details),
    error: (message: string, ...details: unknown[]) => write("error", message, details),
    /**
     * Warns once per page load, for problems that would otherwise repeat on every compose window.
     */
    warnOnce: (message: string, ...details: unknown[]) => {
        if (!warned.has(message)) {
            warned.add(message);
            write("warn", message, details);
        }
    },
};

/**
 * Prefixes messages with the compose window they are about, e.g. "[compose :r1] Added BCC: a@b.com".
 *
 * @param formId
 */
export const composeLog = (formId: string) => ({
    debug: (message: string, ...details: unknown[]) => log.debug(`[compose ${formId}] ${message}`, ...details),
    info: (message: string, ...details: unknown[]) => log.info(`[compose ${formId}] ${message}`, ...details),
    warn: (message: string, ...details: unknown[]) => log.warn(`[compose ${formId}] ${message}`, ...details),
    error: (message: string, ...details: unknown[]) => log.error(`[compose ${formId}] ${message}`, ...details),
});
