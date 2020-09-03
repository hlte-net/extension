'use strict';

const contId = 'hlteContainer';
const mouseLoc = { x: -1, y: -1 };

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
  cont.style.zIndex = '2147483647';

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

const msgHandlers = {
  annotateMedia: async (msg) => {
    const { pageUrl, srcUrl } = msg;
    const imgAnCont = document.createElement('div');
    const rmImgAnCont = () => document.body.removeChild(imgAnCont);
    imgAnCont.id = 'media_annotate_popup';

    imgAnCont.style.fontSize = '0.8em';
    imgAnCont.style.display = 'block';
    imgAnCont.style.position = 'absolute';
    imgAnCont.style.top = `${mouseLoc.y + 10}px`;
    imgAnCont.style.left = `${mouseLoc.x + 10}px`;
    imgAnCont.style.zIndex = '2147483647';
    imgAnCont.style.border = '1px solid black';
    imgAnCont.style.borderRadius = '3px';
    imgAnCont.style.width = '300px';
    imgAnCont.style.heigh = '200px';
    imgAnCont.style.background = 'rgba(211, 233, 243, 0.95)';
    imgAnCont.style.padding = '11px';
    imgAnCont.style.margin = '3px';
    
    const ta = document.createElement('textarea');
    ta.style.margin = '0.5em 0 0.5em 0';
    ta.style.width = '95%';
    ta.rows = 4;

    const imgTxt = document.createElement('span');
    imgTxt.style.fontStyle = 'italic';
    imgTxt.style.fontSize = '0.6em';
    imgTxt.appendChild(document.createTextNode(srcUrl.split('/').reverse()[0]));

    let buttonCaptureHilite;
    const but = document.createElement('button');
    but.innerText = 'Save annotation';
    but.addEventListener('click', async () => {
      const resp = await postToBackends(buttonCaptureHilite, ta.value, srcUrl, pageUrl);

      if (!resp) {
        logger.error(`image annotation failed with payload ${ta.value},${srcUrl},${pageUrl}`);
        alert('Annotation failed, please try again.');
      }

      rmImgAnCont();
    });

    const curOpts = await hlteOptions();
    if (!curOpts.formats) {
      but.innerText = 'Set format(s) in options to enable!';
      but.disabled = true;
    }

    const cncl = document.createElement('button');
    cncl.innerText = 'Cancel';
    cncl.addEventListener('click', rmImgAnCont);

    imgAnCont.appendChild(document.createTextNode(`Annotation:`));
    imgAnCont.appendChild(document.createElement('br'));
    imgAnCont.appendChild(ta);
    imgAnCont.appendChild(document.createElement('br'));

    if (lastSelected && lastSelected.length) {
      buttonCaptureHilite = lastSelected;
      imgAnCont.appendChild(document.createTextNode(`Including hilite:`));
      const bq = document.createElement('blockquote');
      bq.style.margin = '0.5em 1.5em 0px';
      bq.style.fontFamily = 'monospace';
      bq.style.fontSize = '1.1em';
      bq.style.border = '2px solid #83d0f2';
      bq.style.borderWidth = '2px 0';
      bq.appendChild(document.createTextNode(`"${buttonCaptureHilite}"`));
      imgAnCont.appendChild(bq);
      imgAnCont.appendChild(document.createElement('br'));
    }

    imgAnCont.appendChild(imgTxt);
    imgAnCont.appendChild(document.createElement('br'));
    imgAnCont.appendChild(but);
    imgAnCont.appendChild(document.createTextNode(' '));
    imgAnCont.appendChild(cncl);
    document.body.appendChild(imgAnCont);
  }
};

(async () => {
  theRealBrowser.runtime.onMessage.addListener(async (msg) => {
    const { action } = msg;

    if (action && action in msgHandlers) {
      await msgHandlers[action](msg);
    } else {
      console.error(`unhandled msg type '${action}'`);
    }
  });

  document.onmousemove = (ev) => {
    mouseLoc.x = ev.pageX;
    mouseLoc.y = ev.pageY;
  };
  
  await discoverBackends((failStr) => addControls(failStr));
})();
