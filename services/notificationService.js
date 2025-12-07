const dayjs = require("dayjs");

const scheduledJobs = new Map();

// 같은 게시글의 이전 알림은 미리 지웁니다.
function clearAppointmentReminder(postId) {
  const existing = scheduledJobs.get(postId);
  if (existing) {
    clearTimeout(existing);
    scheduledJobs.delete(postId);
  }
}

// 약속 시간이 되면 채팅방에 시스템 메시지를 보내도록 예약합니다.
function scheduleAppointmentReminder({ appointment, io }) {
  clearAppointmentReminder(appointment.postId);

  const now = dayjs();
  const target = dayjs(appointment.datetime);
  const delay = Math.max(target.diff(now, "millisecond"), 0);

  const timeoutId = setTimeout(() => {
    io.to(appointment.postId).emit("systemMessage", {
      type: "reminder",
      content: "지금 약속 시간이 되었습니다. 만나서 안전하게 거래하세요!"
    });
    scheduledJobs.delete(appointment.postId);
  }, delay);

  scheduledJobs.set(appointment.postId, timeoutId);
}

module.exports = {
  scheduleAppointmentReminder,
  clearAppointmentReminder
};

