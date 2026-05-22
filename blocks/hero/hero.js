export default function decorate(block) {
  block
    .querySelectorAll('picture, picture > img')
    .forEach((el) => el.removeAttribute('style'));
}
