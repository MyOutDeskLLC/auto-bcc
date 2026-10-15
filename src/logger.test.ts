import {afterEach, describe, expect, it, vi} from "vitest";
import {composeLog, log, setDebugLogging} from "./logger";

afterEach(() => {
    setDebugLogging(false);
    vi.restoreAllMocks();
});

describe("log", () => {
    it("hides debug and info messages until debug logging is turned on", () => {
        const debug = vi.spyOn(console, "log").mockImplementation(() => {});
        const info = vi.spyOn(console, "info").mockImplementation(() => {});

        log.debug("hidden");
        log.info("hidden");
        expect(debug).not.toHaveBeenCalled();
        expect(info).not.toHaveBeenCalled();

        setDebugLogging(true);
        log.debug("shown");
        expect(debug).toHaveBeenCalledOnce();
    });

    it("always shows warnings, and warnOnce only once", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        log.warn("problem");
        log.warnOnce("repeated problem");
        log.warnOnce("repeated problem");
        expect(warn).toHaveBeenCalledTimes(2);
    });

    it("tags messages and names the compose window", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const details = new Error("boom");

        composeLog(":r1").error("Failed to fill in CC/BCC.", details);
        expect(error).toHaveBeenCalledWith("[AutoBCC] [compose :r1] Failed to fill in CC/BCC.", details);
    });

    it("styles debug messages with the AutoBCC tag", () => {
        const debug = vi.spyOn(console, "log").mockImplementation(() => {});
        setDebugLogging(true);

        composeLog(":r1").debug("Opened.");
        expect(debug).toHaveBeenCalledWith("%cAutoBCC%c [compose :r1] Opened.", expect.any(String), "");
    });
});
