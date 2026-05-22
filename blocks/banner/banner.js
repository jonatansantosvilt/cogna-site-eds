function openYouTubeModal(url) {
  let videoId = '';

  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.slice(1);
    }
  } catch (e) {
    // Ignora se a URL for inválida
  }

  if (!videoId) return;

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  const dialog = document.createElement('dialog');
  dialog.className = 'youtube-modal';

  dialog.innerHTML = `
    <div class="modal-content">
      <button class="close-modal" aria-label="Fechar modal">✖</button>
      <div class="iframe-wrapper">
        <iframe src="${embedUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    </div>
  `;

  document.body.append(dialog);

  const closeBtn = dialog.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close();
      dialog.remove();
    }
  });

  dialog.showModal();
}

export default function decorate(block) {
  const rows = [...block.children];

  let picture = null;
  let contentDiv = null;
  let url = '';
  let action = '';

  rows.forEach((row, index) => {
    const cols = row.children;
    const isTwoCol = cols.length >= 2;

    const valueCol = isTwoCol ? cols[1] : cols[0];
    const label = isTwoCol ? cols[0].textContent.trim().toLowerCase() : '';

    const isMatch = (keys) => keys.some((k) => label.includes(k));

    if (isMatch(['imag', 'image']) || (!isTwoCol && index === 0)) {
      picture = valueCol.querySelector('picture') || valueCol.querySelector('img');
      if (!picture && valueCol.querySelector('a')) {
        const img = document.createElement('img');
        img.src = valueCol.querySelector('a').href;
        picture = img;
      }
    } else if (isMatch(['cont', 'content']) || (!isTwoCol && index === 1)) {
      contentDiv = valueCol;
    } else if (isMatch(['link', 'url']) || (!isTwoCol && index === 2)) {
      url = valueCol.textContent.trim();
      if (!url && valueCol.querySelector('a')) {
        url = valueCol.querySelector('a').href;
      }
    } else if (isMatch(['text', 'action', 'bot']) || (!isTwoCol && index === 3)) {
      action = valueCol.textContent.trim();
    }
  });

  block.innerHTML = '';

  const bgWrapper = document.createElement('div');
  bgWrapper.className = 'banner-bg';
  if (picture) bgWrapper.append(picture);

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'banner-content';

  if (contentDiv) {
    contentWrapper.append(...contentDiv.childNodes);
  }

  if (url && action) {
    const btnContainer = document.createElement('p');
    btnContainer.className = 'button-container';

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.title = action;
    anchor.textContent = action;
    anchor.className = 'button primary';

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        openYouTubeModal(url);
      });
    }

    btnContainer.append(anchor);
    contentWrapper.append(btnContainer);
  }

  block.append(bgWrapper, contentWrapper);
}
