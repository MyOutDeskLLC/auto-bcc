<template>
    <div class="text-xs p-2">
        <div class="flex items-center space-x-2">
            <div class="flex-grow text-sm">
                Rule <span>{{ index }}</span>
            </div>
            <div>
                <button class="text-red-500 rounded border border-transparent hover:bg-red-100 hover:border-red-500 p-1" @click="deleteRule">
                    <svg fill="currentColor" class="h-4 w-4" viewBox="0 0 24 24">
                        <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>

        </div>
        <div class="space-y-1">
            <div>
                <span class="font-semibold mr-1">When sent from</span>
                <span v-for="item in rule.senders" class="space-x-2">{{ item }}</span>
            </div>
            <div>
                <span class="font-semibold mr-1">send BCC to</span>
                <span v-for="item in rule.bccEmails" class="space-x-2">{{ item }}</span>
            </div>
            <div>
                <span class="font-semibold mr-1">excluding domains</span>
                <span v-for="item in rule.excludedDomains" class="space-x-2">{{ item }}</span>
            </div>

        </div>
    </div>
</template>

<script setup>
    import Swal from 'sweetalert2'
    import {toRefs} from "vue";

    const emits = defineEmits(['delete-rule'])
    const props = defineProps({
        ruleId: String,
        rule: Object,
        index: Number,
    });

    const {ruleId} = toRefs(props)


    function deleteRule() {
        Swal.fire({
            title: 'Are you sure you want to delete this rule?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#fe9e11',
            cancelButtonColor: '#D6D3D1',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                emits('delete-rule', ruleId.value)
            }
        })

    }

</script>

