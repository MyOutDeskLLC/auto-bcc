<template>
    <div class="relative">
        <div class="grid grid-cols-5 w-full min-h-screen max-h-screen overflow-y-auto ">
            <div class="col-span-4 overflow-y-auto max-w-4xl max-h-screen">
                <NewRule @rule-added="getRulesFromStorage"/>
            </div>
            <div class="col-span-1 bg-stone-50 border-l overflow-y-auto max-h-screen">
                <Rule class="odd:bg-stone-100  space-y-2 shadow" v-for="(emailKey, index) in Object.keys(rules)" :email-key="emailKey" :rule="rules[emailKey]" :index="index + 1" @delete-rule="deleteRule"></Rule>
            </div>
        </div>
        <div class="absolute bottom-0 right-0 mr-2 mb-2">
            <p>Built By Developers @
                <a class="text-blue-500" href="https://myoutdesk.com?utm_source=chrome&utm_medium=extension&utm_campaign=autobcc" target="_blank" rel="noopener">MyOutDesk</a>
            </p>
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
