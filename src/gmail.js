const SELECTOR_PRIMARY_COMPOSER_FORM = "form.bAs";
const SELECTOR_FOR_TO_CC_AND_BCC_FIELDS = ".wO.nr";
const SELECTOR_FOR_BCC_SPAN = ".aB.gQ.pB";
const SELECTOR_FOR_CC_SPAN = ".aB.gQ.pE";

class GmailThing {

    constructor() {
        this.ccEmails = "";
        this.bccEmails = "";
        this.knownForms = [];
        this.observerMap = {};
        this.watcher = null;
        this.observer = null;
    }

    setBccEmails = (emailAsString) => {
        this.bccEmails = emailAsString;
    };

    setCcEmails = (emailsAsString) => {
        this.ccEmails = emailsAsString;
    };

    createGlobalObserver = () => {
        this.observer = setInterval(() => {
            this.knownForms = this.knownForms.filter(formId => {
                if (!document.getElementById(formId)) {
                    if (this.observerMap[formId]) {
                        console.log("disconnecting missing form");
                        ;this.observerMap[formId].disconnect();
                    }
                    return false;
                }
                return true;
            });
        }, 500);
    };

    attachMutationObserver = () => {
        this.observer = new MutationObserver(this.examineInsertedElements);
        this.observer.observe(document.body, {
            childList: true,
            attributes: false,
            subtree: true,
        });
    };

    examineInsertedElements = (elementsInserted) => {
        let firedAlready = false;
        elementsInserted.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (!node || typeof node.querySelector !== "function") {
                    return;
                }
                if (node.querySelector(SELECTOR_PRIMARY_COMPOSER_FORM)) {
                    firedAlready = true;
                    this.connectToNewForms();
                }
            });
        });
    };

    connectToNewForms = () => {
        const allForms = document.querySelectorAll(SELECTOR_PRIMARY_COMPOSER_FORM);
        allForms.forEach(formElement => {
            if (this.knownForms.includes(formElement.id)) {
                return;
            }
            this.knownForms.push(formElement.id);
            console.log("connecting to form id" + formElement.id);
            setTimeout(() => {
                this.checkExistingRecipients(formElement);
                this.observeRecipients(formElement);
            }, 500);
        });
    };

    // In this case of a reply, we have to check this to see if we need to add the BCC fields automatically
    checkExistingRecipients = (formElement) => {
        let foundElement = null;
        formElement.querySelectorAll("div.afx").forEach(divElement => {
            if (divElement.ariaLabel && divElement.ariaLabel.toLowerCase().startsWith(`search field`)) {
                foundElement = divElement.querySelector("input");
            }
        });

        if (foundElement) {
            this.scanForCardsUnderNode(foundElement).forEach(item => {
                this.updateCcAndBccRecipients(item.dataset.hovercardId, formElement);
            });
        }
    };

    scanForCardsUnderNode = (node) => {
        // jump up to the nearest TR
        let parentRow = node.closest("tr");
        let existingCards = parentRow.querySelectorAll("div[role=option]");
        let discoveredCards = [];
        existingCards.forEach(card => {
            if (card.dataset && card.dataset.hovercardId) {
                discoveredCards.push(card);
            }
        });

        return discoveredCards;
    };

    observeRecipients = (formElement) => {
        const observerConfig = {
            attributes: false,
            childList: true,
            subtree: true,
        };

        const recipientChanged = (mutationList, observer) => {
            for (const mutation of mutationList) {
                for (const addedNode of mutation.addedNodes) {
                    if (addedNode.role === "option") {
                        if (addedNode.dataset && addedNode.dataset.hovercardId) {
                            this.updateCcAndBccRecipients(addedNode.dataset.hovercardId, formElement);
                        }
                    }
                }
            }
        };

        const observer = new MutationObserver(recipientChanged);
        observer.observe(formElement, observerConfig);

        this.observerMap[formElement.id] = observer;
    };

    updateCcAndBccRecipients = (email, formElement) => {
        console.log("adding recipients based on email rules for: ", email);

        formElement.querySelector(SELECTOR_FOR_CC_SPAN)?.click();
        formElement.querySelector(SELECTOR_FOR_BCC_SPAN)?.click();

        this.autofillField(formElement, this.bccEmails, "bcc");
        this.autofillField(formElement, this.ccEmails, "cc");
    };

    autofillField = (formElement, emailList, context) => {
        formElement.querySelectorAll("span").forEach(spanElement => {
            if (spanElement.ariaLabel && spanElement.ariaLabel.toLowerCase().startsWith(`${context} -`)) {

                let properEmailInputField = spanElement.parentElement.parentElement.querySelector("input");
                let existingEmails = properEmailInputField.value;

                this.scanForCardsUnderNode(spanElement).forEach(card => {
                    existingEmails += `${card.dataset.hovercardId},`;
                });


                if (!existingEmails.includes(emailList)) {
                    properEmailInputField.value = emailList + existingEmails + ",";
                }
            }
        });
    };
}

let gt = new GmailThing();
gt.setBccEmails("jay.lindsley@myoutdesk.com");
gt.setCcEmails("lancet@myoutdesk.com");
gt.attachMutationObserver();
gt.createGlobalObserver();
