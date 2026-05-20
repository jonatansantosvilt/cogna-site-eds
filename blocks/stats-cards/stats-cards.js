import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);

    while (row.firstElementChild) li.append(row.firstElementChild);

    const imgDiv = li.children[0];
    const numberDiv = li.children[1];
    const suffixDiv = li.children[2];
    const descDiv = li.children[3];

    if (imgDiv) {
      imgDiv.className = 'stats-card-image';
      const img = imgDiv.querySelector('img');
      if (img) {
        const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
        moveInstrumentation(img, optimizedPic.querySelector('img'));
        img.closest('picture').replaceWith(optimizedPic);
      }
    }

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'stats-card-body';

    const titleWrapper = document.createElement('div');
    titleWrapper.className = 'stats-card-title-wrapper';

    if (numberDiv) {
      numberDiv.className = 'stats-card-number';
      titleWrapper.append(numberDiv);
    }

    const suffixText = suffixDiv ? suffixDiv.textContent.replace(/\s/g, '') : '';
    const isShortSuffix = suffixText.length > 0 && suffixText.length <= 3;

    if (isShortSuffix) {
      titleWrapper.classList.add('is-inline-wrapper');
    }

    if (suffixDiv) {
      suffixDiv.className = 'stats-card-suffix';
      if (isShortSuffix) {
        suffixDiv.classList.add('is-short');
      }
      titleWrapper.append(suffixDiv);
    }

    bodyDiv.append(titleWrapper);

    if (descDiv) {
      descDiv.className = 'stats-card-desc';
      if (isShortSuffix) {
        descDiv.classList.add('is-highlight');
      }
      bodyDiv.append(descDiv);
    }

    const finalChildren = [];
    if (imgDiv) finalChildren.push(imgDiv);
    finalChildren.push(bodyDiv);

    li.replaceChildren(...finalChildren);
    ul.append(li);
  });

  block.replaceChildren(ul);
}
