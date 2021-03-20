'use strict';

let annotateHandle, searchHandle, reloadHandle, searchWinHandle;

const annotateListener = async (info) => {
  const { pageUrl, srcUrl } = info;
  const msgObj = { action: 'annotateMedia', pageUrl, srcUrl };

  theRealBrowser.tabs.query({ active: true }, async (t) => {
    theRealBrowser.tabs.sendMessage(t.find(x => x.active).id, msgObj);
  });
};

const logIfError = (msg) => {
  if (theRealBrowser.runtime.lastError) {
    console.error(`Error "${msg}": `, theRealBrowser.runtime.lastError);
  }
}

const bgScriptMain = () => {
  searchHandle = theRealBrowser.contextMenus.create({
    title: 'Search...',
    contexts: ['browser_action'],
    visible: true,
    id: 'ba_search',
    onclick: async () => {
      const createObj = Object.assign({}, config.search.templateObj);

      if (IAMFF) {
        createObj.titlePreface = config.search.titlePreface;
      }

      searchWinHandle = await theRealBrowser.windows.create(createObj);
      console.log('created window', searchWinHandle);
    }
  }, logIfError.bind(null, 'search'));

  reloadHandle = theRealBrowser.contextMenus.create({
    title: 'Reload',
    contexts: ['browser_action'],
    visible: true,
    id: 'ba_ctx',
    onclick: () => theRealBrowser.runtime.reload()
  }, logIfError.bind(null, 'reload'));

  annotateHandle = theRealBrowser.contextMenus.create({
    title: 'Annotate media',
    contexts: ['image', 'video'],
    visible: true,
    id: 'ctx_menu',
    onclick: annotateListener
  }, logIfError.bind(null, 'annotate'));
};

bgScriptMain();