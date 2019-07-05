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


function addLog(context) {
  chrome.runtime.sendMessage({ action: 'log', context, to: ['popup'] });
}

Tescrex.init().then(() => {
  Tescrex.onLogs(addLog);
})

class Actions {
  static reload() {
    Tescrex.scriptManager.reload();
  }

  static execute(request, sender, sendResponse) {
    const script = Tescrex.scriptManager.getScript(request.id);
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      script.execute(tabs[0].id);
    });
  }

  static sync(request, sender, sendResponse) {
    sendResponse({
      logs: Tescrex.logs
    });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('received message', request.action);
  if (request.to && !request.to.includes('background')) return;
  if (Actions.hasOwnProperty(request.action)) {
    return Actions[request.action](request, sender, sendResponse);
  }
});