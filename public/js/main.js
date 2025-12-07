(function () {
  const userSelect = document.getElementById("userSelect");
  if (userSelect) {
    userSelect.addEventListener("change", (event) => {
      const url = new URL(window.location.href);
      url.searchParams.set("user", event.target.value);
      window.location.href = url.toString();
    });
  }

  const banner = document.getElementById("notification-banner");

  function showBanner(message, duration = 4000) {
    if (!banner) return;
    banner.textContent = message;
    banner.classList.remove("hidden");
    setTimeout(() => banner.classList.add("hidden"), duration);
  }

  window.App = window.App || {};
  window.App.showBanner = showBanner;
})();

