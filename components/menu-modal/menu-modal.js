const MenuModal = (() => {
  let element;

  async function init() {
    element = await replaceElement("menu-modal");
  }

  function open() {
    element.querySelector(`[data-item-id="login"]`).classList.toggle("hidden", currentAuthUser)
    element.querySelector(`[data-item-id="logout"]`).classList.toggle("hidden", !currentAuthUser)
    element.classList.toggle("hidden", false);
  }

  function close() {
    element.classList.toggle("hidden", true);
  }

  return { init, open, close };
})();
