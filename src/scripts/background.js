chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostEquals: '.' },
        })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//   if (request.from == 'content_script' && request.message == 'inject') {
//     console.log('The request has been received from the content script.');
//     chrome.tabs.executeScript({ file: 'scripts/utils.js' });
//   }
// });