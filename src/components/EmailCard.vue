<template>
    <button type="button" v-for="(email, emailIndex) in emails" :key="emailIndex" class="flex items-center rounded-md bg-purple-600 px-2 py-1 text-xs text-white space-x-1 hover:bg-red-500" @click="removeEmail(email)">
        <span>
            <svg fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
            </svg>
        </span>
        <span>
            {{ truncateEmail(email) }}
        </span>
    </button>
</template>

<script setup>
    const emits = defineEmits(["remove"]);
    const props = defineProps({
        emails: Array
    });


    function removeEmail(email) {
        emits("remove", email);
    }

    const truncateEmail = (email) => {
        let truncatedEmail = email.substring(0, 25);
        if (truncatedEmail.length >= 25) {
            return truncatedEmail + "...";
        }
        return truncatedEmail;
    };
</script>
