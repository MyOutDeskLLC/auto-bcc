const SELECTOR_PRIMARY_COMPOSER_FORM = "form.bAs";
const SELECTOR_FOR_TO_CC_AND_BCC_FIELDS = ".wO.nr";
const SELECTOR_FOR_BCC_SPAN = ".aB.gQ.pB";
const SELECTOR_FOR_CC_SPAN = ".aB.gQ.pE";
const EMAIL_REGEX = /([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)/;
import "./icons/gray-scale-orange-square-mail.png"

const DEFAULT_OPTIONS = {
    offByDefault: false
}

class GmailAutoBccHandler {

    constructor() {
        this.debugMode = true;
        this.ccEmails = "";
        this.bccEmails = "";
        this.knownForms = [];
        this.formsEnabled = {};
        this.observerMap = {};
        this.watcher = null;
        this.observer = null;
        this.rules = {};
        this.options = {};
        // Get initial rules and hookup observers
        this.debug("getting rules from storage");
        this.getRulesFromStorage();
        this.debug("getting options from storage");
        this.getOptionsFromStorage();
        this.debug("creating email observer");
        this.createEmailFormObserver();
        this.debug("creating observer for garbage collection");
        this.createGlobalObserver();
        this.debug("adding listener for rule changes");
        chrome.storage.onChanged.addListener((changes, namespace) => {
            this.getRulesFromStorage();
        });
    }

    /**
     * This function will discover the logged-in user from the window title
     */
    discoverLoggedInUser = () => {
        let matches = EMAIL_REGEX.exec(document.title);
        if (matches !== null) {
            // You may be curious why this is done. We need the LAST email to show up
            // if someone emails you and the topic has another email in it, then it would fetch that in error
            return matches[matches.length - 1];
        }
        this.debug(`failed to discover logged-in user based on current title ${document.title}`);
        // If we cannot find it, then im not sure?
        return null;
    };

    /**
     * This is just a helper function to print debug statements into the console
     *
     * @param output
     */
    debug = (...output) => {
        if (!this.debugMode) {
            return;
        }

        output.forEach(item => {
            if (typeof item === "string") {
                console.log(`%c${item}`, "background: #222; color: #7dd3fc;");
            } else {
                console.log(`%cObject: %o`, "background: #222; color: #7dd3fc", item);
            }
        });
    };

    getRulesFromStorage = () => {
        chrome.storage.local.get("rules", (data) => {
            if (!data.rules) {
                this.rules = {};
                return;
            }
            this.rules = data.rules;
        });
    };

    getOptionsFromStorage = () => {
        chrome.storage.local.get("options", (data) => {
            if (!data.options) {
                this.options = DEFAULT_OPTIONS;
                return;
            }
            this.options = data.options;
        });
    }

    createIgnoreEmailButton = (formId) => {
        let tbody = document.getElementById(formId).parentElement.parentElement.parentElement;
        let tr = document.createElement("tr");
        let td = document.createElement("td");
        let button = document.createElement("button");
        let image = new Image();
        let span = document.createElement("span");
        span.innerText = this.options.offByDefault === false ? "AutoBCC Enabled" : "AutoBCC Disabled";
        span.style.marginLeft = '0.25rem';
        span.style.fontSize = '0.75rem';
        image.src = this.options.offByDefault === false ? chrome.runtime.getURL("src/icons/orange-square-mail.png") : chrome.runtime.getURL("src/icons/gray-scale-orange-square-mail.png");
        image.style.width = "1rem";
        image.style.height = "1rem";
        button.style.borderWidth = "0px";
        button.style.cursor = "pointer";
        button.style.marginTop = "0.5rem";
        button.style.borderRadius = "0.25rem";
        button.style.paddingTop = "0.25rem";
        button.style.paddingRight = "0.25rem";
        button.style.paddingLeft = "0.25rem";
        button.style.display = "flex";
        button.style.alignItems = "center";
        button.style.justifyContent = "center";
        button.setAttribute("form-id", formId);
        button.append(image);
        button.append(span);

        button.addEventListener("click", (e) => {
            if (this.formsEnabled[formId].disabled === true) {
                this.debug(button.firstChild);
                let img = button.firstChild
                img.src = chrome.runtime.getURL("src/icons/orange-square-mail.png");
                button.children[1].innerText = "AutoBCC Enabled";
                this.formsEnabled[formId].disabled = false;
                this.debug('setting to FALSE')
            } else {
                this.debug(button.firstChild);
                let img = button.firstChild
                img.src = chrome.runtime.getURL("src/icons/gray-scale-orange-square-mail.png");
                button.children[1].innerText = "AutoBCC Disabled";
                this.formsEnabled[formId].disabled = true;
                this.debug('setting to TRUE')
            }
        });


        td.append(button);
        //for some reason google hooks the first element in the td and does some weird styling,
        // but only after the row is already in the dom so add the row to the dom with the td we want then add this td to the row that was added to the dom
        let ghettoHookTdForGoogle = document.createElement("td");
        ghettoHookTdForGoogle.classList.add("aoY");
        tr.append(td);
        tbody.prepend(tr);
        tbody.childNodes[0].prepend(ghettoHookTdForGoogle);
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
                        this.debug(`disconnecting missing form: ${formId}`);
                        this.observerMap[formId].disconnect();
                        delete(this.formsEnabled[formId])
                    }
                    return false;
                }
                if (!Object.keys(this.formsEnabled).includes(formId)) {
                    this.formsEnabled[formId] = {
                        disabled: this.options.offByDefault === true ? true : false,
                    };
                    this.createIgnoreEmailButton(formId);
                }
                // Form is still on the page, do nothing here
                return true;
            });
        }, 1000);
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
        elementsInserted.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (!node || typeof node.querySelector !== "function") {
                    return;
                }
                if (node.querySelector(SELECTOR_PRIMARY_COMPOSER_FORM)) {
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
            this.debug(`connecting to new form: ${formElement.id}`);
            setTimeout(() => {
                this.checkExistingRecipients(formElement);
                this.observeRecipientCards(formElement);
                this.observeRecipientInput(formElement);
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
                this.debug("located search field, looking for nearby input");
                foundElement = divElement.querySelector("input");
            }
        });

        if (foundElement) {
            this.debug("scanning for existing recipients under search field", foundElement);
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
        let parentRow = node.closest("tr");
        // Scan for divs under this with the role "option", as these are the recipients. The div contains data we also need.
        let potentialNearbyCards = parentRow.querySelectorAll("div[role=option]");
        // Drop anything that does not have both dataset and a hovercardId. The hoverCardId contains the email of the user.
        return [...potentialNearbyCards].filter(card => {
            return card.dataset && card.dataset.hovercardId;
        });
    };

    observeRecipientInput = (formElement) => {
        this.locateProperRecipientInputField(formElement);
    };

    locateProperRecipientInputField = (formElement) => {
        formElement.querySelectorAll("span").forEach(spanElement => {
            if (spanElement.ariaLabel && spanElement.ariaLabel.toLowerCase().startsWith("to - select contacts")) {
                let properEmailInputField = spanElement.parentElement.parentElement.parentElement.querySelector("input");
                this.debug("Email To Field Input: ", properEmailInputField);
                properEmailInputField.addEventListener("blur", (e) => {
                    this.debug("firing blur event");
                    e.target.value.split(",").forEach(recipient => {
                        this.updateCcAndBccRecipients(recipient, formElement);
                    });
                });
                properEmailInputField.addEventListener("keydown", (e) => {
                    if (e.code !== "Escape") {
                        return;
                    }
                    setTimeout(() => {
                        this.debug("firing esc handler to check emails");
                        e.target.value.split(",").forEach(recipient => {
                            this.updateCcAndBccRecipients(recipient, formElement);
                        });
                    }, 350);
                    // e.target.focus();
                });
            }
        });
    };

    /**
     * This function hooks the intended recipients block with an observer so we know who email is being delivered to
     *
     * @param formElement
     */
    observeRecipientCards = (formElement) => {
        const recipientChanged = (mutationList, observer) => {
            for (const mutation of mutationList) {
                for (const addedNode of mutation.addedNodes) {
                    if (addedNode.role === "option" && addedNode.dataset && addedNode.dataset.hovercardId) {
                        this.debug("to recipient change found, updating cc and bcc recipients", addedNode.dataset);
                        this.updateCcAndBccRecipients(addedNode.dataset.hovercardId, formElement);
                    }
                }
            }
        };

        const observer = new MutationObserver(recipientChanged);
        observer.observe(formElement, {
            attributes: false,
            childList: true,
            subtree: true,
        });
        this.observerMap[formElement.id] = observer;
    };

    /**
     * Simple: dumps the proper CC and BCC recipients into the field as required by the rules
     *
     * @param recipient
     * @param formElement
     */
    updateCcAndBccRecipients = (recipient, formElement) => {
        let currentFocus = document.querySelector(":focus");
        this.debug("adding recipients based on email rules for: ", recipient);
        if(this.formsEnabled[formElement.id] && this.formsEnabled[formElement.id].disabled === true){
            this.debug('rules disabled for form. returning early')
            return;
        }

        formElement.querySelector(SELECTOR_FOR_CC_SPAN)?.click();
        formElement.querySelector(SELECTOR_FOR_BCC_SPAN)?.click();

        if (Object.keys(this.rules).length < 1) {
            return;
        }

        let currentSender = this.discoverLoggedInUser();
        let targetDomain = recipient.split("@")[1];

        // No rules available for this email sender
        if (!currentSender || !this.rules[currentSender] || !targetDomain || this.rules[currentSender].excludedDomains.includes(targetDomain)) {
            this.debug("no rules available for email sender.");
            return;
        }

        this.debug("current sender" + currentSender);

        this.autofillField(formElement, this.rules[currentSender].bccEmails, "bcc");
        this.autofillField(formElement, this.rules[currentSender].ccEmails, "cc");

        if (currentFocus) {
            currentFocus.focus();
        }
    };

    mergeArraysWithNoDuplicates = (array1, array2) => {
        let newArray = [...array1];

        array2.forEach(item => {
            if (!newArray.includes(item)) {
                newArray.push(item);
            }
        });

        return newArray;
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
        if (emailList.length < 1) {
            this.debug("email list empty", context);
            return;
        }
        let validEmails = emailList.filter(email => {
            return EMAIL_REGEX.test(email);
        });
        if (validEmails.length === 0) {
            return;
        }
        formElement.querySelectorAll("span").forEach(spanElement => {
            if (spanElement.ariaLabel && spanElement.ariaLabel.toLowerCase().startsWith(`${context} -`)) {
                this.debug("found proper nearby span to autofill against", spanElement);
                let properEmailInputField = spanElement.parentElement.parentElement.querySelector("input");


                this.debug("found proper input field to use", properEmailInputField);
                let existingEmails = properEmailInputField.value;

                let emailsInsideRegularInput = properEmailInputField.value.split(",");
                let emailsCommittedAsCards = [];
                this.scanForCardsUnderNode(spanElement).forEach(card => {
                    this.debug("scanning", card.dataset.hoverCardId);
                    emailsCommittedAsCards.push(card.dataset.hovercardId);
                });

                let newInputArray = this.mergeArraysWithNoDuplicates(emailsInsideRegularInput, emailList);

                let finalInput = newInputArray.filter((item) => {
                    return item && !emailsCommittedAsCards.includes(item);
                });

                this.debug(finalInput);

                properEmailInputField.value = finalInput.join(",");

                this.debug(`updated ${context} recipients to`, emailList, existingEmails);
            }
        });
    };
}

let autoBcc = new GmailAutoBccHandler();
