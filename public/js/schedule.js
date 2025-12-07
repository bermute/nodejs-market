(function () {
  const scheduleModal = document.getElementById("scheduleModal");
  const appointmentForm = document.getElementById("appointmentForm");
  const openBtn = document.getElementById("openScheduleModal");
  const appointmentInfo = document.querySelector(".appointment-info");
  const postId = appointmentForm?.dataset.postId || appointmentInfo?.closest(".appointment-panel")?.dataset.postId;
  const currentUserId = window.App?.currentUserId;

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      scheduleModal?.classList.add("open");
    });
  }

  scheduleModal?.addEventListener("click", (event) => {
    if (event.target.dataset.action === "close" || event.target === scheduleModal) {
      scheduleModal.classList.remove("open");
    }
  });

  appointmentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(appointmentForm);
    const payload = {
      buyerId: formData.get("buyerId"),
      date: formData.get("date"),
      time: formData.get("time"),
      place: formData.get("place")
    };

    try {
      const response = await fetch(`/api/posts/${postId}/appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        scheduleModal.classList.remove("open");
        updateAppointmentInfo(result.data);
        window.App?.showBanner("약속이 등록되었어요!");
      } else {
        window.App?.showBanner(result.message || "약속 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error(error);
      window.App?.showBanner("약속 등록 중 오류가 발생했습니다.");
    }
  });

  async function sendCancelRequest() {
    if (!postId || !currentUserId) return;
    try {
      const res = await fetch(`/api/posts/${postId}/appointment/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId })
      });
      const result = await res.json();
      if (result.success) {
        updateAppointmentInfo(result.data);
        window.App?.showBanner("약속 철회를 요청했어요. 상대방 동의를 기다려주세요.");
      } else {
        alert(result.message || "철회 요청에 실패했습니다.");
      }
    } catch (error) {
      console.error(error);
      alert("철회 요청 중 오류가 발생했습니다.");
    }
  }

  async function approveCancellation() {
    if (!postId || !currentUserId) return;
    try {
      const res = await fetch(`/api/posts/${postId}/appointment/cancel-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId })
      });
      const result = await res.json();
      if (result.success) {
        updateAppointmentInfo(null);
        window.App?.showBanner("약속이 철회되었습니다.");
      } else {
        alert(result.message || "철회 동의에 실패했습니다.");
      }
    } catch (error) {
      console.error(error);
      alert("철회 동의 중 오류가 발생했습니다.");
    }
  }

  function bindCancelButtons() {
    document.querySelectorAll("#requestCancelBtn").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        sendCancelRequest();
      });
    });
    document.querySelectorAll("#approveCancelBtn").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        approveCancellation();
      });
    });
  }

  bindCancelButtons();

  function updateAppointmentInfo(appointment) {
    if (!appointmentInfo) return;
    if (!appointment) {
      appointmentInfo.innerHTML = "<p>등록된 약속이 없습니다.</p>";
      appointmentInfo.dataset.hasAppointment = "false";
      appointmentInfo.dataset.cancelRequestedBy = "";
      appointmentInfo.dataset.isParticipant = "false";
      return;
    }

    const datetimeText = appointment.datetime.includes("T")
      ? appointment.datetime.replace("T", " ")
      : appointment.datetime;

    const isParticipant = appointment.sellerId === currentUserId || appointment.buyerId === currentUserId;
    appointmentInfo.dataset.hasAppointment = "true";
    appointmentInfo.dataset.cancelRequestedBy = appointment.cancelRequestedBy || "";
    appointmentInfo.dataset.isParticipant = isParticipant ? "true" : "false";

    let extraHtml = "";
    if (isParticipant) {
      if (appointment.cancelRequestedBy && appointment.cancelRequestedBy === currentUserId) {
        extraHtml = `<p class="notice">상대방의 철회 동의를 기다리는 중입니다.</p>`;
      } else if (appointment.cancelRequestedBy && appointment.cancelRequestedBy !== currentUserId) {
        extraHtml = `
          <p class="notice">상대방이 약속 철회를 요청했습니다. 동의하면 예약이 취소됩니다.</p>
          <button class="btn secondary" id="approveCancelBtn">철회 동의하기</button>
        `;
      } else {
        extraHtml = `<button class="btn secondary" id="requestCancelBtn">약속 철회 요청</button>`;
      }
    }

    appointmentInfo.innerHTML = `
      <p><strong>약속 일시:</strong> ${datetimeText}</p>
      <p><strong>장소:</strong> ${appointment.place}</p>
      <p><strong>참여자:</strong> 판매자(${appointment.sellerId}) / 구매자(${appointment.buyerId})</p>
      ${extraHtml}
    `;

    bindCancelButtons();
  }
})();

