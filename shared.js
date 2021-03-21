'use strict';

const BE_PIN_VER = config.backend.pinVer;
const PP_HDR = config.backend.ppHeader;
let IAMFF = false; // only set if browser is Firefox

let theRealBrowser;
try {
  theRealBrowser = browser; // firefox
  IAMFF = true;
} catch {
  if (chrome) {
    theRealBrowser = chrome; // and opera
  } else {
    throw 'htle: cannot determine browser type';
  }
}

if (!crypto.subtle) {
  crypto.subtle = { digest: async () => new Promise((res) => res("")) };
}

const assetHost = config.assets.host;
const assets = config.assets;
const backends = {};

const hexDigest = async (algo, payloadStr) => {
  const digest = await crypto.subtle.digest(algo, new TextEncoder().encode(payloadStr));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0')).join('');
};

const stubFromSpec = (spec) => {
  const [hostStub, secure] = spec;
  return `http${secure ? 's' : ''}://${hostStub}`;
};

const hlteFetch = async (endpoint, spec, payload = undefined, query = undefined) => {
  const opts = { 
    mode: 'cors',
    cache: 'no-store',
    headers: {
      'Access-Control-Request-Headers': PP_HDR
    }
  };

  if (spec.length > 2 && spec[2].length > 0) {
    opts.headers[PP_HDR] = spec[2];
  }

  let uri = `${stubFromSpec(spec)}${endpoint}`;
  let params = new URLSearchParams();

  if (query) {
    params = new URLSearchParams(query);
  }

  if (payload) {
    opts.method = 'POST';
    opts.body = JSON.stringify(payload);
    opts.headers['Content-Type'] = 'application/json';

    const digest = await hexDigest('SHA-256', opts.body);
    const curOpts = await hlteOptions();

    if (!curOpts.formats) {
      alert('Cannot save hilite as you\'ve not yet enabled any output format options.');
      return;
    }
    
    const curFormats = Object.keys(curOpts.formats).reduce((a, x) => {
      if (x.indexOf('inf_') === 0 && curOpts.formats[x] === true) {
        a.push(x.replace('inf_', ''));
      }
      return a;
    }, []);

    params.append('formats', curFormats);

    if (digest.length == 64) {
      params.append('checksum', digest);
    }
  }


  if (params.toString().length) {
    uri += `?${params.toString()}`;
  }
  
  return fetch(uri, opts);
};

// if `passphrase` is set, will validate auth with it as well
const checkVersion = async (spec) => {
  try {
    const res = await hlteFetch('/version', spec);

    if (res.ok) {
      const txt = await res.text();
      const numTxt = Number.parseInt(txt);

      if (Number.isNaN(numTxt) || numTxt != BE_PIN_VER) {
        throw `version mismatch for ${spec[0]}: '${txt}', expected '${BE_PIN_VER}'`;
      }

      return true;
    }
  } catch (err) {
    logger.error(`${spec[0]}/version failed: ${err}`);
  }

  return false;
};

const addBackend = async (spec, failIfCannotConnect = false) => {
  const hStub = stubFromSpec(spec);

  if (hStub in backends) {
    return true;
  }

  const verOk = await checkVersion(spec);

  if (!verOk && failIfCannotConnect) {
    return false;
  }

  return (backends[hStub] = [verOk, spec]);
}

const discoverBackends = async (onFailure) => {
  const opts = await hlteOptions();
  let beSpec = [];

  if (opts.backends) {
    beSpec = Object.values(opts.backends).map(x => x[1]);
  }

  let allAdded = true;
  for (const spec of beSpec) {
    allAdded = (await addBackend(spec)) && allAdded;
  }

  if (Object.keys(backends).length === 0) {
    document.onselectstart = undefined;
    if (onFailure) {
      onFailure('No available backends found!');
    }

    return false;
  }

  return backends;
};

const isABackendReachable = () => Object.entries(backends).some(x => x[1][0]);

const hlteOptions = async (toSet = undefined) => {
  return new Promise((resolve) => {
    if (toSet === null) {
      theRealBrowser.storage.sync.clear();
      return;
    }
    
    if (toSet === undefined) {
      theRealBrowser.storage.sync.get(null, (allSettings) => resolve(allSettings));
    } else {
      theRealBrowser.storage.sync.set(toSet, () => resolve());
    }
  });
};

const availableFormats = async () => {
  const formatsSet = new Set();

  for (const be of Object.values(backends)) {
    const [reachable, spec] = be;

    if (!reachable) {
      continue;
    }

    try {
      const res = await hlteFetch('/formats', spec);

      if (res.ok) {
        (await res.json()).forEach(fmt => formatsSet.add(fmt));
      } else {
        throw `${stubFromSpec(spec)}/formats: HTTP status ${res.status}`;
      }
    } catch (err) {
      logger.error(`formats req failed: ${err}`);
    }
  }

  return [...formatsSet];
};

  // find an element in `curEle`'s children by 'data-id' attribute matching `dataId`
const findChildByDataId = (dataId, curEle) => {
  let rList = [];

  if ('id' in curEle.dataset && curEle.dataset.id === dataId) {
    rList.push(curEle);
  }

  if (curEle.childElementCount > 0) {
    rList.push(...[...curEle.children].flatMap((child) => findChildByDataId(dataId, child))
      .reduce((a, x) => { if (x) { a.push(x); } return a; }, []));
  }

  if (rList.length > 1) {
    logger.error(`warning: multiple elements for data-id="${dataId}" found for ${curEle}`);
  }

  return rList[0];
};

const logger = new class {
  constructor() {
    this._onErr = undefined;
    this._logs = {};
    this._lvls = {
      log: console.log,
      error: console.error
    };

    // creates logger.X where 'X' is each key in _lvls
    Object.keys(this._lvls).forEach((lvl) => this[lvl] = this._log.bind(this, lvl));
  }

  _log(lvl, msg) {
    if (!this._lvls[lvl]) {
      throw `bad log level '${lvl}'`;
    }

    if (!this._logs[lvl]) {
      this._logs[lvl] = [];
    }

    this._logs[lvl].push([msg, Date.now()]);
    this._lvls[lvl](msg);

    if (lvl === 'error' && this._onErr) {
      this._onErr(msg);
    }
  }

  onError(cb) {
    this._onErr = cb;
  }

  errors() {
    return this._logs.error;
  }
}();

const addOurClickListener = async (elementId, listener, defPrevent = true) => {
  document.getElementById(elementId).addEventListener('click', async (ev) => {
    if (defPrevent) {
      ev.preventDefault();
    }

    await listener(ev);
  });
};

function buildPayload(hiliteText, annotation, from, secondaryUrl) {
  let loc = from || window.location;

  const payload = {
    data: hiliteText,
    uri: loc.toString()
  };

  payload.annotation = annotation && annotation.length ? annotation : '';
  payload.secondaryURI = secondaryUrl && secondaryUrl.length ? secondaryUrl : '';

  return payload;
}

async function postToBackends(hiliteText, annotation, from, secondaryUrl) {
  return postPayloadToBackends((await buildPayload(hiliteText, annotation, from, secondaryUrl)));
}

async function postPayloadToBackends(payload) {
  let successes = 0;
  for (const beEnt of Object.entries(backends)) {
    const [beHostStub, beSpec] = beEnt;

    // skip registered backends that weren't found
    // TODO: add option to always re-discover backends if any are `false` (not found) here
    if (!beSpec[0]) {
      continue;
    }

    try {
      const res = await hlteFetch('/', beSpec[1], payload);

      if (res.ok) {
        ++successes;
      }
    } catch (err) {
      logger.error(`fetch to ${beHostStub} failed: ${err}`);
    }
  }

  return successes > 0;
}

async function toggleTheme(setSpecific = undefined) {
  let styleLink = document.getElementById('style_link');

  if (!styleLink) {
    console.error('style link');
    return;
  }
  
  let styleURL = new URL(styleLink.href);
  let toSet = styleURL.pathname === config.styles.light ? config.styles.dark : config.styles.light;

  if (setSpecific && (Object.keys(config.styles).indexOf(setSpecific) !== -1)) {
    toSet = config.styles[setSpecific];
  }

  styleLink.href = `${styleURL.origin}${toSet}`;
  let opts = await hlteOptions();
  opts.theme = toSet;
  hlteOptions(opts);
}

async function sharedOnDOMContentLoaded(onLoaded) {
  let verBox = document.getElementById('ver_box');
  if (verBox) {
    verBox.textContent = `${theRealBrowser.runtime.getManifest().version} / ${BE_PIN_VER}`;
  }

  let ttBut = document.getElementById('theme_toggle_button');
  if (ttBut) {
    ttBut.addEventListener('click', toggleTheme);
  }

  let opts = await hlteOptions();

  if (opts.theme) {
    await toggleTheme(opts.theme);
  }

  try {
    let foundBackends = await discoverBackends(console.error);
    onLoaded(foundBackends);
  } catch (err) {
    console.log('sharedOnDOMContentLoaded', err);
  }
}