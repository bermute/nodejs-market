(function () {
  const modal = document.getElementById("aiModal");
  const imageInput = document.getElementById("image");
  const descriptionField = document.getElementById("description");
  const titleField = document.getElementById("title");
  const priceField = document.getElementById("price");
  const locationField = document.getElementById("location");
  const generateBtn = modal?.querySelector('[data-action="generate"]');
  const closeBtn = modal?.querySelector('[data-action="close"]');

  if (!imageInput || !modal) return;

  const overlay = document.getElementById("loadingOverlay");

  const showLoading = () => overlay?.classList.add("show");
  const hideLoading = () => overlay?.classList.remove("show");

  const closeModal = () => modal.classList.remove("open");

  imageInput.addEventListener("change", () => {
    if (imageInput.files?.length) {
      modal.classList.add("open");
    }
  });

  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });

  generateBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!imageInput.files?.length) {
      alert("이미지를 먼저 선택해주세요.");
      return;
    }

    const file = imageInput.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      const dataUrl = reader.result; 
      const base64 = String(dataUrl).split(",")[1];

      const payload = {
        title: titleField.value || "",
        price: priceField.value || 0,
        location: locationField.value || "",
        extraDescription: descriptionField.value || "",
        imageBase64: base64,
        imageMime: file.type || "image/jpeg"
      };

      try {
        showLoading();
        const res = await fetch("/api/ai/generate-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (result.success) {
          titleField.value = result.data.title;
          descriptionField.value = result.data.body;
          window.App?.showBanner("AI가 판매글 초안을 채워 넣었어요!");
          closeModal();
        } else {
          window.App?.showBanner("AI 응답을 받지 못했습니다.");
        }
      } catch (err) {
        console.error(err);
        window.App?.showBanner("AI 요청 중 오류가 발생했습니다.");
      } finally {
        hideLoading();
      }
    };

    reader.readAsDataURL(file);
  });
})();
