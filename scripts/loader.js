export default async function loadSVG(
  path,
  url = `${window.hlx.codeBasePath}/${path}.svg`,
) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP status ${response.status}`);
    return new DOMParser()
      .parseFromString(await response.text(), 'image/svg+xml')
      .querySelector('svg');
  } catch (error) {
    // console.error(`Error loading SVG ${url}:`, error);
  }
  return null;
}
