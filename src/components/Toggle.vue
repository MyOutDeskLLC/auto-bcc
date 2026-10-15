<template>
    <button type="button" role="switch" :aria-checked="modelValue" :aria-label="label" class="toggle" :class="{on: modelValue}"
            @click.stop="emits('update:modelValue', !modelValue)">
        <span class="knob"/>
    </button>
</template>

<script setup lang="ts">
    defineProps<{
        modelValue: boolean;
        label?: string;
    }>();
    const emits = defineEmits(["update:modelValue"]);
</script>

<style scoped>
    .toggle {
        flex: none;
        width: 32px;
        height: 18px;
        border-radius: 9px;
        position: relative;
        border: 0;
        padding: 0;
        background: var(--line-strong);
        transition: background .15s;
    }

    .toggle.on {
        background: var(--brand);
    }

    .knob {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        transition: left .15s;
    }

    .toggle.on .knob {
        left: 16px;
    }
</style>
