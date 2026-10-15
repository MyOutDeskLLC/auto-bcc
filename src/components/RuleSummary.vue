<template>
    <div class="summary">
        <span class="eyebrow">What this rule does</span>
        <span class="muted">When mail goes out from</span>
        <div class="chips">
            <span v-for="sender in senders" :key="sender" class="chip sender">{{ describeSender(sender) }}</span>
        </div>
        <template v-if="cc.length">
            <span class="muted">send <b>CC</b> to</span>
            <div class="chips"><span v-for="email in cc" :key="email" class="chip">{{ email }}</span></div>
        </template>
        <template v-if="bcc.length">
            <span class="muted">send <b>BCC</b> to</span>
            <div class="chips"><span v-for="email in bcc" :key="email" class="chip">{{ email }}</span></div>
        </template>
        <span class="note">
            {{ excludeSameDomain ? "Skipped when the email is addressed to someone at the sender's own domain." : "Applies even when the email is addressed to someone at the sender's own domain." }}
        </span>
        <span v-if="paused" class="note">This rule is paused and won't run until you turn it back on.</span>
    </div>
</template>

<script setup lang="ts">
    defineProps<{
        senders: string[];
        cc: string[];
        bcc: string[];
        excludeSameDomain: boolean;
        paused?: boolean;
    }>();

    const describeSender = (sender: string) => sender.startsWith("*@") ? `anyone ${sender.slice(1)}` : sender;
</script>

<style scoped>
    .summary {
        flex: 1;
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 10px 16px;
        align-items: baseline;
    }

    .eyebrow {
        grid-column: 1 / -1;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .06em;
        text-transform: uppercase;
        color: var(--brand-dark);
    }

    .muted {
        color: var(--muted);
    }

    .muted b {
        color: var(--ink);
    }

    .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .chip {
        padding: 3px 8px;
        border-radius: 6px;
        background: #fff;
        border: 1px solid var(--line);
        overflow-wrap: anywhere;
    }

    .chip.sender {
        border-color: var(--brand-line);
        font-weight: 600;
    }

    .note {
        grid-column: 1 / -1;
        color: var(--muted);
        font-size: 12px;
    }
</style>
