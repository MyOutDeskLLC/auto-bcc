export type Rule = {
    bccEmails: string[];
    ccEmails: string[];
    excludedDomains: string[];
    // Paused rules stay saved but are not applied.
    disabled: boolean;
};

// What the rule dialog edits. One draft can cover several senders, which are saved as one rule each.
export type RuleDraft = {
    senders: string[];
    cc: string[];
    bcc: string[];
    excludeSameDomain: boolean;
};

/**
 * Older versions saved rules straight from Vue's reactive proxies, which chrome.storage stores as objects keyed by
 * index ({"0": "a@b.com"}) instead of arrays. Turn those back into arrays so stored rules always have the same shape.
 *
 * @param rules
 */
export const normalizeRules = (rules: Record<string, any> | undefined) => {
    const toArray = (value: any): string[] => {
        if (Array.isArray(value)) {
            return value;
        }
        return value && typeof value === "object" ? Object.values(value) : [];
    };

    const normalized: Record<string, Rule> = {};
    Object.keys(rules ?? {}).forEach(sender => {
        normalized[sender] = {
            bccEmails: toArray(rules![sender]?.bccEmails),
            ccEmails: toArray(rules![sender]?.ccEmails),
            excludedDomains: toArray(rules![sender]?.excludedDomains),
            disabled: rules![sender]?.disabled === true,
        };
    });
    return normalized;
};

const unique = (items: string[]) => items.filter((item, index) => items.indexOf(item) === index);

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const isValidEmail = (value: string) => EMAIL_REGEX.test(value) && !value.includes("*");

/**
 * A sender is either a full address or *@domain.com, where the * replaces the whole name before the @. Returns an
 * error message, or an empty string when the value is valid.
 *
 * @param value
 */
export const validateSender = (value: string) => {
    if (isValidEmail(value) || (value.startsWith("*@") && isValidEmail(`a${value.slice(1)}`))) {
        return "";
    }
    return "Enter a full address, or *@domain.com to match everyone at a domain.";
};

export const validateRecipient = (value: string) => isValidEmail(value) ? "" : "Enter a full email address.";

/**
 * Finds the rule for a sender. A rule for the exact address wins, otherwise the first rule whose wildcard pattern
 * (e.g. *@example.com) matches the sender is used. Paused rules are skipped.
 *
 * @param rules
 * @param sender
 */
export const findRuleForSender = (rules: Record<string, Rule>, sender: string) => {
    if (rules[sender] && !rules[sender].disabled) {
        return rules[sender];
    }

    const pattern = Object.keys(rules).find(key => {
        if (!key.includes("*") || rules[key].disabled) {
            return false;
        }
        const escaped = key.split("*").map(part => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
        return new RegExp(`^${escaped}$`, "i").test(sender);
    });

    return pattern ? rules[pattern] : null;
};

/**
 * Finds the rule to apply when `sender` emails `recipient`. When none applies, `reason` says why.
 *
 * @param rules
 * @param sender
 * @param recipient
 */
export const matchRuleForRecipient = (rules: Record<string, Rule>, sender: string | null, recipient: string): {rule: Rule | null, reason: string} => {
    const targetDomain = recipient.split("@")[1];
    if (!sender) {
        return {rule: null, reason: "couldn't find the sender's address"};
    }
    if (!targetDomain) {
        return {rule: null, reason: `"${recipient}" isn't an email address`};
    }
    const rule = findRuleForSender(rules, sender);
    if (!rule) {
        return {rule: null, reason: `no active rule for sender ${sender}`};
    }
    if (rule.excludedDomains.includes(targetDomain)) {
        return {rule: null, reason: `${targetDomain} is excluded by the rule for ${sender}`};
    }
    return {rule, reason: ""};
};

/**
 * Finds the rule to apply when `sender` emails `recipient`, or null when no rule matches or the recipient's domain is
 * excluded by the rule.
 *
 * @param rules
 * @param sender
 * @param recipient
 */
export const findRuleForRecipient = (rules: Record<string, Rule>, sender: string | null, recipient: string) => {
    return matchRuleForRecipient(rules, sender, recipient).rule;
};

/**
 * Rules are stored one per sender, so a draft with several senders becomes several rules. The rule being edited is
 * replaced, and any other sender that already has a rule gets the new recipients merged into it. Returns a new rules
 * object and leaves `rules` untouched.
 *
 * @param rules
 * @param draft
 * @param editing the sender of the rule being edited, or null for a new rule
 */
export const applyDraft = (rules: Record<string, Rule>, draft: RuleDraft, editing: string | null) => {
    const updated = {...rules};
    const original = editing ? rules[editing] : null;
    const excludedDomains = draft.excludeSameDomain ? unique(draft.senders.map(sender => sender.split("@")[1])) : [];

    if (editing && !draft.senders.includes(editing)) {
        delete updated[editing];
    }

    draft.senders.forEach(sender => {
        const existing = rules[sender];
        if (existing && sender !== editing) {
            updated[sender] = {
                bccEmails: unique([...draft.bcc, ...existing.bccEmails]),
                ccEmails: unique([...draft.cc, ...existing.ccEmails]),
                excludedDomains: unique([...excludedDomains, ...existing.excludedDomains]),
                disabled: existing.disabled,
            };
            return;
        }
        updated[sender] = {
            bccEmails: [...draft.bcc],
            ccEmails: [...draft.cc],
            excludedDomains: [...excludedDomains],
            disabled: original?.disabled ?? false,
        };
    });

    return updated;
};
