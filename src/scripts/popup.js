function openOptions() {
  chrome.tabs.create({ url: "views/options.html" });
}

function executeScript(script) {
  chrome.runtime.sendMessage({ action: 'execute', id: script.id, to: ['background'] });
}

const logWrapper = document.getElementById('log-wrapper');

function addLog(log) {
  console.log(log);
  const el = document.createElement('div');
  el.className = 'log';
  const script = document.createElement('span');
  script.className = 'script';
  script.innerText = log.script ? `[${log.script.name}]` : `[INTERNAL]`;
  const content = document.createElement('span');
  content.className = 'content';
  if (Array.isArray(log.message)) log.message = log.message.join(' ');
  content.innerText = log.message;
  el.appendChild(script);
  el.appendChild(content);
  logWrapper.appendChild(el);
}

chrome.runtime.sendMessage({ action: 'sync', to: ['background'] }, response => {
  console.log(response);
  for (const log of response.logs) {
    addLog(log);
  }
});

Tescrex.init().then(() => {
  Tescrex.attachFunction('#optionsButton', 'click', openOptions);
  Tescrex.onLogs(addLog);
  Tescrex.populate('Execute', executeScript);
})

class Actions {
  static log(request, sender) {
    const context = request.context;
    addLog(context);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('received event', request);
  if (request.to && !request.to.includes('popup')) return;
  if (Actions.hasOwnProperty(request.action)) {
    Actions[request.action](request, sender, sendResponse);
  }
});