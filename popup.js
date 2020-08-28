'use strict';

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
    console.log('tabs ', t);
    if (t.length) {
      if (!(await postToBackends(null, val, t[0].url))) {
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

document.addEventListener('DOMContentLoaded', async () => {
  await discoverBackends();
  abled(isABackendReachable());
});