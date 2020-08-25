'use strict';

let theRealBrowser;
try {
  theRealBrowser = browser; // firefox
} catch {
  if (chrome) {
    theRealBrowser = chrome; // and opera
  } else {
    throw 'htle: cannot determine browser type';
  }
}

const MIN_VER = 20200824;
const BE_SPEC = [['localhost:56555', false]];

const assetHost = 'https://static.hlte.net';
const assets = {
  icons: {
    main: 'icons8-crayon-64-blueedit.png',
    error: 'icons8-crayon-64-blueedit-errored.png',
    ok: 'icons8-crayon-64-blueedit-ok.png',
    key: 'icons8-password-1-24.png',
    lock: 'icons8-lock-24.png'
  }
};

const backends = {};

const hexDigest = async (algo, payloadStr) => {
  const digest = await crypto.subtle.digest(algo,
    new TextEncoder().encode(payloadStr));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0')).join('');
};

const stubFromSpec = (spec) => {
  const [hostStub, secure] = spec;
  return `http${secure ? 's' : ''}://${hostStub}`;
};

// if `passphrase` is set, will validate auth with it as well
const checkVersion = async (hostStub, secure = false, passphrase) => {
  try {
    const opts = { mode: 'cors' };

    if (passphrase) {
      opts.headers = { 'x-hlte-pp': passphrase };
    }

    const res = await fetch(`${stubFromSpec([hostStub, secure])}/version`, opts);

    if (res.ok) {
      const txt = await res.text();
      const numTxt = Number.parseInt(txt);

      if (Number.isNaN(numTxt) || numTxt < MIN_VER) {
        throw `version mismatch for ${hostStub}: '${txt}', expected '${MIN_VER}'`;
      }

      return true;
    }
  } catch (err) {
    console.log('checkVersion request failed: ', err);
  }

  return false;
};

const addBackend = async (spec, failIfCannotConnect = false) => {
  const hStub = stubFromSpec(spec);

  if (hStub in backends) {
    return;
  }

  const verOk = await checkVersion(...spec);

  if (!verOk && failIfCannotConnect) {
    return false;
  }

  return (backends[hStub] = [verOk, spec]);
}

const discoverBackends = async (onFailure) => {
  const opts = await hlteOptions();
  let beSpec = BE_SPEC;

  if (opts.backends) {
    beSpec = Object.values(opts.backends).map(x => x[1]);
  }

  for (const spec of beSpec) {
    await addBackend(spec);
  }

  if (Object.keys(backends).length === 0) {
    document.onselectstart = undefined;
    if (onFailure) {
      onFailure('No available backends found!');
    }

    return false;
  }

  return true;
};

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

const localFormats = async () => {
  try {
    const res = await fetch('http://localhost:56555/formats');

    if (res.ok) {
      return res.json();
    }

    throw `HTTP status ${res.status}`;
  } catch (err) {
    console.log(`formats req failed: ${err}`);
    return [];
  }
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
    console.log(`warning: multiple elements for data-id="${dataId}" found for ${curEle}`);
  }

  return rList[0];
};
