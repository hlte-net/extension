'use strict';

// Import config and shared utilities via importScripts
importScripts('config.js', 'shared.js');

let annotateHandle;

const annotateListener = async (info, tab) => {
  const { pageUrl, srcUrl } = info;
  const msgObj = { action: 'annotateMedia', pageUrl, srcUrl };

  if (info.selectionText) {
    msgObj.buttonCaptureHilite = info.selectionText;
  }

  // In service worker, we can directly send message to the active tab
  chrome.tabs.sendMessage(tab.id, msgObj);
};

// Context menu handler for button actions (annotate/search)
const handleButtonContextMenu = async (info, tab) => {
  const menuId = info.menuItemId;
  let action;
  
  if (menuId === 'annotate_action') {
    action = 'annotate';
  } else if (menuId === 'search_action') {
    action = 'search';
  } else {
    return;
  }
  
  const cfg = config[action];
  if (!cfg) {
    console.error('bad tmpl', action);
    return;
  }

  const createObj = Object.assign({}, cfg.templateObj);
  
  // Create window for the action
  await chrome.windows.create(createObj);
};

// Modified createButtonContextMenuFor for service worker context
const createButtonContextMenuForServiceWorker = async (action) => {
  const ctxMenuCreateTmpls = {
    annotate: {
      title: "Annotate...",
      id: 'annotate_action'
    },
    search: {
      title: "Search...",
      id: 'search_action'
    }
  };

  let createSpec = ctxMenuCreateTmpls[action];

  if (!createSpec) {
    console.error('bad spec', action);
    return;
  }

  const opsMenu = action === 'search' ? 'annotate' : 'search';

  // Remove existing context menus
  try {
    await chrome.contextMenus.removeAll();
  } catch (error) {
    console.log('No existing context menus to remove');
  }

  // Create the button context menu for action context
  createSpec = Object.assign(createSpec, {
    contexts: ['action'],
    visible: true
  });

  await chrome.contextMenus.create(createSpec, logIfError.bind(null, `createContextMenuFor(${action})`));

  // Set the popup for the opposite action
  await chrome.action.setPopup({
    popup: chrome.runtime.getURL((action === 'search' ? 'popup' : 'search') + '.html')
  });

  // Re-create the main context menus
  chrome.contextMenus.create({
    title: 'Hilite media',
    contexts: ['image', 'video'],
    visible: true,
    id: 'ctx_menu'
  }, logIfError.bind(null, 'annotate'));

  chrome.contextMenus.create({
    title: 'Hilite',
    contexts: ['selection'],
    visible: true,
    id: 'hilite_menu'
  }, logIfError.bind(null, 'hilite_menu'));

  // Create reload context menu
  chrome.contextMenus.create({
    title: 'Reload',
    contexts: ['action'],
    visible: true,
    id: 'reload_ctx'
  }, logIfError.bind(null, 'reload'));

  // Create options context menu
  chrome.contextMenus.create({
    title: 'Options...',
    contexts: ['action'],
    visible: true,
    id: 'opts_ctx'
  }, logIfError.bind(null, 'options'));

  // Save options
  const curOpts = await hlteOptions();
  curOpts.buttonAction = opsMenu;
  curOpts.buttonContextMenu = action;
  await hlteOptions(curOpts);
};

const serviceWorkerMain = async () => {
  const curOpts = await hlteOptions();
  let curCtxMenu = curOpts.buttonContextMenu || config.defaultButtonContextMenu;
  console.log('loading service worker, curCtxMenu', curCtxMenu, curOpts);
  
  await createButtonContextMenuForServiceWorker(curCtxMenu);

  // Set up context menu click listeners
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'ctx_menu' || info.menuItemId === 'hilite_menu') {
      annotateListener(info, tab);
    } else if (info.menuItemId === 'annotate_action' || info.menuItemId === 'search_action') {
      handleButtonContextMenu(info, tab);
    } else if (info.menuItemId === 'reload_ctx') {
      chrome.runtime.reload();
    } else if (info.menuItemId === 'opts_ctx') {
      chrome.runtime.openOptionsPage();
    }
  });
};

// Initialize service worker when it starts
serviceWorkerMain();