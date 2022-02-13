'use strict';

const BE_PIN_VER = config.backend.pinVer;
const PP_HDR = config.backend.header;
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
  throw new Error('no SubtleCrypto!!');
}

const keyCache = {};

const keyFromSpec = async (spec) => {
  if (spec.length > 2 && spec[2].length > 0) {
    const specStub = stubFromSpec(spec);

    if (keyCache[specStub]) {
      return keyCache[specStub];
    }

    const octetLen = spec[2].length / 2;

    if (spec[2].length % 2) {
      throw new Error('odd key length!');
    }

    // try to parse as an bigint, if it fails then it's not a number
    BigInt(`0x${spec[2]}`);

    const keyBuf = [...spec[2].matchAll(/[a-fA-F0-9]{2}/ig)]
      .reduce((ab, x, i) => {
        ab[i] = Number.parseInt(x, 16);
        return ab;
    }, new Uint8Array(octetLen));

    return (keyCache[specStub] = await crypto.subtle.importKey(
      'raw',
      keyBuf,
      {
        name: 'HMAC',
        hash: config.backend.hmacAlgo
      },
      false,
      ['sign']
    ));
  }

  return null;
}

const assetHost = config.assets.host;
const assets = config.assets;
const backends = {};

const generateHmac = async (spec, payloadStr) => {
  const digest = await crypto.subtle.sign('HMAC', await keyFromSpec(spec), new TextEncoder().encode(payloadStr));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0')).join('');
};

const stubFromSpec = (spec) => {
  const [hostStub, secure] = spec;
  return `http${secure ? 's' : ''}://${hostStub}`;
};

const protectQueryStringEps = ['/search'];
const protectEndpointQses = [
  (ep) => protectQueryStringEps.includes(ep),
  (ep) => ep.match(/\/\d+\/[0-9a-f]+\/\d+/)
];

const hlteFetch = async (endpoint, spec, payload = undefined, query = undefined, headIfRootGet = true) => {
  const protectedEp = payload || protectEndpointQses.some((epCheckFunc) => epCheckFunc(endpoint));
  let opts = { headers: {} };
  let uri = `${stubFromSpec(spec)}${endpoint}`;
  let params = new URLSearchParams();

  if (query) {
    // the timestamp we add here is not consumed by the backend: rather, it's used
    // simply to add entropy to the query string when it is HMACed
    if (protectedEp) {
      query['ts'] = Number(new Date());
    }

    params = new URLSearchParams(query);

    if (params.toString().length) {
      uri += `?${params.toString()}`;
    }
  }

  if (payload) {
    opts = { 
      mode: 'cors',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Request-Headers': PP_HDR
      },
      method: 'POST',
      body: JSON.stringify(payload),
    };
  }

  if (protectedEp) {
    if (!(spec.length > 2 && spec[2].length > 0)) {
      throw new Error('bad spec in fetch!');
    }

    let protected = opts.body;

    if (!payload) {
      if (protectQueryStringEps.includes(endpoint)) {
        protected = params.toString();
      }
      else {
        protected = new URL(uri).pathname;

        if (headIfRootGet) {
          opts.method = 'HEAD';
        }
      }
    }

    opts.headers[PP_HDR] = await generateHmac(spec, protected);
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

  if (setSpecific && (Object.values(config.styles).indexOf(setSpecific) !== -1)) {
    toSet = setSpecific;
  }

  styleLink.href = `${styleURL.origin}${toSet}`;
  let opts = await hlteOptions();
  opts.theme = toSet;
  await hlteOptions(opts);
}

const logIfError = (msg) => {
  if (theRealBrowser.runtime.lastError) {
    console.error(`Error "${msg}": `, theRealBrowser.runtime.lastError);
  }
}

let ctxMenuActionHandle, ctxWindowHandle;

const ctxMenuCreateTmpls = {
  annotate: {
    title: "Annotate...",
    id: "ann_ctx_menu"
  },
  search: {
    title: "Search...",
    id: "srch_ctx_menu"
  }
};

let reloadHandle;
async function createReloadCtxMenu() {
  if (reloadHandle) {
    await theRealBrowser.contextMenus.remove(reloadHandle);
  }

  reloadHandle = await theRealBrowser.contextMenus.create({
    title: 'Reload',
    contexts: ['browser_action'],
    visible: true,
    id: 'reload_ctx',
    onclick: () => theRealBrowser.runtime.reload()
  }, logIfError.bind(null, 'reload'));
}

let optsHandle;
async function createOptionsCtxMenu() {
  if (optsHandle) {
    await theRealBrowser.contextMenus.remove(optsHandle);
  }

  optsHandle = await theRealBrowser.contextMenus.create({
    title: 'Options...',
    contexts: ['browser_action'],
    visible: true,
    id: 'opts_ctx',
    onclick: () => theRealBrowser.runtime.openOptionsPage()
  }, logIfError.bind(null, 'options'));
}

async function createButtonContextMenuFor(action) {
  let createSpec = ctxMenuCreateTmpls[action];

  if (!createSpec) {
    console.error('bad spec', action);
    return;
  }

  const opsMenu = action === 'search' ? 'annotate' : 'search';

  if (ctxMenuActionHandle) {
    await theRealBrowser.contextMenus.remove(ctxMenuActionHandle);
  } else {
    await theRealBrowser.contextMenus.remove(ctxMenuCreateTmpls[opsMenu].id);
  }

  createSpec = Object.assign(createSpec, {
    contexts: ['browser_action'],
    visible: true,
    onclick: async () => {
      const cfg = config[action];

      if (!cfg) {
        console.error('bad tmpl', action);
        return;
      }

      const createObj = Object.assign({}, cfg.templateObj);

      if (IAMFF) {
        createObj.titlePreface = cfg.titlePreface;
      }

      ctxWindowHandle = await theRealBrowser.windows.create(createObj);
    }
  });

  ctxMenuActionHandle = await theRealBrowser.contextMenus.create(createSpec, 
    logIfError.bind(null, `createContextMenuFor(${action})`));

  await theRealBrowser.browserAction.setPopup({
    popup: theRealBrowser.extension.getURL((action === 'search' ? 'popup' : 'search') + '.html')
  });

  await createOptionsCtxMenu();
  await createReloadCtxMenu();

  const curOpts = await hlteOptions();
  curOpts.buttonAction = opsMenu;
  curOpts.buttonContextMenu = action;
  await hlteOptions(curOpts);
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

  let optsBut = document.getElementById('open_options_button');
  if (optsBut) {
    optsBut.addEventListener('click', () => theRealBrowser.runtime.openOptionsPage());
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