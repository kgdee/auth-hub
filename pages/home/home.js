async function initPage() {
  await loadResources(RESOURCES.home);

  for (const component of [Navbar, MenuModal]) {
    await component.init();
  }

  document.body.style.backgroundImage = `var(--color-bg-overlay), url("/assets/images/wallpapers/${randomInt(0, 2)}.jpg")`;
}
