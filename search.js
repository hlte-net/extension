const mediaElements = {
  video: (mURI, mRes) => {
    const nv = document.createElement('video');
    nv.src = mURI;
    nv.type = mRes.headers.get('content-type');
    nv.controls = true;
    nv.muted = true;
    return nv;
  },
  image: (mURI) => {
    const img = document.createElement('img');
    img.src = mURI;
    return img;
  }
};

async function keydownHandler (searchIn, e) {
  if (e.code === 'Enter') {
    searchIn.disabled = true;
    document.getElementById('search_res_info').textContent = 'Searching...';
    const srEle = document.getElementById('search_res');

    while (srEle.firstChild) {
      srEle.removeChild(srEle.firstChild);
    }

    for (const beEnt of Object.entries(backends)) {
      const [_, beSpec] = beEnt;
      const startTs = Date.now();
      const res = await hlteFetch('/search', beSpec[1], undefined, {
        q: searchIn.value,
        l: Number.parseInt(document.getElementById('limit_in').value),
        d: document.getElementById('newest_first_in').checked
      });

      if (res.ok) {
        try {
          const rJson = await res.json();

          if (!rJson) {
            document.getElementById('search_res_info').textContent = 'No results found!';
            continue;
          }
          const rowTmpl = document.getElementById('search_res_row_tmpl');
          const foundMedia = Object.keys(mediaElements).reduce((a, k) => ({ [k]: 0, ...a }), {});

          for (const row of rJson) {
            if (row.primaryURI) {
              const pUriRes = await hlteFetch(`/${Date.now()}/${row.checksum}/${row.timestamp}`, beSpec[1]);
              console.log(pUriRes);
            }

            const newRow = rowTmpl.cloneNode(true);
            const nrC = (cid) => findChildByDataId(cid, newRow);
            newRow.removeAttribute('id');

            nrC('srr_ts').textContent = new Date(Number.parseInt(row.timestamp) / 1e6).toLocaleString();
            const pURL = new URL(row.primaryURI);
            const pLink = document.createElement('a');
            pLink.href = row.primaryURI;
            pLink.textContent = pURL.hostname;
            pLink.target = '_blank';
            nrC('srr_uris').appendChild(pLink);

            if (row.secondaryURI && row.secondaryURI.length) {
              const sURL = new URL(row.secondaryURI);
              const sLink = document.createElement('a');
              sLink.href = row.secondaryURI;
              sLink.textContent = `(${sURL.hostname})`;
              sLink.target = '_blank';
              nrC('srr_uris').appendChild(sLink);

              try {
                const mRes = await fetch(row.primaryURI);

                if (mRes && mRes.ok && mRes.headers.has('content-type')) {
                  const ct = mRes.headers.get('content-type').split('/')[0];
                  if (mediaElements[ct]) {
                    newRow.appendChild(mediaElements[ct](row.primaryURI, mRes));
                    ++foundMedia[ct];
                  } else {
                    console.log(`Unhandled media type: ${row.primaryURI} -> ${mRes.headers.get('content-type')}`);
                  }
                } else {
                  logger.error(`failed to fetch media ${row.primaryURI}`);
                  console.dir(mRes);
                }
              } catch (err) {
                logger.error(`failed to fetch media ${row.primaryURI} EXECPTION -> ${err}`);
                console.dir(err);
              }
            }

            nrC('srr_hilite').textContent = row.hilite;

            if (row.annotation && row.annotation.length) {
              nrC('srr_ann').textContent = row.annotation;
            }

            srEle.appendChild(newRow);
          }

          document.getElementById('search_res_info').textContent = `${rJson.length} results ` +
            ` -- ${Object.entries(foundMedia).map(([m, c]) => `${c} ${m}${c > 1 ? 's' : ''}`).join(', ')}` +
            ` -- ${Date.now() - startTs}ms`;
        } catch (err) {
          logger.error(`failed to parse query result: ${err}`);
        }
      }
    }

    searchIn.disabled = false;
  }
}

async function onContentLoaded (_) {
  const searchIn = document.getElementById('search_in');
  searchIn.addEventListener('keydown', keydownHandler.bind(null, searchIn));

  const limitIn = document.getElementById('limit_in');
  limitIn.dataset.lastValue = limitIn.value = config.search.defaultLimit;
  document.getElementById('limit_in').addEventListener('input', (e) => {
    const numVal = Math.max(1, Math.min(config.search.maxLimit, Number.parseInt(e.target.value)));
    limitIn.dataset.lastValue = limitIn.value = Number.isNaN(numVal) ? limitIn.dataset.lastValue : numVal;
    e.preventDefault();
    e.stopPropagation();
    return false;
  });
}

document.addEventListener('DOMContentLoaded', sharedOnDOMContentLoaded.bind(null, onContentLoaded));
