void function () {
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
    static GOTO(params) {
      return new Promise(res => {
        chrome.tabs.executeScript({
          code: `window.location.href = ${JSON.stringify(params)}`
        });
        res()
      });
    }

    static EVAL(params) {
      return new Promise(res => {
        chrome.tabs.executeScript({
          code: params
        });
        res();
      })
    }

    static CLICK(params) {
      return new Promise(res => {
        chrome.tabs.executeScript({
          code: `const el = document.querySelector(${JSON.stringify(params)});\nel.click()`
        });
        res();
      })
    }

    static SLEEP(params) {
      return new Promise(res => {
        setTimeout(res, Number(params));
      })
    }

    static LOG(params) {
      return new Promise(res => {
        console.log(params);
        if (Tescrex.onLogsFunc) Tescrex.onLogsFunc({
          content: params
        });
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

      this.parse();
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
          this.lines.push(line.trim());
        }
        append = line.endsWith('\\');
      }
      return this.lines;
    }

    serialize() {
      return {
        name: this.name,
        content: this.content,
        id: this.id
      };
    }

    executeStep() {
      if (this.id !== this.client.current.id) return new Promise(res => res());
      const line = this.lines[this.client.current.index];
      // console.log('Executing "%s" - %d | %o', line, this.client.current.index, this.lines);
      if (!line) {
        this.client.current = null;

        return this.client.saveCurrent();
      }
      const parts = line.split(' ');
      const term = parts[0].toUpperCase();
      const params = parts.slice(1).join(' ').trim();

      this.client.current.index++;

      if (!ScriptBehaviour[term]) {
        return this.client.saveCurrent()
          .then(res => ScriptBehaviour.LOG(`No matching behaviour found '${term}', skipping`))
          .then(res => this.executeStep());
      }

      return this.client.saveCurrent()
        .then(res => ScriptBehaviour[term](params))
        .then(res => {
          // don't continue if false is explicitly returned
          if (res !== false) return this.executeStep();
        });
    }

    execute() {
      this.parse();
      if (!this.client.current) {
        this.client.current = { id: this.id, index: 0 };
      }
      return this.executeStep();
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