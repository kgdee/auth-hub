const HomePage = (() => {
  async function init() {
    await loadResources(RESOURCES.home);

    for (const component of [Navbar, MenuModal]) {
      await component.init();
    }
  }

  function updateUI() {
    document.title = currentAuthUser ? `Welcome Back, ${getUserName()}. | Kgdee Auth Hub` : "Kgdee Auth Hub";

    document.querySelector(".hero-section > .title").innerHTML = getRandomItem(HEADLINES);

    document.body.style.backgroundImage = `var(--color-bg-overlay), url("/assets/images/wallpapers/${randomInt(0, 2)}.jpg")`;
  }

  return { init, updateUI };
})();

globalThis.currentPage = HomePage;
