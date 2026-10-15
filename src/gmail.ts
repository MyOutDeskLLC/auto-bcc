const EMAIL_REGEX = /([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)/;
import "./icons/gray-scale-orange-square-mail.png"
import {matchRuleForRecipient, normalizeRules} from "./rules";
import {composeLog, log, setDebugLogging} from "./logger";
import {COMPOSE_MARKER_SELECTOR, findAddRecipientLink, findComposeForms, findSender} from "./compose";
import type {Rule} from "./rules";

const DEFAULT_OPTIONS = {
    offByDefault: false,
    hideInlineButton: false,
    debugLogging: false
}

class GmailAutoBccHandler {
    public ccEmails: string;
    public bccEmails: string;
    public knownForms: string[];
    public formsEnabled: Record<string, any>;
    public observerMap: Record<string, any>;
    public formObserver: MutationObserver | null;
    public cleanupTimer: ReturnType<typeof setInterval> | null;
    public rules: Record<string, Rule>;
    public options: Record<string, any>;
    public autofilling: boolean;

    constructor() {
        this.ccEmails = "";
        this.bccEmails = "";
        this.knownForms = [];
        this.formsEnabled = {};
        this.observerMap = {};
        this.formObserver = null;
        this.cleanupTimer = null;
        this.rules = {};
        this.options = {};
        this.autofilling = false;
        // Get initial rules and hookup observers
        this.getRulesFromStorage();
        this.getOptionsFromStorage();
        this.createEmailFormObserver();
        this.createGlobalObserver();
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.rules) {
                this.getRulesFromStorage();
            }
            if (changes.options) {
                this.getOptionsFromStorage();
            }
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
        log.warn(`Couldn't find the signed-in address in the page title "${document.title}".`);
        // If we cannot find it, then im not sure?
        return null;
    };

    /**
     * This function will discover the current "from" address in the email form if it exists. If it does not exist,
     * then it will return the logged-in user.
     *
     * @param formElement
     */
    discoverCurrentSender = (formElement: HTMLElement) => {
        const sender = findSender(formElement);
        if (sender) {
            return sender;
        }

        const loggedInUser = this.discoverLoggedInUser();
        log.debug(`No "from" address in the compose window, using the signed-in address ${loggedInUser}.`);
        return loggedInUser;
    };

    /**
     * When the extension is reloaded or updated, the copy of this script already running in Gmail is cut off from it,
     * and any chrome.* call throws "Extension context invalidated". Detect that and stop this copy for good; the new
     * version takes over once Gmail is reloaded.
     */
    isExtensionAlive = () => {
        if (chrome.runtime?.id) {
            return true;
        }
        this.shutDown();
        return false;
    };

    shutDown = () => {
        if (this.cleanupTimer === null && this.formObserver === null) {
            return;
        }
        if (this.cleanupTimer !== null) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.formObserver?.disconnect();
        this.formObserver = null;
        Object.values(this.observerMap).forEach(observer => observer.disconnect());
        this.observerMap = {};
        log.info("The extension was reloaded or updated. Reload Gmail to use the new version.");
    };

    getRulesFromStorage = () => {
        chrome.storage.local.get("rules", (data: Record<string, any>) => {
            this.rules = normalizeRules(data.rules);
            log.debug(`Loaded ${Object.keys(this.rules).length} rule(s).`, this.rules);
        });
    };

    getOptionsFromStorage = () => {
        chrome.storage.local.get("options", (data: Record<string, any>) => {
            this.options = {...DEFAULT_OPTIONS, ...data.options};
            setDebugLogging(this.options.debugLogging === true);
            log.debug("Loaded options.", this.options);
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
            if (!this.isExtensionAlive()) {
                return;
            }
            if (this.formsEnabled[formId].disabled === true) {
                let img = button.firstChild as HTMLImageElement;
                img.src = chrome.runtime.getURL("src/icons/orange-square-mail.png");
                if (button.children[1]) {
                    //@ts-ignore
                    button.children[1].innerText = "AutoBCC Enabled";
                }
                this.formsEnabled[formId].disabled = false;
                composeLog(formId).info("Turned on with the inline button.");

                //Add recipients to the form when the button is clicked
                let formElement: HTMLElement | null = document.getElementById(formId);
                this.scanForCardsUnderNode(formElement).forEach(card => {
                    this.updateCcAndBccRecipients(card.dataset.hovercardId, formElement);

                })
            } else {
                let img = button.firstChild as HTMLImageElement
                img.src = chrome.runtime.getURL("src/icons/gray-scale-orange-square-mail.png");
                //@ts-ignore
                button.children[1].innerText = "AutoBCC Disabled";
                this.formsEnabled[formId].disabled = true;
                composeLog(formId).info("Turned off with the inline button.");
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
        this.cleanupTimer = setInterval(() => {
            if (!this.isExtensionAlive()) {
                return;
            }
            // Loop through each known form ID and filter out any forms that no longer exist on the page
            this.knownForms = this.knownForms.filter(formId => {
                if (!document.getElementById(formId)) {
                    // If the form is missing, disconnect its observer (if it exists), delete its entry in the
                    // formsEnabled object, and return false to remove it from the knownForms array
                    if (this.observerMap[formId]) {
                        composeLog(formId).debug("Closed, stopped watching it.");
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
        this.formObserver = new MutationObserver(this.examineInsertedElements);
        // The production build runs this script at document_start, before <body> exists, so observe the root element.
        this.formObserver.observe(document.documentElement, {
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
        if (!this.isExtensionAlive()) {
            return;
        }
        elementsInserted.forEach(mutation => {
            mutation.addedNodes.forEach((node: any) => {
                if (!node || typeof node.querySelector !== "function") {
                    return;
                }
                if (node.matches?.(COMPOSE_MARKER_SELECTOR) || node.querySelector(COMPOSE_MARKER_SELECTOR)) {
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
        const allForms = findComposeForms(document);
        // Loop through each form and connect to new forms if they are not already known
        allForms.forEach((formElement: HTMLElement) => {
            if (this.knownForms.includes(formElement.id)) {
                return;
            }
            this.knownForms.push(formElement.id);
            composeLog(formElement.id).info(`Opened. AutoBCC is ${this.options.offByDefault === true ? "off" : "on"} for it.`);
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
        let toRow = this.findRecipientRow(formElement, "to");

        // If the "To" row exists, scan for existing recipients under it
        if (toRow) {
            const existing = this.scanForCardsUnderNode(toRow);
            if (existing.length) {
                composeLog(formElement.id).debug(`Already addressed to ${existing.map(card => card.dataset.hovercardId).join(", ")}.`);
            }
            existing.forEach(item => {
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
        let properEmailInputField = this.findRecipientInput(formElement, "to");
        if (!properEmailInputField) {
            composeLog(formElement.id).warn(`Couldn't find the "To" field.`);
            return;
        }

        // Add an event listener to the input field's blur event to update the CC and BCC recipients
        properEmailInputField.addEventListener("blur", (e: FocusEvent) => {
            composeLog(formElement.id).debug(`Left the "To" field, checking its recipients.`);
            this.scanForCardsUnderNode(formElement).forEach(card => {
                this.updateCcAndBccRecipients(card.dataset.hovercardId, formElement);
            })
            //@ts-ignore
            e?.target?.value?.split(",").forEach((recipient: string) => {
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
                composeLog(formElement.id).debug(`Pressed Escape in the "To" field, checking its recipients.`);
                //@ts-ignore
                e?.target?.value?.split(",").forEach((recipient: string) => {
                    this.updateCcAndBccRecipients(recipient, formElement);
                });
            }, 350);
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
                        composeLog(formElement.id).debug(`Recipient added: ${addedNode.dataset.hovercardId}.`);
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
        // Autofilling moves focus into the CC/BCC inputs, which fires the "To" input's blur handler and calls back in
        // here. The rules for this sender are already being applied, so ignore those nested calls.
        if (!formElement || this.autofilling || !recipient.trim() || !this.isExtensionAlive()) {
            return;
        }

        const formLog = composeLog(formElement.id);
        const formState = this.formsEnabled[formElement.id];
        if (!formState) {
            formLog.debug("Not set up yet, trying again in 250ms.");
            setTimeout(() => this.updateCcAndBccRecipients(recipient, formElement), 250);
            return;
        }
        if (formState.disabled === true) {
            formLog.debug(`Skipped ${recipient}: AutoBCC is turned off for this compose window.`);
            return;
        }

        // Store the currently focused element, so it can be refocused after autofilling
        const currentFocus = document.querySelector<HTMLElement>(":focus");
        this.openCcAndBccFields(formElement);

        const rule = this.findRuleForRecipient(recipient, formElement);
        if (!rule) {
            return;
        }

        this.autofilling = true;
        this.applyRuleWhenFieldsOpen(formElement, rule, currentFocus);
    };

    openCcAndBccFields = (formElement: HTMLElement) => {
        findAddRecipientLink(formElement, "cc")?.click();
        findAddRecipientLink(formElement, "bcc")?.click();
    };

    /**
     * Finds the rule to apply for the current sender when emailing `recipient`, or null when none applies.
     *
     * @param recipient
     * @param formElement
     */
    findRuleForRecipient = (recipient: string, formElement: HTMLElement) => {
        const currentSender = this.discoverCurrentSender(formElement);
        const {rule, reason} = matchRuleForRecipient(this.rules, currentSender, recipient);
        if (rule) {
            composeLog(formElement.id).info(`Applying the rule for ${currentSender} to ${recipient}.`, {cc: rule.ccEmails, bcc: rule.bccEmails});
        } else {
            composeLog(formElement.id).debug(`Skipped ${recipient}: ${reason}.`);
        }
        return rule;
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
            composeLog(formElement.id).debug(`The ${neededContexts.join(" and ")} field(s) didn't open after 2 seconds, filling in what we can.`);
        }

        try {
            this.autofillField(formElement, rule.bccEmails, "bcc");
            this.autofillField(formElement, rule.ccEmails, "cc");
        } catch (error) {
            composeLog(formElement.id).error("Failed to fill in CC/BCC.", error);
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
        // In replies Gmail can keep the CC/BCC inputs collapsed, so focus stays in the message body and insertText
        // would type the address there. Only insert when the input really has focus.
        if (document.activeElement !== input) {
            return false;
        }
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
     * Adds the rule's addresses to the "cc" or "bcc" field, skipping any that are already there as chips or raw text.
     *
     * @param formElement
     * @param emailList
     * @param context
     */
    autofillField = (formElement: HTMLElement, emailList: string[], context: string) => {
        if (emailList.length < 1) {
            return;
        }
        const formLog = composeLog(formElement.id);
        const label = context.toUpperCase();
        let validEmails = emailList.filter(email => {
            return EMAIL_REGEX.test(email);
        });
        if (validEmails.length === 0) {
            return;
        }

        let recipientRow = this.findRecipientRow(formElement, context);
        let properEmailInputField = this.findRecipientInput(formElement, context);
        if (!recipientRow || !properEmailInputField) {
            formLog.warn(`Couldn't find the ${label} field.`);
            return;
        }

        let emailsInsideRegularInput = properEmailInputField.value.split(",").map(email => email.trim());
        let emailsCommittedAsCards: string[] = [];
        this.scanForCardsUnderNode(recipientRow).forEach(card => {
            emailsCommittedAsCards.push(card.dataset.hovercardId);
        });

        let emailsToAdd = validEmails.filter((email) => {
            return !emailsCommittedAsCards.includes(email) && !emailsInsideRegularInput.includes(email);
        });

        if (emailsToAdd.length === 0) {
            formLog.debug(`${label} already has ${validEmails.join(", ")}.`);
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
            let emailsNowCards = this.scanForCardsUnderNode(recipientRow).map(card => card.dataset.hovercardId);
            let missingEmails = emailsToAdd.filter(email => !emailsNowCards.includes(email) && !inputField.value.includes(email));
            if (missingEmails.length === 0) {
                formLog.info(`Added to ${label}: ${emailsToAdd.join(", ")}.`);
                return;
            }
            formLog.debug(`Gmail didn't turn ${missingEmails.join(", ")} into ${label} recipients, added them as plain text instead. Gmail still sends to them.`);
            let rawEmails = inputField.value.split(",").map(email => email.trim()).filter(email => email);
            inputField.value = this.mergeArraysWithNoDuplicates(rawEmails, missingEmails).join(",");
        }, 300);
    };

    /**
     * Finds the table row that holds the "to", "cc" or "bcc" field, its input and its recipient chips. Gmail names each
     * recipient field with a name attribute that is the same in every display language, so that is the anchor. The
     * English aria-labels are kept as a fallback in case Gmail drops the name attribute.
     *
     * @param formElement
     * @param context
     */
    findRecipientRow = (formElement: HTMLElement, context: string) => {
        let field = formElement.querySelector<HTMLElement>(`div[name="${context}"]`);
        if (!field) {
            field = this.findEnglishRecipientLabel(formElement, context);
            if (field) {
                log.warnOnce(`Found the ${context} field only by its English label. Gmail may have changed its compose window, and other languages won't work.`);
            }
        }
        return field?.closest("tr") ?? null;
    };

    findEnglishRecipientLabel = (formElement: HTMLElement, context: string) => {
        return [...formElement.querySelectorAll("span")].find((spanElement: HTMLSpanElement) => {
            return spanElement.ariaLabel && spanElement.ariaLabel.toLowerCase().startsWith(`${context} -`);
        }) ?? null;
    };

    findRecipientInput = (formElement: HTMLElement, context: string) => {
        let row = this.findRecipientRow(formElement, context);
        return row?.querySelector<HTMLInputElement>("input[role=combobox]") ?? row?.querySelector("input") ?? null;
    };
}

new GmailAutoBccHandler();