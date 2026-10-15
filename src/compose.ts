import {log} from "./logger";

/**
 * Finds parts of Gmail's compose window without relying on English text. Gmail's display language changes every
 * label, so these use attributes that stay the same in every language, and only fall back to Gmail's class names,
 * which can change when Gmail is updated.
 */

const FALLBACK_COMPOSE_FORM_SELECTOR = "form.bAs";
const FALLBACK_FROM_SELECTOR = ".az2.az4.L3 span";
const FALLBACK_ADD_LINK_SELECTORS: Record<string, string> = {cc: ".aB.gQ.pE", bcc: ".aB.gQ.pB"};
// The keyboard shortcut Gmail shows on the "add Cc/Bcc recipients" links, e.g. "(⌘⇧C)" or "(Ctrl-Shift-B)".
const SHORTCUT_KEYS: Record<string, string> = {cc: "C", bcc: "B"};

const EMAIL_REGEX = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/;

// Every compose form has a hidden "composeid" input.
export const COMPOSE_MARKER_SELECTOR = `input[name="composeid"], ${FALLBACK_COMPOSE_FORM_SELECTOR}`;

export const findComposeForms = (root: ParentNode) => {
    const forms = [...root.querySelectorAll<HTMLInputElement>('input[name="composeid"]')]
        .map(input => input.closest("form"))
        .filter((form): form is HTMLFormElement => form !== null);
    const fallbackForms = [...root.querySelectorAll<HTMLFormElement>(FALLBACK_COMPOSE_FORM_SELECTOR)].filter(form => !forms.includes(form));
    if (fallbackForms.length) {
        log.warnOnce("Found a compose window only by Gmail's class name. Gmail may have changed its compose window.");
    }
    return [...forms, ...fallbackForms];
};

/**
 * Whether a label ends with the keyboard shortcut for `key`, ignoring the modifier keys and the invisible direction
 * marks Gmail wraps the shortcut in.
 *
 * @param label
 * @param key
 */
export const endsWithShortcut = (label: string, key: string) => {
    return new RegExp(`[^\\p{L}\\p{N}]${key}[^\\p{L}\\p{N}]*$`, "u").test(label);
};

/**
 * Finds the link that opens the "cc" or "bcc" field in a compose form.
 *
 * @param formElement
 * @param context
 */
export const findAddRecipientLink = (formElement: ParentNode, context: "cc" | "bcc") => {
    const link = [...formElement.querySelectorAll<HTMLElement>('[role="link"]')].find(element => {
        const label = element.getAttribute("aria-label") ?? element.getAttribute("data-tooltip") ?? "";
        return endsWithShortcut(label, SHORTCUT_KEYS[context]);
    });
    if (link) {
        return link;
    }
    const fallback = formElement.querySelector<HTMLElement>(FALLBACK_ADD_LINK_SELECTORS[context]);
    if (fallback) {
        log.warnOnce(`Found the "add ${context}" link only by Gmail's class name. Its label no longer ends with a keyboard shortcut.`);
    }
    return fallback;
};

/**
 * Finds the address the compose form is sending from, from Gmail's hidden "from" input.
 *
 * @param formElement
 */
export const findSender = (formElement: ParentNode) => {
    const value = formElement.querySelector<HTMLInputElement>('input[name="from"]')?.value
        || formElement.querySelector(FALLBACK_FROM_SELECTOR)?.textContent
        || "";
    return value.match(EMAIL_REGEX)?.[0] ?? null;
};
