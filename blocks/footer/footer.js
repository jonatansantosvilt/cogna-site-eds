import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // Limpa o bloco padrão
  block.textContent = '';

  const footer = document.createElement('div');
  footer.className = 'footer-container';

  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // Captura as duas secções que o autor criou
  const sections = footer.querySelectorAll('.section');

  // =========================================
  // 1. FOOTER TOP (Logo, Links, Social)
  // =========================================
  if (sections[0]) {
    sections[0].classList.add('footer-top');

    // O Universal Editor embrulha o conteúdo na classe .default-content-wrapper
    // Vamos pegar os filhos diretos (A imagem, a lista de links e a lista social)
    const elements = sections[0].querySelectorAll('.default-content-wrapper > *');

    if (elements[0]) elements[0].classList.add('footer-brand');
    if (elements[1]) elements[1].classList.add('footer-nav');
    if (elements[2]) elements[2].classList.add('footer-social');
  }

  // =========================================
  // 2. FOOTER BOTTOM (Copyright, Links Institucionais)
  // =========================================
  if (sections[1]) {
    sections[1].classList.add('footer-bottom');

    const elements = sections[1].querySelectorAll('.default-content-wrapper > *');

    if (elements[0]) elements[0].classList.add('footer-copyright');
    if (elements[1]) elements[1].classList.add('footer-legal');
  }

  block.append(footer);
}
