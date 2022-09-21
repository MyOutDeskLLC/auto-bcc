<template>
    <div class="p-6 transition-all">
        <div>
            <h1 class="mb-6 text-lg font-medium leading-6 text-gray-900">New Auto BCC Rule</h1>
            <div class="space-y-2">
                <div>
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">When sent from the following email(s):</div>
                    <input class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300 sm:text-sm" type="text" v-model="sentFromEmail" @keyup.enter="addFromEmail" @keydown.tab="addFromEmail">
                    <div class="text-xs text-gray-500">* If left blank this rule will be applied to all emails</div>
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Sender Emails</div>
                    <div class="mt-2 flex max-h-32 flex-wrap overflow-y-auto space-x-2">
                        <button type="button" v-for="(email, emailIndex) in sentFromEmails" :key="emailIndex" class="mb-1 rounded-md bg-purple-600 px-2 py-1 text-xs text-white" @click="removeFromEmail(email)">{{ truncateEmail(email) }}</button>
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
                    <input v-model="bccEmail" class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300 sm:text-sm" type="text" @keyup.enter="addBCC" @keydown.tab="addBCC">
                    <div class="text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">BCC Emails</div>
                    <div class="mt-2 flex max-h-32 flex-wrap overflow-y-auto space-x-2">
                        <button type="button" v-for="(email, emailIndex) in bccEmails" :key="emailIndex" class="rounded-md bg-purple-600 px-2 py-1 text-xs text-white" @click="removeBccEmail(email)">{{ truncateEmail(email) }}</button>
                    </div>
                </div>

            </div>
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button type="button" class="inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm bg-brand-500 hover:bg-brand-600 focus:ring-brand-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm" @click="addRule">Add Rule</button>
        </div>
    </div>
</template>
<script setup>
    import Swal from 'sweetalert2'

    import {onUnmounted, ref} from "vue";

    const emits = defineEmits(["rule-added"]);

    const sentFromEmail = ref();
    const sentFromEmails = ref([]);
    const excludeSameDomain = ref(true);
    const bccEmail = ref();
    const bccEmails = ref([]);


    const emailRegEx = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/);


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

    function getDomains(emails){
        let domains = emails.map((email) => {
            return email.split("@")[1];
        });
        domains = domains.filter((email, index) => {
            return domains.indexOf(email) === index;
        });
        return domains;
    }

    function getExcludedDomains() {
        if (excludeSameDomain.value === false) {
            return [];
        }

        return getDomains(sentFromEmails.value)
    }

    function mergeArraysWithNoDuplicates(array1, array2){
        console.log({array1, array2})
        let merged = array1.concat(array2);
        return merged.filter((item, index) => {
            return merged.indexOf(item) === index;
        })
    }

    function getDomainsThatAreExclusions(){
        let excludedDomains = getExcludedDomains();
        let BCCsIncludedInExcludedDomains = []
        let bccDomains = getDomains(bccEmails.value);
        bccDomains.forEach(domain => {
            excludedDomains.forEach(excludedDomain => {
                if(domain === excludedDomain){
                    BCCsIncludedInExcludedDomains.push(domain)
                }
            })
        })
        return BCCsIncludedInExcludedDomains;
    }

    function addRule() {

        if(bccEmails.value.length < 1){
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
        if(BCCsIncludedInExcludedDomains.length > 0){
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'The following emails have the same domain as the exclusion: '+ BCCsIncludedInExcludedDomains.join(',') + ' Please remove them before continuing or set exclude same domain as sender to "No"',
                confirmButtonColor: "#fe9e11",
            })
            return;
        }



        chrome.storage.local.get("bccRules", (data) => {
            let rules = data.bccRules ?? {}

            //These are new rules being added
            sentFromEmails.value.forEach(email => {
                //rule doesnt exists create
                if(!rules[email]){
                    rules[email] = {
                        bccEmails: bccEmails.value,
                        excludedDomains: getExcludedDomains()
                    }
                    return;
                }

                rules[email] = {
                    bccEmails: mergeArraysWithNoDuplicates(bccEmails.value, rules[email].bccEmails),
                    excludedDomains: mergeArraysWithNoDuplicates(getExcludedDomains(), rules[email].excludedDomains)
                }
            })

            chrome.storage.local.set({bccRules: rules}, (result) => {
                emits("rule-added");
                resetForm()
            });
        });

    }


    onUnmounted(() => {
        resetForm();
    });


</script>
