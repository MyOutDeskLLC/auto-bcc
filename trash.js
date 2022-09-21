// this.focusToField(formElement);
// this.locateRecipientContainer(formElement);
// this.focusToField(formElement);
// console.log(formElement.querySelector(SELECTOR_FOR_CC_SPAN));
// this.observeCcField(formElement.querySelector(SELECTOR_FOR_CC_SPAN));
// this.observeCcField(formElement.querySelector(SELECTOR_FOR_CC_SPAN));
// formElement.querySelector(SELECTOR_FOR_CC_SPAN)?.click();
// formElement.querySelector(SELECTOR_FOR_BCC_SPAN)?.click();
//
// this.autofillField(formElement, this.bccEmails, 'bcc');
// this.autofillField(formElement, this.ccEmails, 'cc');
//
// this.locateRecipientContainer(formElement);
// this.focusToField(formElement);
//
// formElement.children[1].click();


locateRecipientContainer = (formElement) => {
    let keepGoing = true;
    formElement.querySelectorAll('div').forEach(divAvailable => {
        if(!keepGoing) {
            return;
        }
        if(divAvailable.innerText === 'Recipients') {
            divAvailable.click();
            keepGoing = false;
        }
    })
}

focusToField = (formElement) => {
    formElement.querySelectorAll('div.afx').forEach(divElement => {
        if(divElement.ariaLabel && divElement.ariaLabel.toLowerCase().startsWith(`search field`)) {
            let properEmailInputField = divElement.querySelector('input');
            properEmailInputField.focus();
            // let properToField = spanElement.parentElement.parentElement.querySelector('input');
        }
    })
}


observeEmailInputField = (element) => {
    let primaryInputField = this.locateRecipientField(element);
    console.log(primaryInputField)
    primaryInputField.addEventListener('change', (e) => {
        console.log(e.target.value);
    })
}


locateRecipientField = (element) => {
    let foundElement = null;
    element.querySelectorAll('div.afx').forEach(divElement => {
        if(divElement.ariaLabel && divElement.ariaLabel.toLowerCase().startsWith(`search field`)) {
            foundElement =  divElement.querySelector('input');
        }
    })
    return foundElement
}


observeCcField = (element) => {
    const bccConfiguration = {
        attributes: true,
        childList: false,
        subtree: false
    }

    const fieldReadyCallback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.attributeName === 'style') {
                console.log(`The ${mutation.attributeName} attribute was modified.`);
                element.click();
                observer.disconnect();
            }
        }
    }

    const observer = new MutationObserver(fieldReadyCallback);

    observer.observe(element, bccConfiguration);
}
