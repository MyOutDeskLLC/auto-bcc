<template>
    <div class="flex min-h-screen flex-col items-center justify-center">
        <div class="grid grid-cols-3 rounded border border-gray-200 shadow max-w-3xl w-full">
            <div class="col-span-2 overflow-y-auto">
                <NewRule @rule-added="getRulesFromStorage"/>
            </div>
            <div class="col-span-1 bg-stone-50 border-l">
                <Rule class="odd:bg-stone-100 space-y-2" v-for="(rule, index) in Object.keys(rules)" :rule-id="rule" :rule="rules[rule]" :index="index + 1" @delete-rule="deleteRule"></Rule>
            </div>
        </div>
    </div>
</template>


<script setup>
    import "./app.css";
    import Rule from "./components/Rule.vue";
    import NewRule from "./components/NewRule.vue";

    import {onMounted, onUnmounted, ref} from "vue";

    const rules = ref({});

    function getRulesFromStorage() {
        chrome.storage.local.get("bccRules", (data) => {
            if (data.bccRules) {
                rules.value = data.bccRules;
            }
        });
    }

    function saveRules(value){
        chrome.storage.local.set({bccRules: value}, (result) => {
        });
    }

    function deleteRule(ruleId){
        delete rules.value[ruleId]
        saveRules(rules.value)
    }

    onMounted(() => {
        getRulesFromStorage();
    });

</script>
