'use strict';

const InputCheckboxes = [];

let statusIconTimeoutHandle;
function setStatusIcon(toIcon, timeoutToNormal = undefined) {
  const imgEle = document.getElementById('logo_img');
  const ogSrc = imgEle.src;

  imgEle.style.filter = 'grayscale(0)';
  imgEle.src = `${assetHost}/${toIcon}`;
  
  clearTimeout(statusIconTimeoutHandle);

  if (!statusIconTimeoutHandle && timeoutToNormal) {
    statusIconTimeoutHandle = setTimeout(() => {
      statusIconTimeoutHandle = undefined;
      imgEle.src = ogSrc;
    }, timeoutToNormal);
  }
}

async function saveOptions() {
  const settings = InputCheckboxes.reduce((a, settingId) => {
    return { [settingId]: document.getElementById(settingId).checked, ...a };
  }, {});

  const imgEle = document.getElementById('logo_img');
  imgEle.style.filter = 'grayscale(1.0)';

  const curOptions = await hlteOptions();
  curOptions.formats = settings;
  curOptions.backends = backends;
  await hlteOptions(curOptions);

  setStatusIcon(assets.icons.ok, 2500);
}

const unlockAll = () => {
  InputCheckboxes.forEach((ic) => document.getElementById(ic).disabled = false);
  document.getElementById('save').disabled = false;
};

async function restoreOptions() {
  const allOpts = await hlteOptions();

  if (allOpts.formats) {
    Object.keys(allOpts.formats).forEach((settingId) => {
      const ele = document.getElementById(settingId);
      if (ele) {
        ele.checked = allOpts.formats[settingId];
      }
    });
  }
}

async function contentLoaded() {
  if (!(await discoverBackends())) {
    document.getElementById('form_container').style.display = 'none';
    document.getElementById('error_container').style.display = 'block';
    document.getElementById('logo_img').src = `${assetHost}/${assets.icons.error}`;
  } else {
    if (Object.keys(backends).some(x => x.indexOf('localhost') !== -1)) {
      const formatCont = document.getElementById('local_formats');
      const formatTmpl = document.getElementById('local_format_tmpl');
      const formats = await localFormats();

      if (formats.length === 0) {
        return;
      }

      document.getElementById('local_container').style.display = 'block';

      while (formatCont.firstChild) {
        formatCont.removeChild(formatCont.firstChild);
      }

      formats.forEach((format) => {
        const newNode = formatTmpl.cloneNode(true);
        newNode.removeAttribute('id');

        const checkbox = findChildByDataId('cbox', newNode);
        const label = findChildByDataId('label', newNode);

        checkbox.id = `inf_${format}`;
        label.appendChild(document.createTextNode(format));
        InputCheckboxes.push(checkbox.id);

        newNode.style.display = '';
        formatCont.appendChild(newNode);
      });

      unlockAll();
    }

    const beList = document.getElementById('backend_list');
    beList.innerHTML = Object.keys(backends).reduce((accStr, beKey) => {
      const [reach, spec] = backends[beKey];
      const lockStr = spec[1] ? ` <img src="icons/${assets.icons.lock}" class="keyicon"/> ` : '';
      const keyStr = reach && backends[beKey][1].length > 2 ? 
          ` <img src="icons/${assets.icons.key}" class="keyicon"/> ` : '';

      return accStr += `<li>${!reach ? '<strike>' : ''}` +
        `${spec[0]}${!reach ? '</strike>' : ''}${lockStr}${keyStr}</li>`
    }, '');

    restoreOptions();
  }
}

const addOurClickListener = async (elementId, listener, defPrevent = true) => {
  document.getElementById(elementId).addEventListener('click', async (ev) => {
    if (defPrevent) {
      ev.preventDefault();
    }

    await listener(ev);
  });
};

addOurClickListener('save', async () => { await saveOptions(); });

addOurClickListener('reset', async () => {
  Object.keys(backends).forEach(k => delete backends[k]);
  await hlteOptions(null);
  await contentLoaded();
}, false);

addOurClickListener('add_be', async () => {
  document.getElementById('add_be_container').style.display = 'inline';
});

const eles = [
  document.getElementById('add_be_hostname'),
  document.getElementById('add_be_https'),
  document.getElementById('add_be_passphrase')
];

const hideAddBeDialog = () => {
  eles[0].value = eles[2].value = '';
  eles[1].checked = false;
  eles.forEach(e => e.disabled = false);
  document.getElementById('add_be_container').style.display = 'none';
};

addOurClickListener('add_be_submit', async (ev) => {
  eles.forEach(e => e.disabled = true);
  const addRes = await addBackend([eles[0].value, eles[1].checked, eles[2].value], true);
  
  if (!addRes) {
    setStatusIcon(assets.icons.error, 7500);
  } else {
    await saveOptions();
    contentLoaded();
  }

  hideAddBeDialog();
});

addOurClickListener('add_be_cancel', async (ev) => hideAddBeDialog());

document.addEventListener('DOMContentLoaded', contentLoaded);