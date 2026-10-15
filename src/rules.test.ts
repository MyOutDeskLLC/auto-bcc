import {describe, expect, it} from "vitest";
import {
    applyDraft,
    findRuleForRecipient,
    findRuleForSender,
    isValidEmail,
    matchRuleForRecipient,
    normalizeRules,
    validateRecipient,
    validateSender,
} from "./rules";
import type {Rule, RuleDraft} from "./rules";

const rule = (overrides: Partial<Rule> = {}): Rule => ({
    bccEmails: [],
    ccEmails: [],
    excludedDomains: [],
    disabled: false,
    ...overrides,
});

const draft = (overrides: Partial<RuleDraft> = {}): RuleDraft => ({
    senders: [],
    cc: [],
    bcc: [],
    excludeSameDomain: false,
    ...overrides,
});

describe("normalizeRules", () => {
    it("returns an empty object when nothing is stored", () => {
        expect(normalizeRules(undefined)).toEqual({});
    });

    it("turns lists saved as index-keyed objects back into arrays", () => {
        const stored = {
            "a@b.com": {
                bccEmails: {"0": "x@y.com", "1": "z@y.com"},
                ccEmails: {"0": "c@c.com"},
                excludedDomains: {"0": "b.com"},
            },
        };

        expect(normalizeRules(stored)).toEqual({
            "a@b.com": rule({bccEmails: ["x@y.com", "z@y.com"], ccEmails: ["c@c.com"], excludedDomains: ["b.com"]}),
        });
    });

    it("fills in missing lists and keeps the paused flag", () => {
        expect(normalizeRules({"a@b.com": {bccEmails: ["x@y.com"], disabled: true}})).toEqual({
            "a@b.com": rule({bccEmails: ["x@y.com"], disabled: true}),
        });
    });
});

describe("validation", () => {
    it("accepts full addresses", () => {
        expect(isValidEmail("lance@myoutdesk.com")).toBe(true);
        expect(validateRecipient("lance@myoutdesk.com")).toBe("");
        expect(validateSender("lance@myoutdesk.com")).toBe("");
    });

    it("rejects incomplete addresses", () => {
        expect(isValidEmail("bob@")).toBe(false);
        expect(isValidEmail("bob@localhost")).toBe(false);
        expect(validateRecipient("bob@")).not.toBe("");
    });

    it("accepts *@domain wildcards only for senders", () => {
        expect(validateSender("*@myoutdesk.com")).toBe("");
        expect(validateRecipient("*@myoutdesk.com")).not.toBe("");
    });

    it("rejects wildcards that don't replace the whole name", () => {
        expect(validateSender("sales*@myoutdesk.com")).not.toBe("");
        expect(validateSender("*@*.myoutdesk.com")).not.toBe("");
        expect(validateSender("*@")).not.toBe("");
    });
});

describe("findRuleForSender", () => {
    const wildcard = rule({bccEmails: ["wild@x.com"]});
    const exact = rule({bccEmails: ["exact@x.com"]});
    const rules = {"*@myoutdesk.com": wildcard, "boss@myoutdesk.com": exact};

    it("prefers a rule for the exact address", () => {
        expect(findRuleForSender(rules, "boss@myoutdesk.com")).toBe(exact);
    });

    it("falls back to a matching wildcard rule, ignoring case", () => {
        expect(findRuleForSender(rules, "lance@myoutdesk.com")).toBe(wildcard);
        expect(findRuleForSender(rules, "Lance@MyOutDesk.com")).toBe(wildcard);
    });

    it("treats dots in the pattern literally", () => {
        expect(findRuleForSender(rules, "x@myoutdeskXcom")).toBeNull();
        expect(findRuleForSender(rules, "a@evilmyoutdesk.com")).toBeNull();
    });

    it("skips paused rules", () => {
        const paused = {"*@myoutdesk.com": wildcard, "boss@myoutdesk.com": rule({disabled: true})};
        expect(findRuleForSender(paused, "boss@myoutdesk.com")).toBe(wildcard);
        expect(findRuleForSender({"*@myoutdesk.com": rule({disabled: true})}, "lance@myoutdesk.com")).toBeNull();
    });

    it("returns null when nothing matches", () => {
        expect(findRuleForSender(rules, "someone@other.com")).toBeNull();
        expect(findRuleForSender({}, "lance@myoutdesk.com")).toBeNull();
    });
});

describe("findRuleForRecipient", () => {
    const companyRule = rule({bccEmails: ["crm@myoutdesk.com"], excludedDomains: ["myoutdesk.com"]});
    const rules = {"*@myoutdesk.com": companyRule};

    it("applies the sender's rule to outside recipients", () => {
        expect(findRuleForRecipient(rules, "lance@myoutdesk.com", "client@acme.com")).toBe(companyRule);
    });

    it("skips recipients at an excluded domain", () => {
        expect(findRuleForRecipient(rules, "lance@myoutdesk.com", "coworker@myoutdesk.com")).toBeNull();
    });

    it("returns null without a sender or a recipient domain", () => {
        expect(findRuleForRecipient(rules, null, "client@acme.com")).toBeNull();
        expect(findRuleForRecipient(rules, "lance@myoutdesk.com", "not-an-email")).toBeNull();
    });
});

describe("applyDraft", () => {
    it("creates one rule per sender", () => {
        const result = applyDraft({}, draft({senders: ["a@x.com", "*@y.com"], bcc: ["crm@z.com"]}), null);

        expect(result).toEqual({
            "a@x.com": rule({bccEmails: ["crm@z.com"]}),
            "*@y.com": rule({bccEmails: ["crm@z.com"]}),
        });
    });

    it("excludes every sender's domain when skipping the same domain", () => {
        const result = applyDraft({}, draft({senders: ["a@x.com", "*@y.com"], cc: ["c@z.com"], excludeSameDomain: true}), null);

        expect(result["a@x.com"].excludedDomains).toEqual(["x.com", "y.com"]);
    });

    it("merges a new rule into an existing rule for the same sender", () => {
        const rules = {"a@x.com": rule({bccEmails: ["old@z.com"], ccEmails: ["c@z.com"], disabled: true})};
        const result = applyDraft(rules, draft({senders: ["a@x.com"], bcc: ["new@z.com", "old@z.com"]}), null);

        expect(result["a@x.com"]).toEqual(rule({bccEmails: ["new@z.com", "old@z.com"], ccEmails: ["c@z.com"], disabled: true}));
    });

    it("replaces the rule being edited and keeps it paused", () => {
        const rules = {"a@x.com": rule({bccEmails: ["old@z.com"], disabled: true})};
        const result = applyDraft(rules, draft({senders: ["a@x.com"], bcc: ["new@z.com"]}), "a@x.com");

        expect(result).toEqual({"a@x.com": rule({bccEmails: ["new@z.com"], disabled: true})});
    });

    it("moves the rule when the edited sender is renamed", () => {
        const rules = {"a@x.com": rule({bccEmails: ["crm@z.com"]})};
        const result = applyDraft(rules, draft({senders: ["b@x.com"], bcc: ["crm@z.com"]}), "a@x.com");

        expect(Object.keys(result)).toEqual(["b@x.com"]);
    });

    it("leaves the original rules untouched", () => {
        const rules = {"a@x.com": rule({bccEmails: ["crm@z.com"]})};
        applyDraft(rules, draft({senders: ["b@x.com"], bcc: ["new@z.com"]}), "a@x.com");

        expect(rules).toEqual({"a@x.com": rule({bccEmails: ["crm@z.com"]})});
    });
});

describe("matchRuleForRecipient", () => {
    const rules = {"*@myoutdesk.com": rule({excludedDomains: ["myoutdesk.com"]}), "paused@x.com": rule({disabled: true})};

    it("explains why no rule applies", () => {
        expect(matchRuleForRecipient(rules, null, "a@b.com").reason).toBe("couldn't find the sender's address");
        expect(matchRuleForRecipient(rules, "lance@myoutdesk.com", "nobody").reason).toBe(`"nobody" isn't an email address`);
        expect(matchRuleForRecipient(rules, "paused@x.com", "a@b.com").reason).toBe("no active rule for sender paused@x.com");
        expect(matchRuleForRecipient(rules, "lance@myoutdesk.com", "a@myoutdesk.com").reason).toBe("myoutdesk.com is excluded by the rule for lance@myoutdesk.com");
    });

    it("returns the rule with no reason when it applies", () => {
        expect(matchRuleForRecipient(rules, "lance@myoutdesk.com", "a@b.com")).toEqual({rule: rules["*@myoutdesk.com"], reason: ""});
    });
});
