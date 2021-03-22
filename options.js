'use strict';

const InputCheckboxes = [];

let statusIconTimeoutHandle;
function setStatusIcon(toIcon, opts) {
  const imgEle = document.getElementById('logo_img');
  const ogSrc = imgEle.src;
  const { timeout, title } = opts;

  imgEle.style.display = 'inline';
  imgEle.style.filter = 'grayscale(0)';
  imgEle.src = `${assetHost}/${toIcon}`;
  
  if (title) {
    imgEle.title = title;
  }
  
  clearTimeout(statusIconTimeoutHandle);

  if (!statusIconTimeoutHandle && timeout) {
    statusIconTimeoutHandle = setTimeout(() => {
      statusIconTimeoutHandle = undefined;
      imgEle.style.display = 'none';
      imgEle.src = ogSrc;
      imgEle.title = '';
    }, timeout);
  }
}

async function saveOptions() {
  const settings = InputCheckboxes.reduce((a, settingId) => {
    return { [settingId]: document.getElementById(settingId).checked, ...a };
  }, {});

  const curOptions = await hlteOptions();
  curOptions.formats = settings;
  curOptions.backends = backends;
  await hlteOptions(curOptions);

  setStatusIcon(assets.icons.ok, { timeout: 2500 });
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

  if (allOpts.buttonAction) {
    document.getElementById(`bbb_toggle_${allOpts.buttonAction}`).checked = true;
  }
}

async function contentLoaded(_) {
  document.getElementById('be_title').textContent = 'Verifying backends...';
  const foundBes = await discoverBackends();
  
  if (Object.keys(backends).length > 0 && !foundBes) {
    document.getElementById('form_container').style.display = 'none';
    document.getElementById('error_container').style.display = 'block';
    setStatusIcon(assets.icons.error, { title: 'No backends found' });
  } else {
    document.getElementById('be_title').textContent = 'Registered backends:';

    const formatCont = document.getElementById('local_formats');
    const formatTmpl = document.getElementById('local_format_tmpl');
    const formats = await availableFormats();

    if (formats.length > 0) {
      while (formatCont.firstChild) {
        formatCont.removeChild(formatCont.firstChild);
      }

      formats.forEach((format) => {
        const newNode = formatTmpl.cloneNode(true);
        newNode.removeAttribute('id');

        const checkbox = findChildByDataId('cbox', newNode);
        const label = findChildByDataId('label', newNode);

        checkbox.id = `inf_${format}`;
        label.appendChild(document.createTextNode(format.toUpperCase()));
        label.appendChild(checkbox);
        InputCheckboxes.push(checkbox.id);

        newNode.style.display = '';
        formatCont.appendChild(newNode);
      });

      unlockAll();
    }

    const beList = document.getElementById('backend_list');

    while (beList.firstChild) {
      beList.removeChild(beList.firstChild);
    }

    const beListEleTmpl = document.getElementById('be_list_ele_tmpl');
    Object.keys(backends).forEach((beKey) => {
      const [reach, spec] = backends[beKey];

      const newNode = beListEleTmpl.cloneNode(true);
      newNode.removeAttribute('id');

      const keyIconEle = findChildByDataId('keyicon', newNode);
      const ppIconEle = findChildByDataId('ppicon', newNode);
      const beNameEle = findChildByDataId('be_name', newNode);

      beNameEle.appendChild(document.createTextNode(spec[0]));

      if (spec[1]) {
        keyIconEle.title = 'Uses HTTPS';
        keyIconEle.src = `icons/${assets.icons.lock}`;
      } else {
        keyIconEle.title = 'Does not use HTTPS';
        keyIconEle.src = `icons/${assets.icons.unlock}`;
      }

      if (!reach) {
        beNameEle.className = 'unreachable';
      }

      if (reach && backends[beKey][1].length > 2) {
        ppIconEle.title = 'Uses a passphrase';
        ppIconEle.src = `icons/${assets.icons.key}`;
      } else {
        ppIconEle.title = 'Does not use a passphrase';
        ppIconEle.src = `icons/${assets.icons.nokey}`;
      }

      const delButton = findChildByDataId('delbutton', newNode);
      const delButImg = findChildByDataId('delicon', delButton);

      delButImg.src = `icons/${assets.icons.delete}`;
      delButImg.title = `Delete ${spec[0]}`;

      delButton.addEventListener('click', () => {
        const conf = document.getElementById('be_del_confim_tmpl').cloneNode(true);
        conf.removeAttribute('id');

        findChildByDataId('be_name', conf).textContent = spec[0];
        const clearConf = () => document.body.removeChild(conf);

        findChildByDataId('y', conf).addEventListener('click', async () => {
          delete backends[beKey];
          await saveOptions();
          await contentLoaded();
          setStatusIcon(assets.icons.ok, { timeout: 1500 });
          clearConf();
        });

        findChildByDataId('n', conf).addEventListener('click', clearConf);

        conf.style.display = 'block';
        document.body.appendChild(conf);
      });

      beList.appendChild(newNode);
    });

    const bbbToggleOnChange = (ev) => {
      console.log('bbbToggle', ev.target.value);
      createButtonContextMenuFor(ev.target.value);
    };

    document.querySelectorAll('input[type=radio][name="bbb_toggle_group"]').forEach((bbbToggle) => {
      bbbToggle.addEventListener('change', bbbToggleOnChange);
    });

    restoreOptions();
  }

  const errorUp = () => {
    const errBox = document.getElementById('err_box');

    while (errBox.firstChild) {
      errBox.removeChild(errBox.firstChild);
    }

    logger.errors().forEach((err) => {
      errBox.appendChild(document.createTextNode(
        `(${(new Date(err[1])).toLocaleString()}) ${err[0]}`));
      errBox.appendChild(document.createElement('br'));
    });

    addOurClickListener('show_err', () => {
      showErr.style.display = 'none';
      hideErr.style.display = 'block';

      errBox.style.display = 'block';
    });

    const showErr = document.getElementById('show_err');
    const hideErr = document.getElementById('hide_err');

    addOurClickListener('hide_err', () => {
      showErr.style.display = 'block';
      hideErr.style.display = 'none';
      errBox.style.display = 'none';
    });

    showErr.style.display = 'block';
  };

  logger.onError(errorUp);
  if (logger.errors()) {
    errorUp();
  }
}

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

  const ppVal = eles[2].value.trim();
  const addBeArgs = [eles[0].value, eles[1].checked];

  if (ppVal.length > 0) {
    addBeArgs.push((await hexDigest('SHA-512', ppVal)));
  }

  const addRes = await addBackend(addBeArgs, true);

  hideAddBeDialog();
  
  if (!addRes) {
    logger.error(`failed to add backend '${eles[0].value}'`);
    setStatusIcon(assets.icons.error, { timeout: 7500 });
  } else {
    await saveOptions();
    await contentLoaded();
  }
});

addOurClickListener('add_be_cancel', async (ev) => hideAddBeDialog());

document.addEventListener('DOMContentLoaded', sharedOnDOMContentLoaded.bind(null, contentLoaded));