function openOptions() {
  chrome.tabs.create({ url: "views/options.html" });
}

function executeScript(script) {
  if (Tescrex.current) Tescrex.current = null;
  return script.execute();
}

const logWrapper = document.getElementById('log-wrapper');

function addLog(log) {
  const el = document.createElement('div');
  const content = document.createElement('span');
  content.innerText = log.content;
  el.appendChild(content);
  logWrapper.appendChild(el);
}

Tescrex.init().then(() => {
  Tescrex.attachFunction('#optionsButton', 'click', openOptions);
  Tescrex.onLogs(addLog);
  Tescrex.populate('Execute', executeScript);
})