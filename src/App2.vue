<template>
    <div class="bg-gray-500 font-sans text-base">
        <Options :show="show" @close="closeOptions"/>
    </div>

</template>


<script setup>
    import "./app.css";
    import Options from "./components/Options.vue";

    import * as GmailFactory from "gmail-js";
    import {onMounted, onUnmounted, ref} from "vue";

    const gmail = new GmailFactory.Gmail();

    const configButton = ref();
    const show = ref(false)

    function closeOptions(){
        show.value = false;
    }

    onMounted(() => {
        configButton.value = gmail.tools.add_toolbar_button("<img src=\"" + chrome.runtime.getURL("src/icons/orange-square-mail.png") + "\">", function() {
            show.value = true;
        }, "hover:bg-stone-200/50 w-10 h-10 p-3 -mt-2.5 rounded-full");

        gmail.observe.on_dom("compose", () => {
            alert('were composing bois!')
            // let compose_ref = gmail.dom.composes()[0];
            // gmail.tools.add_compose_button(compose_ref, "content_html", function() {
            //
            // }, "bg-red-500");
        });
    });

    onUnmounted(() => {
        //clean up the divs we created on mounted
        configButton.value[0].remove();
    });
</script>
