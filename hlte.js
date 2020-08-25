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
      const digest = await hexDigest('SHA-256', payloadStr);

      console.log(`${digest} -> ${payloadStr}`);
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

      for (const beEnt of Object.entries(backends)) {
        const [beHostStub, beSpec] = beEnt;

        // skip registered backends that weren't found
        // TODO: add option to always re-discover backends if any are `false` (not found) here
        if (!beSpec[0]) {
          continue;
        }

        try {
          const opts = {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({
              checksum: digest,
              payload: payload,
              formats: curFormats
            })
          };

          if (beSpec[1].length > 2) {
            opts.headers = { 'x-hlte-pp': beSpec[1][2] };
          }

          const res = await fetch(`${beHostStub}/`, opts);

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
})();
