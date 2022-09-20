const SELECTOR_PRIMARY_COMPOSER_FORM = 'form.bAs';
const SELECTOR_FOR_TO_CC_AND_BCC_FIELDS = '.wO.nr';
const SELECTOR_FOR_BCC_SPAN = '.aB.gQ.pB';
const SELECTOR_FOR_CC_SPAN = '.aB.gQ.pE';

class GmailThing {

    constructor() {
        this.ccEmails = '';
        this.bccEmails = '';
        this.knownForms = [];
        this.observer = null;
    }

    setBccEmails = (emailAsString) => {
        this.bccEmails = emailAsString;
    }

    setCcEmails = (emailsAsString) => {
        this.ccEmails = emailsAsString;
    }

    attachMutationObserver = () => {

        this.observer = new MutationObserver(this.examineInsertedElements)
        this.observer.observe(document.body,{
            childList: true,
            attributes: false,
            subtree: true
        })
    }

    examineInsertedElements = (elementsInserted) => {
        let firedAlready = false;
        elementsInserted.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if(!node || typeof node.querySelector !== 'function') {
                    return;
                }
                if(node.querySelector(SELECTOR_PRIMARY_COMPOSER_FORM)) {
                    firedAlready = true;
                    this.connectToNewForms();
                }
            })
        })
    }

    connectToNewForms = () => {
        const allForms = document.querySelectorAll(SELECTOR_PRIMARY_COMPOSER_FORM);
        allForms.forEach(formElement => {
            if(this.knownForms.includes(formElement.id)) {
                return;
            }
            this.knownForms.push(formElement.id);
            this.queueAutofill(formElement);
        })
    }

    queueAutofill = (formElement) => {
        return new Promise((resolve, reject) => {
            // TODO: figure out how to validate if it was able to find the fields?
            // TODO: KEEP RUNNING THIS UNTIL WE SEE IT WORKED?
            setTimeout(() => {
                this.autofillForm(formElement);
                this.refocusForm(formElement);
                resolve(true);
            }, 500);
        })
    }

    autofillForm = (formElement) => {
        formElement.querySelector(SELECTOR_FOR_CC_SPAN)?.click();
        formElement.querySelector(SELECTOR_FOR_BCC_SPAN)?.click();

        this.autofillField(formElement, this.bccEmails, 'bcc');
        this.autofillField(formElement, this.ccEmails, 'cc');


    }

    autofillField = (formElement, emailList, context) => {
        formElement.querySelectorAll('span').forEach(spanElement => {
            if(spanElement.ariaLabel && spanElement.ariaLabel.toLowerCase().startsWith(`${context} -`)) {
                let properEmailInputField = spanElement.parentElement.parentElement.querySelector('input');
                let existingEmails = properEmailInputField.value;
                if (!existingEmails.includes(emailList)) {
                    properEmailInputField.value = emailList + existingEmails + ',';
                }
            }
        })
    }

    refocusForm = (formElement) => {
        formElement.querySelectorAll('div.afx').forEach(divElement => {
            if(divElement.ariaLabel && divElement.ariaLabel.toLowerCase().startsWith(`search field`)) {
                let properEmailInputField = divElement.parentElement.parentElement.querySelector('input');
                properEmailInputField.focus();
                // let properToField = spanElement.parentElement.parentElement.querySelector('input');
            }
        })
    }
}

let gt = new GmailThing();
gt.setBccEmails('jay.lindsley@myoutdesk.com');
gt.setCcEmails('TanceLompson@myoutdesk.com');
gt.attachMutationObserver();