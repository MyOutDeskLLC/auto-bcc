<template>
    <div class="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true" v-if="show">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        <div class="fixed inset-0 z-10 overflow-y-auto">
            <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                    <div class="absolute top-0 right-0 hidden pt-4 pr-4 sm:block" @click="close">
                        <button type="button" class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                            <span class="sr-only">Close</span>
                            <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div>
                        <h1 class="mb-6 text-2xl font-semibold">New Auto BCC Rule</h1>
                        <div class="space-y-2">
                            <div>
                                <div>When sent from an email that</div>
                                <input class="mt-2 w-full rounded" type="text">

                            </div>

                            <div>
                                <div>Send blind copy to:</div>
                                <select class="w-full rounded">
                                    <option>Only</option>
                                    <option>All my contacts except</option>
                                    <option>All my contacts</option>
                                </select>
                            </div>

                            <div>
                                <textarea rows="4" class="block w-full rounded"></textarea>
                                <div class="text-sm text-gray-500">* Separate each address by new line</div>
                            </div>

                            <div>
                            </div>

                        </div>
                    </div>
                    <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button type="button" class="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm">Deactivate</button>
                        <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>
<script setup>

    const emits = defineEmits(["close"]);
    const props = defineProps({show: Boolean});


    import {onMounted, onUnmounted, ref} from "vue";


    const senderCriteria = ref(null);

    function close() {
        emits("close");
    }



</script>
