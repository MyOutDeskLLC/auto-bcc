<template>
    <div class="relative">
        <div class="grid w-full grid-cols-1 overflow-y-auto sm:max-h-screen sm:min-h-screen sm:grid-cols-3 md:grid-cols-5">
            <div class="sm:col-span-2 sm:max-h-screen sm:max-w-4xl sm:overflow-y-auto md:col-span-4">
                <div class="p-6 border-b">
                    <div class="mb-6 flex items-center space-x-1">
                        <h1 class="text-lg font-medium leading-6 text-gray-900">Options -</h1>
                        <span class="font-normal text-xs text-gray-500"> Reload Gmail after changing options.</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <SwitchGroup as="div" class="flex items-center justify-between w-full">
                            <span class="flex flex-grow flex-col">
                              <SwitchLabel as="span" class="text-sm font-medium text-gray-900" passive>Off By Default</SwitchLabel>
                              <SwitchDescription as="span" class="text-xs text-gray-500">Auto BCC will be off by default requiring the use the inline button. </SwitchDescription>
                            </span>
                            <Switch v-model="options.offByDefault" :class="[options.offByDefault ? 'bg-brand-600' : 'bg-gray-200', 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2']">
                                <span aria-hidden="true" :class="[options.offByDefault ? 'translate-x-5' : 'translate-x-0', 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out']"/>
                            </Switch>
                        </SwitchGroup>
                    </div>
                </div>
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

    import {onMounted, ref, reactive, watch} from "vue";
    import {Switch, SwitchDescription, SwitchGroup, SwitchLabel} from "@headlessui/vue";

    const rules = ref({});
    let options = reactive({
        offByDefault: false
    })

    watch(options, (newOptions, oldOptions) => {
        saveOptions(newOptions)
    })


    function getRulesFromStorage() {
        chrome.storage.local.get("rules", (data) => {
            rules.value = data.rules ?? {};
        });
    }

    function getOptionsFromStorage() {
        chrome.storage.local.get("options", (data) => {
            let tmpOptions = data && data.options ? data.options : {
                offByDefault: false
            };

            Object.keys(tmpOptions).forEach(key => {
                options[key] = tmpOptions[key];
            })
        });
    }

    function saveRules(value) {
        chrome.storage.local.set({rules: value}, () => {
        });
    }

    function saveOptions(options){
        chrome.storage.local.set({options: options}, () => {
        });
    }

    function deleteRule(ruleId) {
        delete rules.value[ruleId];
        saveRules(rules.value);
    }

    onMounted(() => {
        getRulesFromStorage();
        getOptionsFromStorage();
    });

</script>
