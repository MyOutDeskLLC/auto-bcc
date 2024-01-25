chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage(() => console.log('options page opened'))
})
