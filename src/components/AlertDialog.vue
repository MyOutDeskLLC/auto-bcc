<template>
    <TransitionRoot appear :show="open" as="template">
        <Dialog as="div" class="relative z-50" @close="emits('close')">
            <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100"
                             leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                <div class="fixed inset-0 bg-black/30"/>
            </TransitionChild>

            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
                                     leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                        <DialogPanel class="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
                            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
                                 :class="variant === 'error' ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'">
                                <svg fill="none" stroke="currentColor" stroke-width="2" class="h-6 w-6" viewBox="0 0 24 24">
                                    <path v-if="variant === 'error'" stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
                                    <path v-else stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0z"/>
                                </svg>
                            </div>
                            <DialogTitle as="h3" class="mt-4 text-lg font-medium text-gray-900">{{ title }}</DialogTitle>
                            <p v-if="text" class="mt-2 text-sm text-gray-600">{{ text }}</p>

                            <div v-if="confirmText || cancelText" class="mt-6 flex justify-center gap-2">
                                <button v-if="cancelText" type="button"
                                        class="rounded-md bg-stone-300 px-4 py-2 text-sm font-medium text-white hover:bg-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-2"
                                        @click="emits('close')">{{ cancelText }}</button>
                                <button v-if="confirmText" type="button"
                                        class="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
                                        @click="emits('confirm')">{{ confirmText }}</button>
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>

<script setup lang="ts">
    import {Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot} from "@headlessui/vue";
    import {onUnmounted, watch} from "vue";

    const emits = defineEmits(["confirm", "close"]);
    const props = withDefaults(
        defineProps<{
            open: boolean;
            title: string;
            text?: string;
            variant?: "warning" | "error";
            confirmText?: string;
            cancelText?: string;
            // Closes the dialog automatically after this many milliseconds.
            autoCloseMs?: number;
        }>(),
        {
            text: "",
            variant: "warning",
            confirmText: "",
            cancelText: "",
            autoCloseMs: 0,
        }
    );

    let autoCloseTimer: ReturnType<typeof setTimeout> | undefined;

    watch(() => props.open, (open) => {
        clearTimeout(autoCloseTimer);
        if (open && props.autoCloseMs > 0) {
            autoCloseTimer = setTimeout(() => emits("close"), props.autoCloseMs);
        }
    });

    onUnmounted(() => clearTimeout(autoCloseTimer));
</script>
