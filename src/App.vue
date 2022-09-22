<template>
    <div class="relative">
        <div class="grid w-full grid-cols-1 overflow-y-auto sm:max-h-screen sm:min-h-screen sm:grid-cols-3 md:grid-cols-5">
            <div class="sm:col-span-2 sm:max-h-screen sm:max-w-4xl sm:overflow-y-auto md:col-span-4">
                <NewRule @rule-added="getRulesFromStorage"/>
            </div>
            <div class="col-span-1 border-l bg-stone-50 sm:max-h-screen sm:overflow-y-auto">
                <Rule class="shadow space-y-2 odd:bg-stone-100" v-for="(emailKey, index) in Object.keys(rules)" :email-key="emailKey" :rule="rules[emailKey]" :index="index + 1" @delete-rule="deleteRule"></Rule>
            </div>
        </div>
        <div class="absolute bottom-0 left-0 mb-2 w-full">
            <div class="text-center">
                <p>Built By Developers @
                    <a class="text-blue-500 hover:underline" href="https://myoutdesk.com?utm_source=chrome&utm_medium=extension&utm_campaign=autobcc" target="_blank" rel="noopener">MyOutDesk</a>
                </p>
            </div>
        </div>
    </div>
</template>


<script setup>
    import "./app.css";
    import Rule from "./components/Rule.vue";
    import NewRule from "./components/NewRule.vue";

    import {onMounted, ref} from "vue";

    const rules = ref({});

    function getRulesFromStorage() {
        chrome.storage.local.get("rules", (data) => {
            rules.value = data.rules ?? {};
        });
    }

    function saveRules(value) {
        chrome.storage.local.set({rules: value}, () => {
        });
    }

    function deleteRule(ruleId) {
        delete rules.value[ruleId];
        saveRules(rules.value);
    }

    onMounted(() => {
        getRulesFromStorage();
    });

</script>
