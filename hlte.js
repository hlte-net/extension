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

      const imgEle = document.getElementById(`${contId}_img`);
      const imgReset = () => imgEle.style.filter = 'grayscale(0)';

      const timeoutDispHandle = setTimeout(() => {
        imgEle.src = `${assetHost}/${assets.icons.error}`;
        document.onselectstart = undefined;
        imgReset();
      }, 5000);

      hlButtonA.removeAttribute('href');
      hlButtonA.onclick = null;

      imgEle.style.filter = 'grayscale(1.0)';

      const success = await postToBackends(lastSelected);

      imgReset();
      clearTimeout(timeoutDispHandle);
      let tempIcon = assets.icons[(success ? 'ok' : 'error')];
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
