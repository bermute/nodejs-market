const express = require("express");
const { v4: uuidv4 } = require("uuid");
const {
  getPostById,
  getAppointmentByPost,
  addAppointment,
  updatePost,
  requestAppointmentCancellation,
  finalizeAppointmentCancellation
} = require("../data/db");
const { generateSalePostDescription } = require("../services/aiService");
const { scheduleAppointmentReminder, clearAppointmentReminder } = require("../services/notificationService");

function createApiRouter(io) {
  const router = express.Router();

  // 판매글 설명을 AI에게 요청
  router.post("/ai/generate-post", async (req, res) => {
    try {
      const {
        title,
        price,
        location,
        extraDescription,
      imageBase64,
      imageMime
      } = req.body || {};

      const result = await generateSalePostDescription({
        title,
        price,
        location,
        extraDescription,
      imageBase64,
      imageMime
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error("AI 생성 실패:", error);
      res.status(500).json({
        success: false,
        message: "AI 생성 중 문제가 발생했습니다."
      });
    }
  });


  // 특정 게시글의 약속 현황 조회
  router.get("/posts/:id/appointment", (req, res) => {
    const appointment = getAppointmentByPost(req.params.id);
    if (!appointment) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: appointment });
  });

  // 약속 등록
  router.post("/posts/:id/appointment", (req, res) => {
    const post = getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "게시글이 없습니다." });
    }

    const { buyerId, date, time, place } = req.body;
    if (!buyerId || !date || !time || !place) {
      return res.status(400).json({ success: false, message: "모든 필드를 입력해 주세요." });
    }

    const appointment = addAppointment({
      id: uuidv4(),
      postId: post.id,
      buyerId,
      sellerId: post.sellerId,
      datetime: `${date}T${time}`,
      place
    });

    updatePost(post.id, { status: "예약중", appointmentId: appointment.id });

    scheduleAppointmentReminder({ appointment, io });

    io.to(post.id).emit("systemMessage", {
      type: "appointment",
      content: `약속이 등록되었습니다: ${appointment.datetime.replace("T", " ")} @ ${appointment.place}`
    });

    res.json({ success: true, data: appointment });
  });

  // 약속 철회 요청 (상대방 동의 대기)
  router.post("/posts/:id/appointment/cancel-request", (req, res) => {
    const post = getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "게시글이 없습니다." });
    }
    const appointment = getAppointmentByPost(post.id);
    if (!appointment) {
      return res.status(400).json({ success: false, message: "예약 정보가 없습니다." });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "사용자 정보가 필요합니다." });
    }
    if (userId !== appointment.buyerId && userId !== appointment.sellerId) {
      return res.status(403).json({ success: false, message: "약속 참여자만 철회를 요청할 수 있습니다." });
    }
    if (appointment.cancelRequestedBy && appointment.cancelRequestedBy !== userId) {
      return res.status(400).json({ success: false, message: "상대방 동의를 기다리고 있습니다." });
    }

    const updatedAppointment = requestAppointmentCancellation(post.id, userId);
    io.to(post.id).emit("systemMessage", {
      type: "appointment",
      content: "약속 철회가 요청되었습니다. 상대방이 동의하면 예약이 취소됩니다."
    });
    res.json({ success: true, data: updatedAppointment });
  });

  // 약속 철회 동의 (약속 삭제 + 상태 되돌리기)
  router.post("/posts/:id/appointment/cancel-confirm", (req, res) => {
    const post = getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "게시글이 없습니다." });
    }
    const appointment = getAppointmentByPost(post.id);
    if (!appointment) {
      return res.status(400).json({ success: false, message: "예약 정보가 없습니다." });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "사용자 정보가 필요합니다." });
    }
    if (!appointment.cancelRequestedBy) {
      return res.status(400).json({ success: false, message: "철회 요청이 먼저 필요합니다." });
    }
    if (userId === appointment.cancelRequestedBy) {
      return res.status(400).json({ success: false, message: "상대방이 동의해야 합니다." });
    }

    finalizeAppointmentCancellation(post.id);
    updatePost(post.id, { status: "판매중", appointmentId: null });
    clearAppointmentReminder(post.id);

    io.to(post.id).emit("systemMessage", {
      type: "appointment",
      content: "약속이 철회되었습니다. 다시 일정을 잡거나 판매글을 수정해 주세요."
    });

    res.json({ success: true });
  });

  return router;
}

module.exports = createApiRouter;

