'use strict';

let annotateHandle, searchHandle, reloadHandle, searchWinHandle;

const annotateListener = async (info) => {
  const { pageUrl, srcUrl } = info;
  const msgObj = { action: 'annotateMedia', pageUrl, srcUrl };

  theRealBrowser.tabs.query({ active: true }, async (t) => {
    theRealBrowser.tabs.sendMessage(t.find(x => x.active).id, msgObj);
  });
};

const bgScriptMain = async () => {
  const curOpts = await hlteOptions();
  let curCtxMenu = curOpts.buttonContextMenu || config.defaultButtonContextMenu;
  console.log('loading bg, curCtxMenu', curCtxMenu, curOpts);
  createButtonContextMenuFor(curCtxMenu);

  annotateHandle = theRealBrowser.contextMenus.create({
    title: 'Annotate media',
    contexts: ['image', 'video'],
    visible: true,
    id: 'ctx_menu',
    onclick: annotateListener
  }, logIfError.bind(null, 'annotate'));
};

bgScriptMain();