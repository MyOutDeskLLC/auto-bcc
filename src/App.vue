<template>
    <div class="page">
        <header class="topbar">
            <div class="brand"><img class="mark" :src="logoUrl" alt=""><span>Auto BCC</span></div>
            <div class="options">
                <label class="option">Off by default<Toggle v-model="options.offByDefault"/></label>
                <label class="option">Hide inline button<Toggle v-model="options.hideInlineButton"/></label>
                <span class="reload-note">Reload Gmail after changing options</span>
            </div>
        </header>

        <main class="content">
            <div class="list-header">
                <h1>Rules <span class="count">· {{ senders.length }}</span></h1>
                <button type="button" class="primary" @click="openNewRule">+ New rule</button>
            </div>

            <div class="rules-table">
                <div class="row head">
                    <div>On</div><div>When sending from</div><div>CC</div><div>BCC</div><div>Same domain</div><div></div>
                </div>

                <template v-for="sender in senders" :key="sender">
                    <div class="row" :class="{paused: rules[sender].disabled}">
                        <Toggle :model-value="!rules[sender].disabled" label="Pause / resume" @update:model-value="togglePaused(sender)"/>
                        <div class="sender">
                            <span>{{ sender }}</span>
                            <button type="button" class="help" :class="{open: helpSender === sender}" aria-label="Explain this rule"
                                    title="Explain in plain English" @click="helpSender = helpSender === sender ? null : sender">?</button>
                        </div>
                        <div :class="{empty: !rules[sender].ccEmails.length}">{{ rules[sender].ccEmails.join(", ") || "—" }}</div>
                        <div :class="{empty: !rules[sender].bccEmails.length}">{{ rules[sender].bccEmails.join(", ") || "—" }}</div>
                        <div class="muted">{{ rules[sender].excludedDomains.length ? "Skipped" : "Included" }}</div>
                        <div v-if="confirmingDelete === sender" class="actions">
                            <button type="button" class="text-button" @click="confirmingDelete = null">Keep</button>
                            <button type="button" class="text-button danger" @click="deleteRule(sender)">Delete</button>
                        </div>
                        <div v-else class="actions">
                            <button type="button" class="icon-button" title="Edit" aria-label="Edit rule" @click="openEditRule(sender)">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>
                                    <path d="m15 5 4 4"/>
                                </svg>
                            </button>
                            <button type="button" class="icon-button delete" title="Delete" aria-label="Delete rule" @click="confirmingDelete = sender">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M3 6h18"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    <path d="M10 11v6M14 11v6"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div v-if="helpSender === sender" class="help-panel">
                        <div class="help-card">
                            <RuleSummary :senders="[sender]" :cc="rules[sender].ccEmails" :bcc="rules[sender].bccEmails"
                                         :exclude-same-domain="rules[sender].excludedDomains.length > 0" :paused="rules[sender].disabled"/>
                            <button type="button" class="close" aria-label="Close" @click="helpSender = null">×</button>
                        </div>
                    </div>
                </template>

                <div v-if="!senders.length" class="empty-state">
                    No rules yet. Add one and mail from matching senders will be copied automatically.
                </div>
            </div>
        </main>

        <footer class="footer">
            Built by developers @
            <a href="https://myoutdesk.com?utm_source=chrome&utm_medium=extension&utm_campaign=autobcc" target="_blank" rel="noopener">MyOutDesk</a>
        </footer>

        <RuleDialog v-if="dialog" :initial="dialog.draft" :editing="dialog.editing !== null" @close="dialog = null" @save="saveDraft"/>
    </div>
</template>


<script setup lang="ts">
    import "./app.css";
    import logoUrl from "./icons/logo.png";
    import Toggle from "./components/Toggle.vue";
    import RuleDialog from "./components/RuleDialog.vue";
    import RuleSummary from "./components/RuleSummary.vue";
    import {applyDraft, normalizeRules} from "./rules";
    import type {Rule, RuleDraft} from "./rules";

    import {computed, onMounted, reactive, ref, watch} from "vue";

    const rules = ref<Record<string, Rule>>({});
    const senders = computed(() => Object.keys(rules.value));
    const options = reactive({
        offByDefault: false,
        hideInlineButton: false
    });

    const helpSender = ref<string | null>(null);
    const confirmingDelete = ref<string | null>(null);
    // `editing` is the sender of the rule being edited, or null for a new rule.
    const dialog = ref<{ editing: string | null, draft: RuleDraft } | null>(null);

    watch(options, (newOptions) => {
        saveOptions(newOptions)
    })

    function getRulesFromStorage() {
        chrome.storage.local.get("rules", (data: Record<string, any>) => {
            rules.value = normalizeRules(data.rules);
        });
    }

    function getOptionsFromStorage() {
        chrome.storage.local.get("options", (data: Record<string, any>) => {
            let tmpOptions = data && data.options ? data.options : {
                offByDefault: false
            };

            Object.keys(tmpOptions).forEach((key) => {
                //@ts-ignore
                options[key] = tmpOptions[key];
            })
        });
    }

    function saveRules() {
        // chrome.storage turns arrays inside Vue's reactive proxies into objects, so save a plain copy.
        chrome.storage.local.set({rules: JSON.parse(JSON.stringify(rules.value))}, () => {
        });
    }

    function saveOptions(options: Record<string, any>) {
        chrome.storage.local.set({options: options}, () => {
        });
    }

    function deleteRule(sender: string) {
        delete rules.value[sender];
        confirmingDelete.value = null;
        if (helpSender.value === sender) {
            helpSender.value = null;
        }
        saveRules();
    }

    function togglePaused(sender: string) {
        rules.value[sender].disabled = !rules.value[sender].disabled;
        saveRules();
    }

    function openNewRule() {
        dialog.value = {editing: null, draft: {senders: [], cc: [], bcc: [], excludeSameDomain: true}};
    }

    function openEditRule(sender: string) {
        const rule = rules.value[sender];
        dialog.value = {
            editing: sender,
            draft: {senders: [sender], cc: [...rule.ccEmails], bcc: [...rule.bccEmails], excludeSameDomain: rule.excludedDomains.length > 0},
        };
    }

    function saveDraft(draft: RuleDraft) {
        rules.value = applyDraft(rules.value, draft, dialog.value?.editing ?? null);
        saveRules();
        dialog.value = null;
    }

    onMounted(() => {
        getRulesFromStorage();
        getOptionsFromStorage();
    });

</script>

<style scoped>
    .page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        padding: 14px 32px;
        border-bottom: 1px solid var(--line);
        background: #fff;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        font-weight: 700;
    }

    .mark {
        width: 24px;
        height: 24px;
    }

    .options {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 24px;
        font-size: 13px;
    }

    .option {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
    }

    .reload-note {
        font-size: 12px;
        color: var(--muted);
    }

    .content {
        flex: 1;
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 28px 32px;
    }

    .list-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
    }

    h1 {
        font-size: 20px;
        font-weight: 700;
    }

    .count {
        color: var(--muted);
        font-weight: 500;
        font-size: 16px;
    }

    .primary {
        padding: 9px 16px;
        border-radius: 8px;
        border: 0;
        background: var(--brand);
        color: #fff;
        font-size: 14px;
        font-weight: 600;
    }

    .primary:hover {
        background: var(--brand-hover);
    }

    .rules-table {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 10px;
        overflow: hidden;
    }

    .row {
        display: grid;
        grid-template-columns: 56px 1.3fr 1fr 1fr 110px 64px;
        gap: 12px;
        align-items: center;
        padding: 14px 16px;
        font-size: 13px;
        border-bottom: 1px solid var(--line-soft);
        transition: opacity .15s;
    }

    .row > div {
        min-width: 0;
        overflow-wrap: anywhere;
    }

    .row:not(.head):hover {
        background: var(--surface-hover);
    }

    .row.head {
        padding: 10px 16px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .06em;
        text-transform: uppercase;
        color: var(--muted);
        border-bottom-color: var(--line);
    }

    .row.paused {
        opacity: .6;
    }

    .sender {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
    }

    .help {
        flex: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 1px solid var(--line-strong);
        background: #fff;
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        line-height: 1;
    }

    .help:hover {
        border-color: var(--brand);
        color: var(--brand);
    }

    .help.open {
        border-color: var(--brand);
        background: var(--brand);
        color: #fff;
    }

    .empty {
        color: var(--faint);
    }

    .muted {
        color: var(--muted);
    }

    .actions {
        display: flex;
        gap: 4px;
        justify-content: flex-end;
        align-items: center;
        white-space: nowrap;
    }

    .icon-button {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1px solid var(--line);
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        color: var(--muted);
    }

    .icon-button svg {
        width: 14px;
        height: 14px;
    }

    .icon-button:hover {
        border-color: var(--brand);
        color: var(--brand);
    }

    .icon-button.delete:hover {
        border-color: var(--danger);
        color: var(--danger);
    }

    .text-button {
        padding: 5px 8px;
        border-radius: 6px;
        border: 1px solid var(--line);
        background: #fff;
        font-weight: 600;
        font-size: 12px;
    }

    .text-button.danger {
        border: 0;
        background: var(--danger);
        color: #fff;
    }

    .help-panel {
        padding: 14px 16px 14px 84px;
        border-bottom: 1px solid var(--line-soft);
        background: var(--surface-hover);
    }

    .help-card {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: 14px 16px;
        border-radius: 8px;
        background: var(--brand-wash);
        border: 1px solid var(--brand-line);
        font-size: 13px;
    }

    .close {
        background: none;
        border: 0;
        color: var(--muted);
        font-size: 16px;
        line-height: 1;
        padding: 2px;
    }

    .close:hover {
        color: var(--ink);
    }

    .empty-state {
        padding: 40px 16px;
        text-align: center;
        font-size: 13px;
        color: var(--muted);
    }

    .footer {
        padding: 16px;
        text-align: center;
        font-size: 12px;
        color: var(--muted);
    }

    @media (max-width: 760px) {
        .topbar, .content {
            padding-left: 16px;
            padding-right: 16px;
        }

        .row {
            grid-template-columns: 1fr auto;
        }

        .row.head {
            display: none;
        }

        .help-panel {
            padding-left: 16px;
        }
    }
</style>
