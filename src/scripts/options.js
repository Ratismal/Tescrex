void function () {
  const scriptName = document.getElementById('script__name');
  const scriptContent = document.getElementById('script__content');

  let script = null;;

  function updateCurrentScript() {
    if (script) {
      scriptName.value = script.name;
      scriptContent.value = script.content;
    } else {
      scriptName.value = '';
      scriptContent.value = '';
    }
  }

  function selectScript(sc) {
    script = sc;
    updateCurrentScript();
  }

  function repopulateScripts() {
    return Tescrex.populate('Select', selectScript);
  }

  function reloadScripts() {
    let id;
    if (script) id = script.id;
    script = null;
    return Tescrex.scriptManager.reload()
      .then(repopulateScripts)
      .then(res => {
        if (id)
          script = Tescrex.scriptManager.getScript(id)
        return updateCurrentScript();
      });
  }

  function saveScripts() {
    if (script) {
      script.name = scriptName.value;
      script.content = scriptContent.value;
    }
    return Tescrex.scriptManager.save()
      .then(repopulateScripts)
      .then(res => {
        return updateCurrentScript();
      })
      .then(res => {
        chrome.runtime.sendMessage({ action: 'reload', to: ['background'] });
      });
  }

  function createScript() {
    script = Tescrex.scriptManager.create();
    updateCurrentScript();
    repopulateScripts();
  }

  function deleteScript() {
    Tescrex.scriptManager.delete(script);
    script = null;

    saveScripts().then(reloadScripts).then(res => {
      return updateCurrentScript();
    });
  }

  Tescrex.init().then(() => {
    // Tescrex.attachFunction('#optionsButton', 'click', openOptions);
    Tescrex.populate('Select', selectScript);

    Tescrex.attachFunction('#button__reload', 'click', reloadScripts);
    Tescrex.attachFunction('#button__save', 'click', saveScripts);
    Tescrex.attachFunction('#button__create', 'click', createScript);
    Tescrex.attachFunction('#button__delete', 'click', deleteScript);
  });
}();