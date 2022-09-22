<template>
    <div class="p-6 transition-all">
        <div>
            <h1 class="mb-6 text-lg font-medium leading-6 text-gray-900">New Auto BCC Rule</h1>
            <div class="space-y-2">
                <div>
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">When sent from the following email(s):</div>
                    <input class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300 sm:text-sm" type="text" v-model="sentFromEmailInput" @keyup.enter="addFromEmail" @keydown.tab="addFromEmail" @blur="addFromEmail">
                    <div class="text-xs text-gray-500">* Insert one at a time or separate multiple email addresses by a comma.</div>
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Sender Emails</div>
                    <div class="mt-2 flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                        <EmailCard :emails="sentFromAddresses" @remove="removeFromEmail"></EmailCard>
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
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Send carbon copy to:</div>
                    <input v-model="ccEmailInput" class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300 sm:text-sm" type="text" @keyup.enter="addCc" @keydown.tab="addCc" @blur="addCc">
                    <div class="text-xs text-gray-500">* Insert one at a time or separate multiple email addresses by a comma.</div>
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">CC Emails</div>
                    <div class="mt-2 flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                        <EmailCard :emails="sendToCcAddresses" @remove="removeCcEmail"></EmailCard>
                    </div>
                </div>


                <div>
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Send blind copy to:</div>
                    <input v-model="bccEmailInput" class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300 sm:text-sm" type="text" @keyup.enter="addBcc" @keydown.tab="addBcc" @blur="addBcc">
                    <div class="text-xs text-gray-500">* Insert one at a time or separate multiple email addresses by a comma.</div>
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">BCC Emails</div>
                    <div class="mt-2 flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                        <EmailCard :emails="sendToBccAddresses" @remove="removeBccEmail"></EmailCard>
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
    import EmailCard from "./EmailCard.vue";
    import Swal from 'sweetalert2'
    import {onUnmounted, ref} from "vue";

    const emits = defineEmits(["rule-added"]);
    const sentFromEmailInput = ref();
    const bccEmailInput = ref();
    const ccEmailInput = ref();


    const sentFromAddresses = ref([]);
    const excludeSameDomain = ref(true);
    const sendToBccAddresses = ref([]);
    const sendToCcAddresses = ref([]);

    const emailRegEx = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/);

    const isValidEmail = (email) => {
        return emailRegEx.test(email)
    }

    const addCc = () => {
        if(!ccEmailInput.value){
            return;
        }
        let potentialEmails = ccEmailInput.value.split(',')
        potentialEmails.forEach(potentialEmail => {
            potentialEmail = potentialEmail.trim();
            if(!isValidEmail(potentialEmail)) {
                return;
            }
            if (!sendToCcAddresses.value.includes(potentialEmail)) {
                sendToCcAddresses.value.push(potentialEmail);
            }
        })
        ccEmailInput.value = "";
    }

    const addBcc = () => {
        if(!bccEmailInput.value){
            return;
        }
        let potentialEmails = bccEmailInput.value.split(',')
        potentialEmails.forEach(potentialEmail => {
            potentialEmail = potentialEmail.trim();
            if(!isValidEmail(potentialEmail)) {
                return;
            }
            if (!sendToBccAddresses.value.includes(potentialEmail)) {
                sendToBccAddresses.value.push(potentialEmail);
            }
        })
        bccEmailInput.value = "";

    }

    const removeCcEmail = (email) => {
        sendToCcAddresses.value = sendToCcAddresses.value.filter((currentEmail) => {
            return currentEmail !== email;
        });
    }

    const removeBccEmail = (email) => {
        sendToBccAddresses.value = sendToBccAddresses.value.filter((currentEmail) => {
            return currentEmail !== email;
        });
    }

    const addFromEmail = () => {
        if(!sentFromEmailInput.value){
            return;
        }
        let potentialEmails = sentFromEmailInput.value.split(',')
        potentialEmails.forEach(potentialEmail => {
            potentialEmail = potentialEmail.trim();
            if(!isValidEmail(potentialEmail)) {
                return;
            }
            if (!sentFromAddresses.value.includes(potentialEmail)) {
                sentFromAddresses.value.push(potentialEmail);
            }
        })
        sentFromEmailInput.value = "";

    }

    const removeFromEmail = (email) => {
        sentFromAddresses.value = sentFromAddresses.value.filter((currentEmail) => {
            return currentEmail !== email;
        });
    }



    const resetForm = () => {
        sentFromEmailInput.value = "";
        ccEmailInput.value = ""
        bccEmailInput.value = "";

        sentFromAddresses.value = [];
        sendToCcAddresses.value = [];
        sendToBccAddresses.value = [];

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
        if(sendToBccAddresses.value.length < 1 && sendToCcAddresses.value < 1) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'You must specify at least one BCC or CC email!',
                showConfirmButton: false,
                timer: 2000
            })
            return;
        }

        let BCCsIncludedInExcludedDomains = getDomainsThatAreExclusions();

        if(BCCsIncludedInExcludedDomains.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'The following domains are excluded: '+ BCCsIncludedInExcludedDomains.join(',') + ' Please remove them before from either the BCC or CC before continuing or set exclude same domain as sender to "No"',
                confirmButtonColor: "#fe9e11",
            })
            return;
        }

        addRuleToConfiguration();
    }

    const addRuleToConfiguration = () => {
        chrome.storage.local.get("rules", (data) => {
            let rules = data.rules ?? {}

            //These are new rules being added
            sentFromAddresses.value.forEach(email => {
                //rule doesnt exists create
                if(!rules[email]) {
                    rules[email] = {
                        bccEmails: [...sendToBccAddresses.value], //for some reason this is sometimes an object to spread it.
                        ccEmails: [...sendToCcAddresses.value],  //for some reason this is sometimes an object to spread it.
                        excludedDomains: getExcludedDomains()
                    }
                    return;
                }

                rules[email] = {
                    bccEmails: mergeArraysWithNoDuplicates(sendToBccAddresses.value, rules[email].bccEmails),
                    ccEmails: mergeArraysWithNoDuplicates(sendToCcAddresses.value, rules[email].ccEmails),
                    excludedDomains: mergeArraysWithNoDuplicates(getExcludedDomains(), rules[email].excludedDomains)
                }
            })

            chrome.storage.local.set({rules}, () => {
                emits("rule-added");
                resetForm();
            });
        });
    }

    onUnmounted(() => {
        resetForm();
    });
</script>
