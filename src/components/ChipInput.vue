<template>
    <div class="field">
        <span class="label"><slot/></span>
        <label class="box" :class="{focused, invalid: !!error}">
            <span v-for="(chip, index) in modelValue" :key="chip" class="chip" :class="{wildcard: isWildcard(chip)}">
                {{ chip }}
                <button type="button" :aria-label="`Remove ${chip}`" @click.prevent="remove(index)">×</button>
            </span>
            <input v-model="draft" type="text" :placeholder="modelValue.length ? 'Add another' : placeholder"
                   @input="error = ''" @focus="focused = true" @blur="onBlur" @keydown="onKeydown">
        </label>
        <div v-if="error" class="message error">{{ error }}</div>
        <div v-else-if="hint" class="message">{{ hint }}</div>
    </div>
</template>

<script setup lang="ts">
    import {ref} from "vue";

    const props = defineProps<{
        modelValue: string[];
        placeholder: string;
        // Returns an error message for an invalid entry, or an empty string when it is valid.
        validate: (value: string) => string;
        hint?: string;
    }>();
    const emits = defineEmits(["update:modelValue"]);

    const draft = ref("");
    const error = ref("");
    const focused = ref(false);

    const isWildcard = (chip: string) => chip.startsWith("*@");

    const commit = () => {
        const value = draft.value.trim().replace(/,$/, "");
        if (!value) {
            return;
        }
        error.value = props.validate(value);
        if (error.value) {
            return;
        }
        if (!props.modelValue.includes(value)) {
            emits("update:modelValue", [...props.modelValue, value]);
        }
        draft.value = "";
    };

    const remove = (index: number) => {
        emits("update:modelValue", props.modelValue.filter((_, i) => i !== index));
    };

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === "," || e.key === " ") {
            e.preventDefault();
            commit();
        } else if (e.key === "Backspace" && !draft.value && props.modelValue.length) {
            remove(props.modelValue.length - 1);
        }
    };

    const onBlur = () => {
        commit();
        focused.value = false;
    };
</script>

<style scoped>
    .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .label {
        color: var(--muted);
    }

    .label :deep(b) {
        color: var(--ink);
    }

    .box {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 7px;
        border-radius: 8px;
        min-height: 40px;
        align-items: center;
        cursor: text;
        border: 1px solid var(--line);
    }

    .box.focused {
        border-color: var(--brand);
        box-shadow: 0 0 0 3px var(--brand-ring);
    }

    .box.invalid {
        border-color: var(--danger);
        box-shadow: 0 0 0 3px var(--danger-ring);
    }

    .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px 4px 10px;
        border-radius: 6px;
        font-size: 13px;
        background: var(--chip);
        border: 1px solid transparent;
    }

    .chip.wildcard {
        background: var(--brand-soft);
        border-color: var(--brand-line);
    }

    .chip button {
        color: var(--muted);
        font-size: 14px;
        line-height: 1;
        background: none;
        border: 0;
        padding: 0;
    }

    .chip button:hover {
        color: var(--ink);
    }

    .box input {
        flex: 1;
        min-width: 160px;
        border: 0;
        font-size: 13px;
        padding: 4px;
        background: transparent;
        box-shadow: none;
        outline: none;
    }

    .message {
        font-size: 12px;
        line-height: 1.5;
        color: var(--muted);
    }

    .message.error {
        color: var(--danger);
    }
</style>
