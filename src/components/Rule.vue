<template>
    <div class="text-xs">
        <div class="text-sm mb-2">
            Rule <span>{{ index }}</span>
        </div>
        <div class="space-y-1">
            <div>
                <span class="font-semibold mr-1">When sending from</span>
                <span v-for="item in rule.senders" class="space-x-2">{{ item }}</span>
            </div>
            <div>
                <span class="font-semibold mr-1">Excluding domains</span>
                <span v-for="item in rule.excludedDomains" class="space-x-2">{{ item }}</span>
            </div>
            <div>
                <span class="font-semibold mr-1">BCCing to</span>
                <span v-for="item in rule.bccEmails" class="space-x-2">{{ item }}</span>
            </div>
        </div>
    </div>
</template>

<script setup>
    const props = defineProps({rule: Object, index: Number});
</script>

