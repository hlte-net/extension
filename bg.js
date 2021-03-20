'use strict';

let annotateHandle, searchHandle, reloadHandle, searchWinHandle;

const annotateListener = async (info) => {
  const { pageUrl, srcUrl } = info;
  const msgObj = { action: 'annotateMedia', pageUrl, srcUrl };

  theRealBrowser.tabs.query({ active: true }, async (t) => {
    theRealBrowser.tabs.sendMessage(t.find(x => x.active).id, msgObj);
  });
};

const bgScriptMain = () => {
  console.log('hlte.net bg script loaded', annotateHandle, searchHandle, reloadHandle, searchWinHandle);
  searchHandle = theRealBrowser.contextMenus.create({
    title: 'Search...',
    contexts: ['browser_action'],
    visible: true,
    id: 'ba_search',
    onclick: async () => {
      const createObj = {
        url: 'search.html',
        height: 640,
        width: 864,
        type: 'popup'
      };

      if (IAMFF) {
        createObj.titlePreface = 'hlte.net search';
      }

      searchWinHandle = await theRealBrowser.windows.create(createObj);
      console.log('created window', searchWinHandle);
    }
  }, () => console.log(theRealBrowser.runtime.lastError));

  reloadHandle = theRealBrowser.contextMenus.create({
    title: 'Reload',
    contexts: ['browser_action'],
    visible: true,
    id: 'ba_ctx',
    onclick: () => theRealBrowser.runtime.reload()
  }, () => console.log(theRealBrowser.runtime.lastError));

  annotateHandle = theRealBrowser.contextMenus.create({
    title: 'Annotate media',
    contexts: ['image', 'video'],
    visible: true,
    id: 'ctx_menu',
    onclick: annotateListener
  },
  () => {
    if (theRealBrowser.runtime.lastError) {
      console.error('ctx created?', theRealBrowser.runtime.lastError);
    }
  });
};

bgScriptMain();