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
                        <div v-if="rules && Object.keys(rules).length > 0" class="h-32 overflow-y-auto mb-4 bg-gray-100 rounded-md p-4 space-y-2">
                            <Rule v-for="(rule, index) in Object.keys(rules)" :rule="rules[rule]" :index="index + 1"></Rule>
                        </div>


                        <h1 class="mb-6 text-lg font-medium leading-6 text-gray-900">New Auto BCC Rule</h1>


                        <div class="space-y-2">
                            <div>
                                <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">When sent from the following email(s):</div>
                                <input class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300 sm:text-sm" type="text" v-model="sentFromEmail" @keyup.enter="addFromEmail" @keydown.tab="addFromEmail">
                                <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Sender Emails</div>
                                <div class="mt-2 flex max-h-32 flex-wrap overflow-y-auto space-x-2">
                                    <button type="button" v-for="email in sentFromEmails" class="mb-1 rounded-md bg-purple-600 px-2 py-1 text-xs text-white" @click="removeFromEmail(email)">{{ truncateEmail(email) }}</button>
                                </div>
                            </div>
                            <div>
                                <span class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Exclude Same Domain As Sender? </span>
                                <div class="mt-2 space-y-1">
                                    <div class="flex items-center space-x-2">
                                        <input name="exclude-same-domain" type="radio" class="h-4 w-4 text-brand-500" :value="true" v-model="excludeSameDomain">
                                        <label for="exclude-same-domain" class="text-sm">Yes</label>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <input type="radio" class="h-4 w-4 text-brand-500" name="do-not-exclude-same-domain" :value="false" v-model="excludeSameDomain">
                                        <label for="do-not-exclude-same-domain" class="text-sm">No</label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Send blind copy to:</div>
                                <input v-model="bccEmail" class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300 sm:text-sm" type="text" @keyup.enter="addBCC" @keydown.tab="addBCC">
                                <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">BCC Emails</div>
                                <div class="mt-2 flex max-h-32 flex-wrap overflow-y-auto space-x-2">
                                    <button type="button" v-for="email in bccEmails" class="rounded-md bg-purple-600 px-2 py-1 text-xs text-white" @click="removeBccEmail(email)">{{ truncateEmail(email) }}</button>
                                </div>
                            </div>

                        </div>
                    </div>
                    <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button type="button" class="inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm bg-brand-600 hover:bg-brand-700 focus:ring-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm" @click="addRule">Add Rule</button>
                        <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm" @click="close">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>
<script setup>
    import {onMounted, onUnmounted, ref, toRefs} from "vue";


    import Rule from "./Rule.vue";

    const emits = defineEmits(["close", "rule-add"]);
    const props = defineProps({show: Boolean, currentUser: String, rules: Object});
    const { rules } = toRefs(props);



    const sentFromEmail = ref();
    const sentFromEmails = ref([]);
    const excludeSameDomain = ref(true);
    const bccEmail = ref();
    const bccEmails = ref([]);


    const emailRegEx = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/);

    function close() {
        emits("close");
    }

    function addBCC() {
        if (bccEmail.value && !bccEmails.value.includes(bccEmail.value) && emailRegEx.test(bccEmail.value)) {
            bccEmails.value.push(bccEmail.value);
            bccEmail.value = "";
        }
    }

    function removeBccEmail(email) {
        bccEmails.value = bccEmails.value.filter((currentEmail) => {
            if (currentEmail !== email) {
                return currentEmail;
            }
        });
    }

    function addFromEmail() {
        if (sentFromEmail.value && !sentFromEmails.value.includes(sentFromEmail.value) && emailRegEx.test(sentFromEmail.value)) {
            sentFromEmails.value.push(sentFromEmail.value);
            sentFromEmail.value = "";
        }
    }

    function removeFromEmail(email) {
        sentFromEmails.value = sentFromEmails.value.filter((currentEmail) => {
            if (currentEmail !== email) {
                return currentEmail;
            }
        });
    }

    function truncateEmail(email) {
        let truncatedEmail = email.substring(0, 25);
        if (truncatedEmail.length > 25) {
            return truncatedEmail + "...";
        }
        return truncatedEmail;
    }

    function resetForm() {
        sentFromEmails.value = [];
        bccEmails.value = [];
        bccEmail.value = "";
        sentFromEmail.value = "";
        excludeSameDomain.value = true;
    }

    function getExcludedDomains() {

        if (excludeSameDomain.value === false) {
            return [];
        }

        let domains = sentFromEmails.value.map((email) => {
            return email.split("@")[1];
        });
        domains = domains.filter((email, index) => {
            return domains.indexOf(email) === index;
        });
        return domains;

    }

    function addRule() {
        let tempRules = rules.value;

        tempRules[new Date().getTime()] = {
            senders: sentFromEmails.value,
            bccEmails: bccEmails.value,
            excludedDomains: getExcludedDomains(),
        };

        chrome.storage.local.set({bccRules: tempRules}, (result) => {
            emits("rule-add", tempRules);
        });

    }


    onUnmounted(() => {
        resetForm();
    });


</script>
