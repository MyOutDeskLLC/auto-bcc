<template>
    <div class="relative">
        <div class="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 w-full sm:min-h-screen sm:max-h-screen overflow-y-auto ">
            <div class="sm:col-span-2 md:col-span-4 sm:overflow-y-auto sm:max-w-4xl sm:max-h-screen">
                <NewRule @rule-added="getRulesFromStorage"/>
            </div>
            <div class="col-span-1 bg-stone-50 border-l sm:overflow-y-auto sm:max-h-screen">
                <Rule class="odd:bg-stone-100  space-y-2 shadow" v-for="(emailKey, index) in Object.keys(rules)" :email-key="emailKey" :rule="rules[emailKey]" :index="index + 1" @delete-rule="deleteRule"></Rule>
            </div>
        </div>
        <div class="absolute mb-2 w-full bottom-0 left-0">
            <div class="text-center">
                <p>Built By Developers @
                    <a class="hover:underline text-blue-500" href="https://myoutdesk.com?utm_source=chrome&utm_medium=extension&utm_campaign=autobcc" target="_blank" rel="noopener">MyOutDesk</a>
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
