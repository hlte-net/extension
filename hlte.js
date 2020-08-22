'use strict';

const contId = 'hlteContainer';

let iconHoldHandle;
const addControls = (isError = null) => {
  if (document.getElementById(contId)) {
    return;
  }
  
  const cont = document.createElement('div');
  cont.id = contId;
  cont.style.position = 'fixed';
  cont.style.left = '10px';
  cont.style.top = '5px';
  cont.style.zIndex = '999999';

  const hlButtonA = document.createElement('a');
  if (!isError) {
    hlButtonA.href = '#';
    hlButtonA.onclick = async (ev) => {
      ev.preventDefault();

      const payload = {
        data: lastSelected,
        uri: window.location.toString().replace('#', '')
      };
      const payloadStr = JSON.stringify(payload);

      const digest = await crypto.subtle.digest('SHA-256',
        new TextEncoder().encode(payloadStr));
      const hexDigest = Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0')).join(''); // [1]

      console.log(`${hexDigest} -> ${payloadStr}`);
      const imgEle = document.getElementById(`${contId}_img`);
      const imgReset = () => imgEle.style.filter = 'grayscale(0)';

      const timeoutDispHandle = setTimeout(() => {
        imgEle.src = `${assetHost}/${assets.icons.error}`;
        document.onselectstart = undefined;
        imgReset();
      }, 5000);

      hlButtonA.removeAttribute('href');
      hlButtonA.onclick = null;

      let successes = 0;
      imgEle.style.filter = 'grayscale(1.0)';
      const curOpts = await hlteOptions();
      const curFormats = Object.keys(curOpts.formats).reduce((a, x) => {
        if (x.indexOf('inf_') === 0 && curOpts.formats[x] === true) {
          a.push(x.replace('inf_', ''));
        }
        return a;
      }, []);

      for (const beHostStub of Object.keys(backends)) {
        try {
          const res = await fetch(`${beHostStub}/`, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({
              checksum: hexDigest,
              payload: payload,
              formats: curFormats
            })
          });

          if (res.ok) {
            ++successes;
          }
        } catch (err) {
          console.log(`fetch to ${beHostStub} failed: ${err}`);
        }
      }

      imgReset();
      clearTimeout(timeoutDispHandle);
      let tempIcon = assets.icons[(successes === Object.keys(backends).length ? 'ok' : 'error')];
      imgEle.src = `${assetHost}/${tempIcon}`;
      iconHoldHandle = setTimeout(() => {
        clearTimeout(iconHoldHandle);
        iconHoldHandle = undefined;
        hideControls();
      }, 750);
    };
  }

  const hlButtonImg = document.createElement('img');
  hlButtonImg.id = `${contId}_img`;
  hlButtonImg.src = `${assetHost}/${isError ? assets.icons.error : assets.icons.main}`;
  hlButtonImg.width = hlButtonImg.height = 48;

  if (isError && typeof isError === 'string' && isError.length) {
    hlButtonImg.alt = isError;
  }

  hlButtonA.appendChild(hlButtonImg);
  cont.appendChild(hlButtonA);

  document.body.appendChild(cont);
};

const hideControls = () => {
  const e = document.getElementById(contId);
  if (e) document.body.removeChild(e);
};

let lastSelected;
document.onselectstart = () => {
  let endHandle;

  document.onselectionchange = () => {
    clearTimeout(endHandle);
    endHandle = setTimeout(() => {
      let cs = window.getSelection().toString();

      if (cs.length === 0) {
        lastSelected = undefined;

        if (!iconHoldHandle) {
          hideControls();
        }
      }
      else if (cs != lastSelected) {
        lastSelected = cs;
        addControls();
      }
    }, 250);
  };
};

(async () => {
  await discoverBackends((failStr) => addControls(failStr));
  console.log(backends);
})();



// [1] https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#