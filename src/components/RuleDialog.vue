<template>
    <div class="backdrop" @click="emits('close')">
        <div class="dialog" role="dialog" aria-modal="true" :aria-label="title" @click.stop>
            <div class="header">
                <div class="title">{{ title }}</div>
                <button type="button" class="close" aria-label="Close" @click="emits('close')">×</button>
            </div>

            <div class="fields">
                <ChipInput v-model="senders" placeholder="name@domain.com or *@domain.com" :validate="validateSender"
                           hint="Press Enter after each address. Use *@domain.com to match everyone at a domain. The * must replace the whole name before the @.">
                    When I send mail from…
                </ChipInput>
                <ChipInput v-model="cc" placeholder="Optional" :validate="validateRecipient">…<b>CC</b> these people</ChipInput>
                <ChipInput v-model="bcc" placeholder="Optional" :validate="validateRecipient">…and <b>BCC</b> these people</ChipInput>
                <label class="checkbox">
                    <input v-model="excludeSameDomain" type="checkbox">
                    <span class="box" aria-hidden="true">{{ excludeSameDomain ? "✓" : "" }}</span>
                    Skip this rule when I'm emailing someone at my own domain
                </label>
            </div>

            <div class="preview">
                <RuleSummary v-if="canSave" :senders="senders" :cc="cc" :bcc="bcc" :exclude-same-domain="excludeSameDomain"/>
                <template v-else>
                    <span class="eyebrow">What this rule does</span>
                    <span class="muted">{{ incompleteMessage }}</span>
                </template>
            </div>

            <div class="actions">
                <button type="button" class="secondary" @click="emits('close')">Cancel</button>
                <button type="button" class="primary" :disabled="!canSave" @click="save">{{ editing ? "Save changes" : "Add rule" }}</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import {computed, onMounted, onUnmounted, ref} from "vue";
    import ChipInput from "./ChipInput.vue";
    import RuleSummary from "./RuleSummary.vue";
    import {validateRecipient, validateSender} from "../rules";
    import type {RuleDraft} from "../rules";

    const props = defineProps<{
        initial: RuleDraft;
        editing: boolean;
    }>();
    const emits = defineEmits<{
        (e: "save", draft: RuleDraft): void;
        (e: "close"): void;
    }>();

    const senders = ref([...props.initial.senders]);
    const cc = ref([...props.initial.cc]);
    const bcc = ref([...props.initial.bcc]);
    const excludeSameDomain = ref(props.initial.excludeSameDomain);

    const title = computed(() => props.editing ? "Edit rule" : "New rule");

    const canSave = computed(() => senders.value.length > 0 && cc.value.length + bcc.value.length > 0);

    const incompleteMessage = computed(() => {
        if (!senders.value.length && !cc.value.length && !bcc.value.length) {
            return "Add at least one sender and one person to copy.";
        }
        return senders.value.length ? "Add someone to CC or BCC to finish this rule." : "Add a sender to finish this rule.";
    });

    const save = () => {
        if (!canSave.value) {
            return;
        }
        emits("save", {
            senders: [...senders.value],
            cc: [...cc.value],
            bcc: [...bcc.value],
            excludeSameDomain: excludeSameDomain.value,
        });
    };

    const closeOnEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            emits("close");
        }
    };

    onMounted(() => document.addEventListener("keydown", closeOnEscape));
    onUnmounted(() => document.removeEventListener("keydown", closeOnEscape));
</script>

<style scoped>
    .backdrop {
        position: fixed;
        inset: 0;
        z-index: 10;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 40px 24px;
        overflow: auto;
        background: rgba(28, 25, 23, .45);
    }

    .dialog {
        width: 580px;
        max-width: 100%;
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, .25);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .title {
        font-size: 17px;
        font-weight: 700;
    }

    .close {
        font-size: 20px;
        color: var(--muted);
        line-height: 1;
        background: none;
        border: 0;
        padding: 4px;
    }

    .fields {
        display: flex;
        flex-direction: column;
        gap: 16px;
        font-size: 15px;
        line-height: 1.4;
    }

    .checkbox {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        cursor: pointer;
        user-select: none;
    }

    .checkbox input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
    }

    .checkbox .box {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        background: #fff;
        border: 1px solid var(--line-strong);
    }

    .checkbox input:checked + .box {
        background: var(--brand);
        border-color: var(--brand);
    }

    .checkbox input:focus-visible + .box {
        box-shadow: 0 0 0 3px var(--brand-ring);
    }

    .preview {
        background: var(--brand-wash);
        border: 1px solid var(--brand-line);
        border-radius: 8px;
        padding: 14px 16px;
        font-size: 13px;
    }

    .eyebrow {
        display: block;
        margin-bottom: 4px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .06em;
        text-transform: uppercase;
        color: var(--brand-dark);
    }

    .muted {
        color: var(--muted);
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
    }

    .actions button {
        padding: 9px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
    }

    .secondary {
        border: 1px solid var(--line);
        background: #fff;
    }

    .secondary:hover {
        background: var(--chip);
    }

    .primary {
        border: 0;
        color: #fff;
        background: var(--brand);
    }

    .primary:hover {
        background: var(--brand-hover);
    }

    .primary:disabled {
        background: var(--line-strong);
        cursor: not-allowed;
    }
</style>
