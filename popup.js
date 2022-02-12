'use strict';

let capturedSelected;

const abled = (en) => {
  const a = document.getElementById('annotation');

  if (!en) {
    a.value = '';
  }

  a.disabled = !en;
  document.getElementById('annotate_button').disabled = !en;
};

addOurClickListener('annotate_button', async () => {
  const val = document.getElementById('annotation').value;

  if (val.length === 0) {
    return;
  }

  abled(false);

  theRealBrowser.tabs.query({ active: true, currentWindow: true }, async (t) => {
    if (t.length) {
      if (!(await postToBackends(capturedSelected, val, t[0].url))) {
        logger.error('annotation failed');
        return;
      }
    } else {
      logger.errors('no tabs found!');
      return;
    }

    window.close();
  });
});

async function popupOnDOMContentLoaded() {
  // if the user has selected text, automatically populate the annotation text area with it quoted
  theRealBrowser.tabs.query({ active: true }, async (t) => {
    const tId = t.find(x => x.active).id;
    
    theRealBrowser.tabs.sendMessage(tId, { action: 'queryLastSelected' }, async (lsResp) => {
      if (!lsResp || theRealBrowser.runtime.lastError) {
        console.error(`queryLastSelected failed: ${JSON.stringify(theRealBrowser.runtime.lastError)}`);
      } else if ('response' in lsResp && lsResp.response) {
        capturedSelected = lsResp.response;

        const bq = document.createElement('blockquote');
        bq.style.width = document.getElementById('annotation').style.width;
        bq.textContent = `"${capturedSelected}"`;

        document.getElementById('anno_sel').appendChild(bq);
        document.getElementById('ann_label').textContent = 'Annotate this page with hilite:';
      }
    });
  });
  
  await discoverBackends();
  const opts = await hlteOptions();
  abled(isABackendReachable());
};

document.addEventListener('DOMContentLoaded', sharedOnDOMContentLoaded.bind(null, popupOnDOMContentLoaded));