<template>
    <div class="p-6 transition-all">
        <div>
            <h1 class="mb-6 text-lg font-medium leading-6 text-gray-900">New Auto BCC Rule</h1>
            <div class="space-y-2">
                <div>
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">When sent from the following email(s):</div>
                    <input class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300 sm:text-sm" type="text" v-model="sentFromEmailInput" @keyup.enter="addFromEmail" @keydown.tab="addFromEmail" @blur="addFromEmail">
                    <div class="text-xs text-gray-500">* If left blank this rule will be applied to all emails</div>
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Sender Emails</div>
                    <div class="mt-2 flex max-h-32 flex-wrap overflow-y-auto space-x-2">
                        <button type="button" v-for="(email, emailIndex) in sentFromAddresses" :key="emailIndex" class="mb-1 rounded-md bg-purple-600 px-2 py-1 text-xs text-white" @click="removeFromEmail(email)">{{ truncateEmail(email) }}</button>
                    </div>
                </div>
                <div>
                    <span class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Exclude Same Domain As Sender? </span>
                    <div class="mt-2 space-y-1">
                        <div class="flex items-center space-x-2">
                            <input id="exclude-same-domain" name="exclude-same-domain" type="radio" class="h-4 w-4 text-brand-500 focus:ring-brand-500" :value="true" v-model="excludeSameDomain">
                            <label for="exclude-same-domain" class="text-sm">Yes</label>
                        </div>
                        <div class="flex items-center space-x-2">
                            <input id="do-not-exclude-same-domain" type="radio" class="h-4 w-4 text-brand-500 focus:ring-brand-500" name="do-not-exclude-same-domain" :value="false" v-model="excludeSameDomain">
                            <label for="do-not-exclude-same-domain" class="text-sm">No</label>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Send blind copy to:</div>
                    <input v-model="bccEmailInput" class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300 sm:text-sm" type="text" @keyup.enter="addBcc" @keydown.tab="addBcc" @blur="addBcc">
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">BCC Emails</div>
                    <div class="mt-2 flex max-h-32 flex-wrap overflow-y-auto space-x-2">
                        <button type="button" v-for="(email, emailIndex) in sendToBccAddresses" :key="emailIndex" class="rounded-md bg-purple-600 px-2 py-1 text-xs text-white" @click="removeBccEmail(email)">{{ truncateEmail(email) }}</button>
                    </div>
                </div>

            </div>
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button type="button" class="inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm bg-brand-500 hover:bg-brand-600 focus:ring-brand-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm" @click="validateAndAddRule">Add Rule</button>
        </div>
    </div>
</template>

<script setup>
    import Swal from 'sweetalert2'
    import {onUnmounted, ref} from "vue";

    const emits = defineEmits(["rule-added"]);
    const sentFromEmailInput = ref();
    const bccEmailInput = ref();

    const sentFromAddresses = ref([]);
    const excludeSameDomain = ref(true);
    const sendToBccAddresses = ref([]);

    const emailRegEx = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/);

    const isValidEmail = (email) => {
        return emailRegEx.test(email)
    }

    const addBcc = () => {
        // TODO: foreach it if there are multiple in there for some reason,
        if(bccEmailInput.value.split(',').length > 0) {

        }
        if(!isValidEmail(bccEmailInput.value)) {
            return;
        }
        if (!sendToBccAddresses.value.includes(bccEmailInput.value)) {
            sendToBccAddresses.value.push(bccEmailInput.value);
            bccEmailInput.value = "";
        }
    }

    const removeBccEmail = (email) => {
        sendToBccAddresses.value = sendToBccAddresses.value.filter((currentEmail) => {
            return currentEmail !== email;
        });
    }

    const addFromEmail = () => {
        if(!isValidEmail(sentFromEmailInput.value)) {
            return;
        }
        if (!sentFromAddresses.value.includes(sentFromEmailInput.value)) {
            sentFromAddresses.value.push(sentFromEmailInput.value);
            sentFromEmailInput.value = "";
        }
    }

    const removeFromEmail = (email) => {
        sentFromAddresses.value = sentFromAddresses.value.filter((currentEmail) => {
            return currentEmail !== email;
        });
    }

    const truncateEmail = (email)  => {
        let truncatedEmail = email.substring(0, 25);
        if (truncatedEmail.length > 25) {
            return truncatedEmail + "...";
        }
        return truncatedEmail;
    }

    const resetForm = () => {
        sentFromAddresses.value = [];
        sendToBccAddresses.value = [];
        bccEmailInput.value = "";
        sentFromEmailInput.value = "";
        excludeSameDomain.value = true;
    }

    const getDomains = (emails) => {
        let domains = emails.map((email) => {
            return email.split("@")[1];
        });
        domains = domains.filter((email, index) => {
            return domains.indexOf(email) === index;
        });
        return domains;
    }

    const getExcludedDomains = ()  => {
        if (excludeSameDomain.value === false) {
            return [];
        }

        return getDomains(sentFromAddresses.value)
    }

    const mergeArraysWithNoDuplicates = (array1, array2) => {
        let newArray = [...array1];

        array2.forEach(item => {
            if(!newArray.includes(item)) {
                newArray.push(item);
            }
        })

        return newArray;
    }

    const getDomainsThatAreExclusions = () => {
        let excludedDomains = getExcludedDomains();
        let BCCsIncludedInExcludedDomains = []
        let bccDomains = getDomains(sendToBccAddresses.value);
        bccDomains.forEach(domain => {
            excludedDomains.forEach(excludedDomain => {
                if(domain === excludedDomain){
                    BCCsIncludedInExcludedDomains.push(domain)
                }
            })
        })
        return BCCsIncludedInExcludedDomains;
    }

    const validateAndAddRule = () => {
        // TODO: either a BCC or a CC can be in there.
        if(sendToBccAddresses.value.length < 1) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'You must specify at least one BCC email!',
                showConfirmButton: false,
                timer: 1500
            })
            return;
        }

        let BCCsIncludedInExcludedDomains = getDomainsThatAreExclusions();

        if(BCCsIncludedInExcludedDomains.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'The following emails have the same domain as the exclusion: '+ BCCsIncludedInExcludedDomains.join(',') + ' Please remove them before continuing or set exclude same domain as sender to "No"',
                confirmButtonColor: "#fe9e11",
            })
            return;
        }

        addRuleToConfiguration();
    }

    const addRuleToConfiguration = () => {
        chrome.storage.local.get("bccRules", (data) => {
            let rules = data.bccRules ?? {}

            //These are new rules being added
            sentFromAddresses.value.forEach(email => {
                //rule doesnt exists create
                if(!rules[email]) {
                    rules[email] = {
                        bccEmails: [...sendToBccAddresses.value],
                        excludedDomains: getExcludedDomains()
                    }
                    return;
                }

                rules[email] = {
                    bccEmails: mergeArraysWithNoDuplicates(sendToBccAddresses.value, rules[email].bccEmails),
                    excludedDomains: mergeArraysWithNoDuplicates(getExcludedDomains(), rules[email].excludedDomains)
                }
            })

            chrome.storage.local.set({bccRules: rules}, () => {
                emits("rule-added");
                resetForm();
            });
        });
    }

    onUnmounted(() => {
        resetForm();
    });
</script>
