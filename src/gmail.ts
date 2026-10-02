const SELECTOR_PRIMARY_COMPOSER_FORM = "form.bAs";
const SELECTOR_FOR_FROM_SPAN = '.az2.az4.L3 span';
const SELECTOR_FOR_BCC_SPAN = ".aB.gQ.pB";
const SELECTOR_FOR_CC_SPAN = ".aB.gQ.pE";
const EMAIL_REGEX = /([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)/;
import "./icons/gray-scale-orange-square-mail.png"

const DEFAULT_OPTIONS = {
    offByDefault: false,
    hideInlineButton: false
}

class GmailAutoBccHandler {
    public debugMode: boolean;
    public ccEmails: string;
    public bccEmails: string;
    public knownForms: string[];
    public formsEnabled: Record<string, any>;
    public observerMap: Record<string, any>;
    public observer: any;
    public rules: Record<string, any>;
    public options: Record<string, any>;
    public autofilling: boolean;

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
        this.autofilling = false;
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
        chrome.storage.onChanged.addListener(() => {
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
     * This function will discover the current "from" address in the email form
     * if it exists.  If it does not exist, then it will return the logged-in user.
     */
    discoverCurrentSender = () => {
        // Find the span element containing the email address using the defined
        // selector.  This span element is only present when the user has
        // multiple "send as" addresses configured.
        const fromField = document.querySelector(SELECTOR_FOR_FROM_SPAN);

        if (fromField && fromField.textContent) {
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
    debug = (...output: any[]) => {
        if (!this.debugMode) {
            return;
        }

        output.forEach(item => {
            if (typeof item === "string") {
                console.log(`%c${item}`, "background: #222; color: #7dd3fc; padding: 0.375rem;");
            } else {
                console.log(`%cObject: %o`, "background: #222; color: #7dd3fc", item);
            }
        });
    };

    getRulesFromStorage = () => {
        chrome.storage.local.get("rules", (data: Record<string, any>) => {
            if (!data.rules) {
                this.rules = {};
                return;
            }
            this.rules = data.rules;
        });
    };

    getOptionsFromStorage = () => {
        chrome.storage.local.get("options", (data: Record<string, any>) => {
            if (!data.options) {
                this.options = DEFAULT_OPTIONS;
                return;
            }
            this.options = data.options;
        });
    }

    createIgnoreEmailButton = (formId: string) => {
        if (this.options.hideInlineButton === true) {
            return;
        }

        let tbody = document.getElementById(formId)?.parentElement?.parentElement?.parentElement;

        if (!tbody) {
            return;
        }

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

        button.addEventListener("click", () => {
            if (this.formsEnabled[formId].disabled === true) {
                let img = button.firstChild as HTMLImageElement;
                img.src = chrome.runtime.getURL("src/icons/orange-square-mail.png");
                if (button.children[1]) {
                    //@ts-ignore
                    button.children[1].innerText = "AutoBCC Enabled";
                }
                this.formsEnabled[formId].disabled = false;
                this.debug('setting to FALSE')

                //Add recipients to the form when the button is clicked
                let formElement: HTMLElement | null = document.getElementById(formId);
                this.scanForCardsUnderNode(formElement).forEach(card => {
                    this.updateCcAndBccRecipients(card.dataset.hovercardId, formElement);

                })
            } else {
                this.debug(button.firstChild);
                let img = button.firstChild as HTMLImageElement
                img.src = chrome.runtime.getURL("src/icons/gray-scale-orange-square-mail.png");
                //@ts-ignore
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
        //@ts-ignore
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
    examineInsertedElements = (elementsInserted: any[]) => {
        elementsInserted.forEach(mutation => {
            mutation.addedNodes.forEach((node: any) => {
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
        const allForms: NodeListOf<HTMLElement> = document.querySelectorAll(SELECTOR_PRIMARY_COMPOSER_FORM);
        // Loop through each form and connect to new forms if they are not already known
        allForms.forEach((formElement: HTMLElement) => {
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
    checkExistingRecipients(formElement: HTMLElement) {
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
    scanForCardsUnderNode(node: any) {
        this.debug("Scanning for cards under node")
        // Find the closest parent row element
        let parentRow = node.closest("tr");
        // Find all divs under the parent row with the role "option", which contain recipient data
        let potentialNearbyCards = parentRow.querySelectorAll("div[role=option]");
        // Filter out any potential cards that don't have a dataset or hovercardId
        return [...potentialNearbyCards].filter(card => card.dataset && card.dataset.hovercardId);
    }


    observeRecipientInput = (formElement: HTMLElement) => {
        this.locateProperRecipientInputField(formElement);
    };

    locateProperRecipientInputField(formElement: HTMLElement) {
        // Loop through each span element and look for the "To - Select Contacts" aria-label
        formElement.querySelectorAll("span").forEach(spanElement => {
            if (spanElement.ariaLabel && spanElement.ariaLabel.toLowerCase().startsWith("to - select contacts")) {
                // If the proper span element is found, set the proper email input field
                let properEmailInputField = spanElement?.parentElement?.parentElement?.parentElement?.querySelector("input");
                this.debug("Email To Field Input: ", properEmailInputField);

                if (!properEmailInputField) {
                    return;
                }

                // Add an event listener to the input field's blur event to update the CC and BCC recipients
                properEmailInputField.addEventListener("blur", (e: FocusEvent) => {
                    this.debug("Blur event fired.");
                    this.scanForCardsUnderNode(formElement).forEach(card => {
                        this.debug(`Found Card: ${card.dataset.hovercardId}`)
                        this.updateCcAndBccRecipients(card.dataset.hovercardId, formElement);
                    })
                    //@ts-ignore
                    e?.target?.value?.split(",").forEach((recipient: string) => {
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
                        //@ts-ignore
                        e?.target?.value?.split(",").forEach((recipient: string) => {
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
    observeRecipientCards = (formElement: HTMLElement) => {
        const recipientChanged = (mutationList: any) => {
            for (const mutation of mutationList) {
                for (const addedNode of mutation.addedNodes) {
                    if (addedNode.role === "option" && addedNode.dataset && addedNode.dataset.hovercardId) {
                        this.debug("to recipient change found, updating cc and bcc recipients", addedNode.dataset);
                        this.updateCcAndBccRecipients(addedNode.dataset.hovercardId, formElement);
                    }
                }
            }
        }

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
    updateCcAndBccRecipients = (recipient: string, formElement: HTMLElement | null) => {
        if (!formElement) {
            return;
        }

        // Autofilling moves focus into the CC/BCC inputs, which fires the "To" input's blur handler and calls back in
        // here. The rules for this sender are already being applied, so ignore those nested calls.
        if (this.autofilling) {
            return;
        }

        // Store the currently focused element, so it can be refocused later
        let currentFocus = document.querySelector<HTMLElement>(":focus");

        this.debug(this.formsEnabled);
        if (!this.formsEnabled[formElement.id]) {
            this.debug("Form not found. Trying again in 250ms");
            setTimeout(() => {
                this.updateCcAndBccRecipients(recipient, formElement);
            }, 250);
            return;
        }

        // Check if email rules are disabled for this form
        if (this.formsEnabled[formElement.id] && this.formsEnabled[formElement.id].disabled === true) {
            this.debug('email rules disabled for form. returning early');
            return;
        }

        // Open the CC and BCC fields
        formElement.querySelector<HTMLElement>(SELECTOR_FOR_CC_SPAN)?.click();
        formElement.querySelector<HTMLElement>(SELECTOR_FOR_BCC_SPAN)?.click();

        // Check if there are any email rules defined
        if (Object.keys(this.rules).length < 1) {
            this.debug("no email rules defined.");
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
        this.autofilling = true;
        this.applyRuleWhenFieldsOpen(formElement, this.rules[currentSender], currentFocus);
    };

    /**
     * Gmail renders the CC and BCC inputs shortly after their links are clicked, and an input can't be typed into
     * until it is visible. Wait for the inputs this rule needs to show up, then fill them in.
     *
     * @param formElement
     * @param rule
     * @param currentFocus
     * @param attempt
     */
    applyRuleWhenFieldsOpen = (formElement: HTMLElement, rule: Record<string, any>, currentFocus: HTMLElement | null, attempt = 0) => {
        let neededContexts = [["bcc", rule.bccEmails], ["cc", rule.ccEmails]]
            .filter(([, emails]) => emails.length > 0)
            .map(([context]) => context as string);
        let fieldsOpen = neededContexts.every(context => this.findRecipientInput(formElement, context)?.offsetParent);

        if (!fieldsOpen && attempt < 20) {
            setTimeout(() => this.applyRuleWhenFieldsOpen(formElement, rule, currentFocus, attempt + 1), 100);
            return;
        }
        if (!fieldsOpen) {
            this.debug("CC/BCC fields never became visible, filling in what we can.");
        }

        try {
            this.autofillField(formElement, rule.bccEmails, "bcc");
            this.autofillField(formElement, rule.ccEmails, "cc");
        } finally {
            this.autofilling = false;
        }

        // Refocus the previously focused element
        if (currentFocus) {
            currentFocus.focus();
        }
    };


    mergeArraysWithNoDuplicates = (array1: any[], array2: any[]) => {
        let newArray = [...array1];

        array2.forEach(item => {
            if (!newArray.includes(item)) {
                newArray.push(item);
            }
        });

        return newArray;
    };


    /**
     * Gmail keeps its own model of the recipient fields, so setting an input's value directly leaves raw text that is
     * never turned into a recipient chip. Inserting text as if it were typed keeps Gmail's model in sync.
     *
     * @param input
     * @param text
     */
    typeIntoInput = (input: HTMLInputElement, text: string) => {
        input.focus();
        return document.execCommand("insertText", false, text);
    };

    /**
     * Simulates pressing Enter, which makes Gmail convert the typed address into a recipient chip. Gmail checks the
     * legacy keyCode/which properties, so they have to be passed to the constructor. Overriding them on the event
     * object afterwards only changes this content script's isolated world, and Gmail's page scripts still see 0.
     *
     * @param input
     */
    pressEnter = (input: HTMLInputElement) => {
        ["keydown", "keypress", "keyup"].forEach(type => {
            input.dispatchEvent(new KeyboardEvent(type, {
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true,
            }));
        });
    };

    /**
     * We decided to use aria labels instead of classes to locate elements since they are more accessible and less
     * likely to change frequently. We scan for the cards and emails using this as an anchor point.
     *
     * @param formElement
     * @param emailList
     * @param context
     */
    autofillField = (formElement: HTMLElement, emailList: string[], context: string) => {
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

        let spanElement = this.findRecipientLabel(formElement, context);
        let properEmailInputField = this.findRecipientInput(formElement, context);
        if (!spanElement || !properEmailInputField) {
            return;
        }

        this.debug("found proper input field to use", properEmailInputField);
        let existingEmails = properEmailInputField.value;

        let emailsInsideRegularInput = properEmailInputField.value.split(",").map(email => email.trim());
        let emailsCommittedAsCards: string[] = [];
        this.scanForCardsUnderNode(spanElement).forEach(card => {
            this.debug(`Found Card: ${card.dataset.hovercardId}`)
            emailsCommittedAsCards.push(card.dataset.hovercardId);
        });

        let emailsToAdd = validEmails.filter((email) => {
            return !emailsCommittedAsCards.includes(email) && !emailsInsideRegularInput.includes(email);
        });

        this.debug(emailsToAdd);

        if (emailsToAdd.length === 0) {
            return;
        }

        let inputField = properEmailInputField;
        inputField.focus();
        // Commit anything already typed in the field so the new addresses are not appended onto it.
        if (inputField.value.trim()) {
            this.pressEnter(inputField);
        }
        emailsToAdd.forEach(email => {
            if (this.typeIntoInput(inputField, email)) {
                this.pressEnter(inputField);
            }
        });

        // If Gmail didn't turn the addresses into chips, fall back to leaving them as raw text in the input, which
        // Gmail still sends to.
        setTimeout(() => {
            let emailsNowCards = this.scanForCardsUnderNode(spanElement).map(card => card.dataset.hovercardId);
            let missingEmails = emailsToAdd.filter(email => !emailsNowCards.includes(email) && !inputField.value.includes(email));
            if (missingEmails.length === 0) {
                return;
            }
            this.debug(`Could not add ${context} recipients as chips, falling back to raw text`, missingEmails);
            let rawEmails = inputField.value.split(",").map(email => email.trim()).filter(email => email);
            inputField.value = this.mergeArraysWithNoDuplicates(rawEmails, missingEmails).join(",");
        }, 300);

        this.debug(`updated ${context} recipients to`, emailList, existingEmails);
    };

    /**
     * Finds the label span for the "cc" or "bcc" field, which is used as an anchor to locate the input and its cards.
     *
     * @param formElement
     * @param context
     */
    findRecipientLabel = (formElement: HTMLElement, context: string) => {
        return [...formElement.querySelectorAll("span")].find((spanElement: HTMLSpanElement) => {
            return spanElement.ariaLabel && spanElement.ariaLabel.toLowerCase().startsWith(`${context} -`);
        }) ?? null;
    };

    findRecipientInput = (formElement: HTMLElement, context: string) => {
        return this.findRecipientLabel(formElement, context)?.parentElement?.parentElement?.querySelector("input") ?? null;
    };
}

new GmailAutoBccHandler();