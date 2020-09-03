'use strict';

theRealBrowser.runtime.onInstalled.addListener(() => {
  theRealBrowser.contextMenus.create({
    title: 'Annotate media',
    contexts: ['image', 'video'],
    visible: true,
    id: 'ctx_menu',
    onclick: async (info) => {
      const { pageUrl, srcUrl } = info;
      const msgObj = { action: 'annotateMedia', pageUrl, srcUrl };

      theRealBrowser.tabs.query({ active: true }, async (t) => {
        theRealBrowser.tabs.sendMessage(t.find(x => x.active).id, msgObj);
      });
    }
  },
  () => {
    if (theRealBrowser.runtime.lastError) {
      console.error('ctx created?', theRealBrowser.runtime.lastError);
    }
  });
});
