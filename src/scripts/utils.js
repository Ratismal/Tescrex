void function () {

  function emptyPromise() {
    return new Promise(res => res());
  }
  class Storage {
    get(keys) {
      return new Promise(res => {
        chrome.storage.sync.get(keys, res);
      });
    }

    getOne(key) {
      return new Promise(res => {
        chrome.storage.sync.get(key, res);
      }).then(val => val[key]);
    }

    set(values) {
      return new Promise(res => {
        chrome.storage.sync.set(values, res);
      });
    }

    createDefaults(values) {
      return this.get(Object.keys(values))
        .then(vals => {
          const toSet = {};
          for (const key in values) {
            if (!vals[key])
              toSet[key] = values[key];
          }
          return this.set(toSet);
        });
    }
  }

  class ScriptBehaviour {
    static GOTO(script, params) {
      return new Promise(res => {
        chrome.tabs.update(script.tabId, { url: params });
        res()
      });
    }

    static EVAL(script, params) {
      return new Promise(res => {
        console.log(params);
        script.evalScript(params);
        res();
      })
    }

    static CLICK(script, params) {
      return new Promise(res => {
        script.evalScript(`const el = document.querySelector(${JSON.stringify(params)});\nel.click()`);
        res();
      })
    }

    static SLEEP(script, params) {
      return new Promise(res => {
        setTimeout(res, Number(params));
      })
    }

    static LOG(script, params) {
      return new Promise(res => {
        const log = {
          message: params,
          script: script.serialize(),
          timestamp: Date.now()
        };
        Tescrex.log(log);
        res();
      })
    }
  }

  class Script {
    constructor(obj = {}, client) {
      this.client = client;

      this.id = obj.id || Date.now();
      this.name = obj.name || 'New Script';
      this.content = obj.content || '';
      this.lines = [];

      this.index = 0;
      this.stopped = true;

      this.tabId;

      this.parse();
    }

    evalScript(code) {
      chrome.tabs.executeScript(this.tabId, {
        code
      });
    }

    parse() {
      this.lines = [];
      const content = this.content.replace(/\r/g, '');
      const lines = content.split('\n').filter(line => {
        return !/^(\/\/|#)/.test(line)
      });
      let append = false;
      for (const line of lines) {

        if (append) {
          this.lines[this.lines.length - 1] += '\n' + line.replace(/\\$/, '').trim();
        } else {
          this.lines.push(line.replace(/\\$/, '').trim());
        }
        append = line.endsWith('\\');
      }
      return this.lines;
    }

    serialize() {
      return {
        name: this.name,
        content: this.content,
      };
    }

    stop() {
      this.stopped = true;
      return emptyPromise();
    }

    executeStep() {
      if (this.stopped) return emptyPromise();
      const line = this.lines[this.index];
      // console.log('Executing "%s" - %d | %o', line, this.client.current.index, this.lines);
      if (!line) {
        return this.stop();
      }
      const parts = line.split(' ');
      const term = parts[0].toUpperCase();
      const params = parts.slice(1).join(' ').trim();

      this.index++;

      if (!ScriptBehaviour[term]) {
        return emptyPromise()
          .then(res => ScriptBehaviour.LOG(`No matching behaviour found '${term}', skipping`))
          .then(res => this.executeStep());
      }

      return emptyPromise()
        .then(res => ScriptBehaviour[term](this, params))
        .then(res => {
          // don't continue if false is explicitly returned
          if (res !== false) return this.executeStep();
          else return this.stop();
        });
    }

    execute(id) {
      this.tabId = id;
      this.parse();
      this.index = 0;
      this.client.scriptManager.scripts.filter(s => s.id !== this.id).forEach(s => s.stopped = true);
      if (this.stopped) {
        this.stopped = false;
        return this.executeStep();
      }
    }

    render(label, cb) {
      const el = document.createElement('div');
      el.className = 'tsx-script';

      const btn = document.createElement('button');
      btn.className = 'button';
      btn.innerText = label;
      btn.addEventListener('click', () => cb(this));
      el.appendChild(btn);

      const lab = document.createElement('span');
      lab.className = 'script label';
      lab.innerText = this.name;
      el.appendChild(lab);

      return el;
    }
  }

  class ScriptManager {
    constructor(client) {
      this.client = client;

      this.scripts = [];
    }

    reload() {
      this.scripts = [];
      return this.client.storage.getOne('scripts')
        .then(scripts => {
          console.log(scripts);
          for (const script of scripts) {
            this.scripts.push(new Script(script, this.client));
          }
        });
    }

    save() {
      const scripts = this.scripts.map(s => s.serialize());
      return this.client.storage.set({ scripts });
    }

    create() {
      const script = new Script({}, this.client);
      this.scripts.push(script);
      return script;
    }

    delete(script) {
      const index = this.scripts.indexOf(script);
      console.log('Deleting', index, 'of', this.scripts);
      if (index > -1) {
        this.scripts.splice(index, 1);
      }
    }

    getScript(id) {
      return this.scripts.find(s => s.id === id);
    }
  }

  class TescrexClient {
    constructor() {
      this.storage = new Storage(this);
      this.scriptManager = new ScriptManager(this);

      this.current = null;

      this.logs = [];

      this.onLogsFunc;
    }

    init() {
      return this.storage.createDefaults({
        scripts: [{ name: "Go To Google", content: "GOTO https://google.com", id: 1 }],
        current: null
      }).then(res => this.scriptManager.reload())
        .then(res => this.storage.getOne('current'))
        .then(res => this.current = res)
        .then(res => {
          if (this.current) {
            let script = this.scriptManager.getScript(this.current.id);
            script.execute();
          }
        });
    }

    log(context) {
      if (Array.isArray(context.message))
        console.log(...context.message);
      else console.log(context.message);

      this.logs.push(context);

      if (this.onLogsFunc) this.onLogsFunc(context);
    }

    onLogs(func) {
      this.onLogsFunc = func;
    }

    saveCurrent() {
      // console.log('Saving current');
      return this.storage.set({ current: this.current });
    }

    attachFunction(selector, event, callback) {
      const el = document.querySelector(selector);

      el.addEventListener(event, callback);
    }

    populate(label, cb) {
      const el = document.querySelector('#script-wrapper');
      while (el.firstChild) el.removeChild(el.firstChild);
      for (const script of this.scriptManager.scripts) {
        el.appendChild(script.render(label, cb));
      }
    }
  }

  window.Tescrex = new TescrexClient();
}();