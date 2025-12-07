const express = require("express");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const {
  getPosts,
  getUsers,
  getUserById,
  addPost,
  getPostById,
  getMessagesByPost,
  getAppointmentByPost,
  deletePost
} = require("../data/db");
const { clearAppointmentReminder } = require("../services/notificationService");

const DEFAULT_IMAGE = "/uploads/r3.jpg";

function createPostsRouter(upload) {
  const router = express.Router();

  // 모든 페이지에서 현재 사용자 정보를 공유합니다.
  router.use((req, res, next) => {
    res.locals.request = req;
    const currentUserId = req.query.user || req.body?.currentUserId || "user1";
    res.locals.currentUserId = currentUserId;
    res.locals.users = getUsers();
    next();
  });

  // 메인 리스트 페이지
  router.get("/", (req, res) => {
    res.render("index", {
      posts: getPosts()
    });
  });

  // 판매글 작성 화면
  router.get("/posts/new", (req, res) => {
    const currentUser = getUserById(res.locals.currentUserId);
    res.render("post_new", {
      defaultLocation: currentUser?.address || ""
    });
  });

  // 판매글 저장
  router.post("/posts", upload.single("image"), (req, res) => {
    const { title, price, location, description, sellerId } = req.body;

    const seller = getUserById(sellerId);
    const sanitizedLocation = location || seller?.address || "";
    const filePath = req.file ? `/uploads/${path.basename(req.file.path)}` : DEFAULT_IMAGE;

    const newPost = {
      id: uuidv4(),
      title,
      description,
      price: Number(price) || 0,
      imageUrl: filePath,
      sellerId: sellerId || "user1",
      location: sanitizedLocation,
      status: "판매중",
      createdAt: new Date().toISOString()
    };

    addPost(newPost);

    res.redirect(`/?user=${sellerId}`);
  });

  function enrichMessages(messages = []) {
    return messages.map((msg) => {
      const sender = getUserById(msg.senderId);
      const receiver = getUserById(msg.receiverId);
      return {
        ...msg,
        senderName: sender?.name || msg.senderId,
        receiverName: receiver?.name || msg.receiverId
      };
    });
  }

  // 판매글 상세 + 채팅/약속 화면
  router.get("/posts/:id", (req, res) => {
    const post = getPostById(req.params.id);
    if (!post) {
      return res.status(404).render("404", { message: "게시글을 찾을 수 없습니다." });
    }

    res.render("post_show", {
      post,
      messages: enrichMessages(getMessagesByPost(post.id)),
      appointment: getAppointmentByPost(post.id),
      errorMessage: req.query.error || null
    });
  });

  router.post("/posts/:id/delete", (req, res) => {
    const post = getPostById(req.params.id);
    const currentUser = res.locals.currentUserId;
    if (!post) {
      return res.status(404).render("404", { message: "게시글을 찾을 수 없습니다." });
    }
    if (post.sellerId !== currentUser) {
      return res.status(403).render("404", { message: "삭제 권한이 없습니다." });
    }
    const appointment = getAppointmentByPost(post.id);
    if (post.status === "예약중" && appointment) {
      return res.redirect(`/posts/${post.id}?user=${currentUser}&error=예약을 먼저 철회해야 삭제할 수 있습니다.`);
    }

    deletePost(post.id);
    clearAppointmentReminder(post.id);
    res.redirect(`/?user=${currentUser}`);
  });

  return router;
}

module.exports = createPostsRouter;

