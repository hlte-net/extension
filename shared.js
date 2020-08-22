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

const MIN_VER = '20200816';
const BE_SPEC = [['localhost:56555', false], ['api.hlte.net', true]];

const assetHost = 'https://static.hlte.net';
const assets = {
  icons: {
    main: 'icons8-crayon-64-blueedit.png',
    error: 'icons8-crayon-64-blueedit-errored.png',
    ok: 'icons8-crayon-64-blueedit-ok.png'
  }
};

const backends = {};

const checkVersion = async (hostStub, secure = false) => {
  try {
    const res = await fetch(`http${secure ? 's' : ''}://${hostStub}/version`, { mode: 'cors' });
    return res.ok && (await res.text()) >= MIN_VER;
  } catch {
    return false;
  }
};

const discoverBackends = async (onFailure) => {
  for (const spec of BE_SPEC) {
    const verOk = await checkVersion(...spec);
    if (verOk === true) {
      const [hostStub, secure] = spec;
      backends[`http${secure ? 's' : ''}://${hostStub}`] = true;
    }
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
