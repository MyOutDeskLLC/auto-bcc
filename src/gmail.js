const SELECTOR_PRIMARY_COMPOSER_FORM = "form.bAs";
const SELECTOR_FOR_TO_CC_AND_BCC_FIELDS = ".wO.nr";
const SELECTOR_FOR_BCC_SPAN = ".aB.gQ.pB";
const SELECTOR_FOR_CC_SPAN = ".aB.gQ.pE";
const EMAIL_REGEX =  /([a-z0-9]+@[a-z0-9.]+)/;

class GmailAutoBccHandler {

    constructor() {
        this.ccEmails = "";
        this.bccEmails = "";
        this.knownForms = [];
        this.observerMap = {};
        this.watcher = null;
        this.observer = null;
        this.rules = {};
        // Get initial rules and hookup observers
        this.getRulesFromStorage();
        this.createEmailFormObserver();
        // This global observer will be used to clean up old mutation observers
        this.createGlobalObserver();

        //Listen for Rule Changes from config
        chrome.storage.onChanged.addListener((changes, namespace) =>  {
            this.getRulesFromStorage();
        });
    }

    /**
     * This function will discover the logged-in user from the window title
     */
    discoverLoggedInUser = () => {
        let matches = EMAIL_REGEX.exec(document.title);
        if(matches !== null) {
            // You may be curious why this is done. We need the LAST email to show up
            // if someone emails you and the topic has another email in it, then it would fetch that in error
            return matches[matches.length - 1];
        }
        // If we cannot find it, then im not sure?
        return null;
    }

    getRulesFromStorage = () => {
        chrome.storage.local.get("bccRules", (data) => {
            if (!data.bccRules) {
                this.rules = {};
                return;
            }
            this.rules = data.bccRules;
        });
    };

    setBccEmails = (emailAsString) => {
        this.bccEmails = emailAsString;
    };

    setCcEmails = (emailsAsString) => {
        this.ccEmails = emailsAsString;
    };

    /**
     * This will create a simple interval to make sure that we are cleaning up old observers
     * We don't really pay attention to when a form goes away, so this will make sure it disconnects
     * observers which are watching old forms which don't exist anymore
     */
    createGlobalObserver = () => {
        this.observer = setInterval(() => {
            this.knownForms = this.knownForms.filter(formId => {
                if (!document.getElementById(formId)) {
                    if (this.observerMap[formId]) {
                        console.log("disconnecting missing form");
                        this.observerMap[formId].disconnect();
                    }
                    return false;
                }
                return true;
            });
        }, 5000);
    };

    /**
     * This uses a mutation observer on the whole document to scan for new email forms which may pop up
     */
    createEmailFormObserver = () => {
        this.observer = new MutationObserver(this.examineInsertedElements);
        this.observer.observe(document.body, {
            childList: true,
            attributes: false,
            subtree: true,
        });
    };

    /**
     * This function discovers any forms that are added to the page (clicking compose, clicking reply, etc)
     *
     * @param elementsInserted
     */
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

    /**
     * When a new form has been discovered via the mutation observer, this will connect to them and attach an observer
     * to the recipients field and also see if there already are recipients declared (from a draft, for instance)
     */
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

    /**
     * For drafts and replies, we need to check if anyone is already getting this email
     *
     * @param formElement
     */
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

    /**
     * When a new person is added and enter is pressed, it moves them from the input into a hoverable card
     * So when the mail has been sent or a reply started, or continue from a draft, we need to find these and pull out the emails
     *
     * @param node
     * @returns {*[]}
     */
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

    /**
     * This function hooks the intended recipients block with an observer so we know who email is being delivered to
     *
     * @param formElement
     */
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

    /**
     * Simple: dumps the proper CC and BCC recipients into the field as required by the rules
     *
     * @param email
     * @param formElement
     */
    updateCcAndBccRecipients = (email, formElement) => {
        console.log("adding recipients based on email rules for: ", email);

        formElement.querySelector(SELECTOR_FOR_CC_SPAN)?.click();
        formElement.querySelector(SELECTOR_FOR_BCC_SPAN)?.click();

        if(Object.keys(this.rules).length < 1){
            return;
        }

        /**
         * Todo Take Into Consideration Each Individual Rule Before Applying the BCC emails
         * Todo Take into the domain exception
         * Todo take into consideration the sender email
         */

        let bccEmails = "";
        Object.values(this.rules).forEach(rule => {
            let bccEmailsArray = []
            Object.values(rule.bccEmails).forEach(email => {
                bccEmailsArray.push(email)
            })
            bccEmails += bccEmailsArray.join(',')
        })

        this.setBccEmails(bccEmails)


        this.autofillField(formElement, this.bccEmails, "bcc");
        //Todo We don't support CC as of now so lets just comment it out for now
        // this.autofillField(formElement, this.ccEmails, "cc");
    };

    /**
     * Rather than using classes which honestly make no sense, we instead scan for the aria labels. Accessibility in mind,
     * these are less likely to change often so we thought it would be a good idea to just "search" for the cards and emails using
     * that as an anchor point
     *
     * @param formElement
     * @param emailList
     * @param context
     */
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

let autoBcc = new GmailAutoBccHandler();
