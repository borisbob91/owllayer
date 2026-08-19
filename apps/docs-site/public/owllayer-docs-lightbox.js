const LIGHTBOX_SELECTOR = '.sl-markdown-content img';

function createLightbox() {
  const dialog = document.createElement('dialog');
  dialog.className = 'owllayer-image-lightbox';
  dialog.innerHTML = `
    <div class="owllayer-image-lightbox__frame">
      <button class="owllayer-image-lightbox__close" type="button" aria-label="Fermer l'image"></button>
      <figure class="owllayer-image-lightbox__figure">
        <img alt="" />
        <figcaption></figcaption>
      </figure>
    </div>
  `;

  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('figcaption');
  const closeButton = dialog.querySelector('button');

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  document.body.append(dialog);

  return {
    open(source) {
      const alt = source.getAttribute('alt') || '';
      image.src = source.currentSrc || source.src;
      image.alt = alt;
      caption.textContent = alt;
      caption.hidden = !alt;
      dialog.showModal();
      closeButton.focus();
    },
  };
}

function enhanceImages() {
  if (!document.querySelector(LIGHTBOX_SELECTOR)) return;

  const lightbox = createLightbox();

  document.querySelectorAll(LIGHTBOX_SELECTOR).forEach((image) => {
    if (image.closest('a')) return;
    if (image.dataset.owllayerLightbox === 'ready') return;

    image.dataset.owllayerLightbox = 'ready';
    image.classList.add('owllayer-image-zoomable');
    image.tabIndex = 0;
    image.setAttribute('role', 'button');

    const open = () => lightbox.open(image);
    image.addEventListener('click', open);
    image.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      open();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceImages, { once: true });
} else {
  enhanceImages();
}
