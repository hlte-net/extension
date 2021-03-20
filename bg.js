'use strict';

let annotateHandle, searchHandle, reloadHandle;

const annotateListener = async (info) => {
  const { pageUrl, srcUrl } = info;
  const msgObj = { action: 'annotateMedia', pageUrl, srcUrl };

  theRealBrowser.tabs.query({ active: true }, async (t) => {
    theRealBrowser.tabs.sendMessage(t.find(x => x.active).id, msgObj);
  });
};

theRealBrowser.runtime.onInstalled.addListener(() => {
  searchHandle = theRealBrowser.contextMenus.create({
    title: 'Search...',
    contexts: ['browser_action'],
    visible: true,
    id: 'ba_search',
    onclick: () => {
      theRealBrowser.windows.create({
        url: 'search.html',
        height: 640,
        width: 864
      });
    }
  }, () => console.log(theRealBrowser.runtime.lastError));

  reloadHandle = theRealBrowser.contextMenus.create({
    title: 'Reload',
    contexts: ['browser_action'],
    visible: true,
    id: 'ba_ctx',
    onclick: () => theRealBrowser.runtime.reload()
  }, () => console.log(theRealBrowser.runtime.lastError));
  
  annotateId = theRealBrowser.contextMenus.create({
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
});