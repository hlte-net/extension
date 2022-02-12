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
  queryLastSelected: async (_) => ({ response: lastSelected }),
  annotateMedia: async (msg) => {
    let { pageUrl, srcUrl, buttonCaptureHilite } = msg;

    if (!srcUrl) {
      srcUrl = pageUrl;
      pageUrl = undefined;
    }

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

    const but = document.createElement('button');
    but.textContent = 'Save annotation';
    but.addEventListener('click', async () => {
      const resp = await postToBackends(buttonCaptureHilite, ta.value, srcUrl, pageUrl);

      if (!resp) {
        logger.error(`image annotation failed with payload ${ta.value},${srcUrl},${pageUrl}`);
        alert('Annotation failed, please try again.');
      }

      rmImgAnCont();
    });

    const cncl = document.createElement('button');
    cncl.textContent = 'Cancel';
    cncl.addEventListener('click', rmImgAnCont);

    imgAnCont.appendChild(document.createTextNode(`Annotation:`));
    imgAnCont.appendChild(document.createElement('br'));
    imgAnCont.appendChild(ta);
    imgAnCont.appendChild(document.createElement('br'));

    if (buttonCaptureHilite || (lastSelected && lastSelected.length)) {
      if (!buttonCaptureHilite) {
        buttonCaptureHilite = lastSelected;
      }

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
  theRealBrowser.runtime.onMessage.addListener(async (msg, _, sendResponse) => {
    const { action } = msg;

    if (action && action in msgHandlers) {
      let handlerResp = await msgHandlers[action](msg);

      if (handlerResp) {
        // firefox & chrome behave differently here:
        // firefox expects the response returned by the listener, whereas chrome
        // (contrary to some of its documentation) expects the response be transported
        // by the third argument (`sendResponse`) and `true` be returned by the listener
        // to indicate the message channel must remain open after this listener returns.
        if (IAMFF) {
          return handlerResp;
        }
        else {
          sendResponse(handlerResp);
          return true; // tells the browser to retain/keep-open the channel
        }
      }
    } else {
      console.error(`unhandled msg type '${action}'`);
    }
  });

  document.onmousemove = (ev) => {
    mouseLoc.x = ev.pageX;
    mouseLoc.y = ev.pageY;
  };
  
  discoverBackends((failStr) => addControls(failStr));
})();
