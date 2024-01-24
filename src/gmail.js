const SELECTOR_PRIMARY_COMPOSER_FORM = "form.bAs";
const SELECTOR_FOR_FROM_SPAN = '.az2.az4.L3 span';
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
        this.observer = null;
        this.rules = {};
        this.options = {};
        // Get initial rules and hookup observers
        this.debug("Retrieving email rules from local storage.");
        this.getRulesFromStorage();
        this.debug("Retrieving options from storage.");
        this.getOptionsFromStorage();
        this.debug("Creating an email form observer.");
        this.createEmailFormObserver();
        this.debug("Creating an observer for garbage collection.");
        this.createGlobalObserver();
        this.debug("Adding a listener for changes to the rules.");
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
            // The reason behind this is to display the latest email correctly. If an email thread has multiple emails
            // with the same topic, displaying any email other than the last one could result in an error.
            return matches[matches.length - 1];
        }
        this.debug(`Failed to discover logged-in user based on current title ${document.title}`);
        // If we cannot find it, then im not sure?
        return null;
    };

    /**
     * This function will discover the current "from" address in the email form,
     * if it exists.  If it does not exist, then it will return the logged-in user.
     */
    discoverCurrentSender = () => {
        // Find the span element containing the email address using the defined
        // selector.  This span element is only present when the user has
        // multiple "send as" addresses configured.
        const fromField = document.querySelector(SELECTOR_FOR_FROM_SPAN);

        if (fromField) {
            // Extracting the email address using regex
            const emailMatch = fromField.textContent.match(EMAIL_REGEX);
            if (emailMatch) {
                return emailMatch[0]; // Return the extracted email address
            } else {
                this.debug(`Failed to extract sender email from: ${fromField.textContent}`);
            }
        }

        this.debug(`Failed to discover current sender, returning logged-in user`);
        return this.discoverLoggedInUser();
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
                console.log(`%c${item}`, "background: #222; color: #7dd3fc; padding: 0.375rem;");
            }
            else {
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
                let img = button.firstChild
                img.src = chrome.runtime.getURL("src/icons/orange-square-mail.png");
                button.children[1].innerText = "AutoBCC Enabled";
                this.formsEnabled[formId].disabled = false;
                this.debug('setting to FALSE')

                //Add recipients to the form when the button is clicked
                let formElement = document.getElementById(formId);
                this.scanForCardsUnderNode(formElement).forEach(card => {
                    this.updateCcAndBccRecipients(card.dataset.hovercardId, formElement);

                })
            }
            else {
                this.debug(button.firstChild);
                let img = button.firstChild
                img.src = chrome.runtime.getURL("src/icons/gray-scale-orange-square-mail.png");
                button.children[1].innerText = "AutoBCC Disabled";
                this.formsEnabled[formId].disabled = true;
                this.debug('setting to TRUE')
            }
        });


        td.append(button);
        //Google seems to be applying some styling to the first element in the table cell (td) after the row is added
        // to the DOM. To avoid this issue, we add the table row (tr) to the DOM with the desired td element, and then
        // add the td to the row.
        let ghettoHookTdForGoogle = document.createElement("td");
        ghettoHookTdForGoogle.classList.add("aoY");
        tr.append(td);
        tbody.prepend(tr);
        tbody.childNodes[0].prepend(ghettoHookTdForGoogle);
    };

    /**
     Creates an interval to ensure old observers are cleaned up. If a form no longer exists,
     the corresponding observer will be disconnected to prevent unnecessary processing.
     */
    createGlobalObserver() {
        this.observer = setInterval(() => {
            // Loop through each known form ID and filter out any forms that no longer exist on the page
            this.knownForms = this.knownForms.filter(formId => {
                if (!document.getElementById(formId)) {
                    // If the form is missing, disconnect its observer (if it exists), delete its entry in the
                    // formsEnabled object, and return false to remove it from the knownForms array
                    if (this.observerMap[formId]) {
                        this.debug(`Disconnecting missing form: ${formId}`);
                        this.observerMap[formId].disconnect();
                        delete (this.formsEnabled[formId])
                    }
                    return false;
                }
                if (!Object.keys(this.formsEnabled).includes(formId)) {
                    this.formsEnabled[formId] = {
                        disabled: this.options.offByDefault === true,
                    };
                    this.createIgnoreEmailButton(formId);
                }
                // Form is still on the page, do nothing here
                return true;
            });
        }, 1000);
    }


    /**
     * This code utilizes a Mutation Observer to scan the entire document for new email forms that may appear.
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
     * This function detects the addition of any forms on the page, such as those generated by clicking "compose" or
     * "reply."
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
     * Once the mutation observer detects a new form, this function establishes a connection to it and adds an observer
     * to the recipient field. Additionally, it checks if any recipients are already declared (such as from a draft
     * email) and updates the corresponding fields accordingly.
     */
    connectToNewForms() {
        // Get all forms that match the primary composer selector
        const allForms = document.querySelectorAll(SELECTOR_PRIMARY_COMPOSER_FORM);
        // Loop through each form and connect to new forms if they are not already known
        allForms.forEach(formElement => {
            if (this.knownForms.includes(formElement.id)) {
                return;
            }
            this.knownForms.push(formElement.id);
            this.debug(`Connecting to new form: ${formElement.id}`);
            // Add a timeout to wait for recipient inputs to load before observing changes
            setTimeout(() => {
                this.checkExistingRecipients(formElement);
                this.observeRecipientCards(formElement);
                this.observeRecipientInput(formElement);
            }, 500);
        });
    }

    /**
     * For drafts and replies, we need to check if anyone is already getting this email
     *
     * @param formElement
     */
    checkExistingRecipients(formElement) {
        // Initialize a variable to store the found element
        let foundElement = null;
        // Loop through each div element with class "afx" and look for a search field
        formElement.querySelectorAll("div.afx").forEach(divElement => {
            if (divElement.ariaLabel && divElement.ariaLabel.toLowerCase().startsWith(`search field`)) {
                this.debug("Located search field, looking for nearby input");
                // If a search field is found, set the found element to its input field
                foundElement = divElement.querySelector("input");
            }
        });

        // If a found element exists, scan for existing recipients under it
        if (foundElement) {
            this.debug("Scanning for existing recipients under search field", foundElement);
            this.scanForCardsUnderNode(foundElement).forEach(item => {
                this.debug(`Found Card: ${item.dataset.hovercardId}`)
                // Update the CC and BCC recipients for each recipient card found
                this.updateCcAndBccRecipients(item.dataset.hovercardId, formElement);
            });
        }
    }


    /**
     * After a new recipient is added and the enter key is pressed, the recipient's email is moved from the input field
     * to a hoverable card. Therefore, when sending an email, replying to one, or continuing from a draft, we need to
     * locate these hoverable cards and extract the email addresses from them.
     *
     * @param node
     * @returns {*[]}
     */
    scanForCardsUnderNode(node) {
        this.debug("Scanning for cards under node")
        // Find the closest parent row element
        let parentRow = node.closest("tr");
        // Find all divs under the parent row with the role "option", which contain recipient data
        let potentialNearbyCards = parentRow.querySelectorAll("div[role=option]");
        // Filter out any potential cards that don't have a dataset or hovercardId
        return [...potentialNearbyCards].filter(card => card.dataset && card.dataset.hovercardId);
    }


    observeRecipientInput = (formElement) => {
        this.locateProperRecipientInputField(formElement);
    };

    locateProperRecipientInputField(formElement) {
        // Loop through each span element and look for the "To - Select Contacts" aria-label
        formElement.querySelectorAll("span").forEach(spanElement => {
            if (spanElement.ariaLabel && spanElement.ariaLabel.toLowerCase().startsWith("to - select contacts")) {
                // If the proper span element is found, set the proper email input field
                let properEmailInputField = spanElement.parentElement.parentElement.parentElement.querySelector("input");
                this.debug("Email To Field Input: ", properEmailInputField);
                // Add an event listener to the input field's blur event to update the CC and BCC recipients
                properEmailInputField.addEventListener("blur", (e) => {
                    this.debug("Blur event fired.");
                    this.scanForCardsUnderNode(formElement).forEach(card => {
                        this.debug(`Found Card: ${card.dataset.hovercardId}`)
                        this.updateCcAndBccRecipients(card.dataset.hovercardId, formElement);
                    })
                    e.target.value.split(",").forEach(recipient => {
                        this.debug(`Found raw email: ${recipient}`)
                        this.updateCcAndBccRecipients(recipient, formElement);
                    });
                });
                // Add an event listener to the input field's keydown event to update the CC and BCC recipients when
                // the Escape key is pressed
                properEmailInputField.addEventListener("keydown", (e) => {
                    if (e.code !== "Escape") {
                        return;
                    }
                    setTimeout(() => {
                        this.debug("Firing esc handler to check emails");
                        e.target.value.split(",").forEach(recipient => {
                            this.updateCcAndBccRecipients(recipient, formElement);
                        });
                    }, 350);
                });
            }
        });
    }


    /**
     * This function sets up an observer on the intended recipients block to track the email addresses being added or
     * removed from the block.
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
     * This function inserts the correct CC and BCC recipients into the respective fields according to the defined
     * rules.
     *
     * @param recipient
     * @param formElement
     */
    updateCcAndBccRecipients = (recipient, formElement) => {
        // Store the currently focused element so it can be refocused later
        let currentFocus = document.querySelector(":focus");

        this.debug(this.formsEnabled);
        if (!this.formsEnabled[formElement.id]) {
            this.debug("Form not found. Trying again in 250ms");
            setTimeout(() => {
                this.updateCcAndBccRecipients(recipient, formElement);
            }, 250);
        }

        // Check if email rules are disabled for this form
        if (this.formsEnabled[formElement.id] && this.formsEnabled[formElement.id].disabled === true) {
            this.debug('email rules disabled for form. returning early');
            return;
        }

        // Open the CC and BCC fields
        formElement.querySelector(SELECTOR_FOR_CC_SPAN)?.click();
        formElement.querySelector(SELECTOR_FOR_BCC_SPAN)?.click();

        // Check if there are any email rules defined
        if (Object.keys(this.rules).length < 1) {
            return;
        }

        // Determine the current sender and target domain
        let currentSender = this.discoverCurrentSender();
        let targetDomain = recipient.split("@")[1];

        // Check if there are any email rules available for this sender and domain
        if (!currentSender || !this.rules[currentSender] || !targetDomain || this.rules[currentSender].excludedDomains.includes(targetDomain)) {
            this.debug("no rules available for email sender.");
            return;
        }

        // Apply the email rules to the BCC and CC fields
        this.debug("current sender: " + currentSender);
        this.autofillField(formElement, this.rules[currentSender].bccEmails, "bcc");
        this.autofillField(formElement, this.rules[currentSender].ccEmails, "cc");

        // Refocus the previously focused element
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
     * We decided to use aria labels instead of classes to locate elements since they are more accessible and less
     * likely to change frequently. We scan for the cards and emails using this as an anchor point.
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
                    this.debug(`Found Card: ${card.dataset.hovercardId}`)
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
