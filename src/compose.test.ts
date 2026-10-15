// @vitest-environment happy-dom
import {beforeEach, describe, expect, it} from "vitest";
import {COMPOSE_MARKER_SELECTOR, endsWithShortcut, findAddRecipientLink, findComposeForms, findSender} from "./compose";

// The attributes Gmail renders in a compose window with its display language set to German. Gmail's class names are
// left off so the tests prove the lookups don't depend on them.
const germanCompose = `
    <form id="compose">
        <span role="link" data-tooltip="Kontakte auswählen" aria-label="An – Kontakte auswählen"></span>
        <span id=":oy" role="link" data-tooltip="Cc-Empfänger hinzufügen (⌘⇧C)" aria-label="Cc-Empfänger hinzufügen ‪(⌘⇧C)‬"></span>
        <span id=":ox" role="link" data-tooltip="Bcc-Empfänger hinzufügen (⌘⇧B)" aria-label="Bcc-Empfänger hinzufügen ‪(⌘⇧B)‬"></span>
        <span role="link" data-tooltip="Kontakte auswählen" aria-label="Cc – Kontakte auswählen"></span>
        <span role="link" data-tooltip="Kontakte auswählen" aria-label="Bcc – Kontakte auswählen"></span>
        <input name="composeid" type="hidden">
        <input name="from" type="hidden" value="lancet@myoutdesk.com">
    </form>
`;

beforeEach(() => {
    document.body.innerHTML = germanCompose;
});

describe("endsWithShortcut", () => {
    it("matches Mac and Windows shortcut labels in any language", () => {
        expect(endsWithShortcut("Cc-Empfänger hinzufügen (⌘⇧C)", "C")).toBe(true);
        expect(endsWithShortcut("Add Cc recipients (Ctrl-Shift-C)", "C")).toBe(true);
        expect(endsWithShortcut("Ajouter des destinataires en Cci (Ctrl+Maj+B)", "B")).toBe(true);
        expect(endsWithShortcut("Bcc-Empfänger hinzufügen ‪(⌘⇧B)‬", "B")).toBe(true);
    });

    it("does not match other labels or keys", () => {
        expect(endsWithShortcut("Bcc-Empfänger hinzufügen (⌘⇧B)", "C")).toBe(false);
        expect(endsWithShortcut("Cc – Kontakte auswählen", "C")).toBe(false);
        expect(endsWithShortcut("ABC", "C")).toBe(false);
    });
});

describe("findAddRecipientLink", () => {
    it("finds the Cc and Bcc links by their shortcut keys", () => {
        const form = document.querySelector("form")!;
        expect(findAddRecipientLink(form, "cc")?.id).toBe(":oy");
        expect(findAddRecipientLink(form, "bcc")?.id).toBe(":ox");
    });

    it("finds the Bcc link after the Cc field has been opened", () => {
        document.getElementById(":oy")!.remove();
        const form = document.querySelector("form")!;
        expect(findAddRecipientLink(form, "cc")).toBeNull();
        expect(findAddRecipientLink(form, "bcc")?.id).toBe(":ox");
    });

    it("falls back to Gmail's class names", () => {
        document.body.innerHTML = `<form><span class="aB gQ pE" id="cc"></span><span class="aB gQ pB" id="bcc"></span></form>`;
        const form = document.querySelector("form")!;
        expect(findAddRecipientLink(form, "cc")?.id).toBe("cc");
        expect(findAddRecipientLink(form, "bcc")?.id).toBe("bcc");
    });
});

describe("findSender", () => {
    it("reads the sender from the hidden from input", () => {
        expect(findSender(document.querySelector("form")!)).toBe("lancet@myoutdesk.com");
    });

    it("falls back to the visible from field", () => {
        document.body.innerHTML = `<form><input name="from" type="hidden" value=""><div class="az2 az4 L3"><span>Lance &lt;sales@myoutdesk.com&gt;</span></div></form>`;
        expect(findSender(document.querySelector("form")!)).toBe("sales@myoutdesk.com");
    });

    it("returns null when there is no sender", () => {
        document.body.innerHTML = `<form></form>`;
        expect(findSender(document.querySelector("form")!)).toBeNull();
    });
});

describe("findComposeForms", () => {
    it("finds compose forms by their hidden composeid input", () => {
        document.body.innerHTML = germanCompose + `<form id="search"><input name="q"></form>`;
        expect(findComposeForms(document).map(form => form.id)).toEqual(["compose"]);
        expect(document.body.querySelector(COMPOSE_MARKER_SELECTOR)).not.toBeNull();
    });

    it("finds each compose form once when both markers match", () => {
        document.body.innerHTML = `<form class="bAs" id="compose"><input name="composeid"></form>`;
        expect(findComposeForms(document).map(form => form.id)).toEqual(["compose"]);
    });
});
