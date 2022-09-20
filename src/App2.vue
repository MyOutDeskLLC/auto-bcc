<template>
    <div class="bg-gray-500 font-sans text-base">
        <Options :show="show" :rules="rules" @close="closeOptions" @rule-add="handleRuleAdd"/>
    </div>

</template>


<script setup>
    import "./app.css";
    import Options from "./components/Options.vue";

    import {onMounted, onUnmounted, ref} from "vue";


    // import * as GmailFactory from "gmail-js";
    // const gmail = new GmailFactory.Gmail();




    import * as InboxSDK from '@inboxsdk/core';

    InboxSDK.load(2, 'sdk_MyOutDesk_cca03fd0f7', {}).then(function(sdk){
        // the SDK has been loaded, now do something with it!
        sdk.Compose.registerComposeViewHandler(function(composeView){
            alert('hi');
            composeView.on('presending', (event)=>{
                let toRecipients = composeView.getToRecipients();
                composeView.setBccRecipients(['lancet@myoutdesk.com'])
                alert(toRecipients);
                event.cancel();
            })
            // // a compose view has come into existence, do something with it!
            // composeView.addButton({
            //     title: "My Nifty Button!",
            //     iconUrl: 'https://example.com/foo.png',
            //     onClick: function(event) {
            //         event.composeView.insertTextIntoBodyAtCursor('Hello World!');
            //     },
            // });
        });

    });



    const rules = ref({});

    const configButton = ref();
    const show = ref(false)

    function closeOptions(){
        show.value = false;
    }

    function handleRuleAdd(rules){
        rules.value = rules;
        closeOptions()
    }

    onMounted(() => {

        chrome.storage.local.get("bccRules", (data) => {
            if (data.bccRules) {
                rules.value = data.bccRules;
            }
        });

        // configButton.value = gmail.tools.add_toolbar_button("<img src=\"" + chrome.runtime.getURL("src/icons/orange-square-mail.png") + "\">", function() {
        //     show.value = true;
        // }, "hover:bg-stone-200/50 w-10 h-10 p-3 -mt-2.5 rounded-full");
        //
        // gmail.observe.on('load', ()=>{
        //
        // })
        //
        // gmail.observe.on_dom('recipient_change', (match, recipients)=>{
        //     let addBcc = true;
        //     let bccEmails = [];
        //     let fromEmail = match.from();
        //     console.log(fromEmail)
        //
        //     Object.values(rules.value).forEach(rule => {
        //         Object.values(rule.senders).forEach(sender => {
        //             if(fromEmail === sender){
        //                 addBcc = false;
        //             }
        //         })
        //
        //
        //         //check domains
        //         Object.values(rule.excludedDomains).forEach(domain => {
        //             recipients.to.forEach(toRecipient => {
        //                 let toRecipientDomain = toRecipient.split('@')[1];
        //                 if(domain === toRecipientDomain){
        //                     addBcc = false;
        //                 }
        //             })
        //         })
        //
        //         Object.values(rule.bccEmails).forEach(email => {
        //             bccEmails.push(email)
        //         })
        //     })
        //
        //     if(addBcc){
        //         //empty this gmail-js throws when it can't find the bcc input field
        //         try {
        //             match.bcc(bccEmails)
        //         }
        //         catch(error){
        //             //don't do anything just swallow the error because gmail-js doesn't handle this not existing
        //         }
        //     }
        // })
        //
        // gmail.observe.on_dom("compose", (compose, composeType) => {
        //     // console.log(compose.id())
        //     // console.log(compose, composeType)
        //
        //     // alert('were composing bois!')
        //     // let compose_ref = gmail.dom.composes()[0];
        //     // gmail.tools.add_compose_button(compose_ref, "content_html", function() {
        //     //
        //     // }, "bg-red-500");
        // });
    });

    onUnmounted(() => {
        //clean up the divs we created on mounted
        configButton.value[0].remove();
    });
</script>
