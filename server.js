require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const { createServer } = require("http");
const { Server } = require("socket.io");
const dayjs = require("dayjs");

const {
  addMessage,
  getPostById,
  getMessagesByPost,
  getStateSnapshot,
  getUserById
} = require("./data/db");
const createPostsRouter = require("./routes/posts");
const createApiRouter = require("./routes/api");
const { scheduleAppointmentReminder } = require("./services/notificationService");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// 이미지를 담아둘 폴더가 없으면 먼저 만들어 둡니다.
const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "")}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});


// 뷰 엔진과 공통 미들웨어
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.locals.dayjs = dayjs;

app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// 라우터 연결
app.use("/", createPostsRouter(upload));
app.use("/api", createApiRouter(io));

app.get("/health", (_req, res) => res.json({ ok: true }));

function enrichMessage(message) {
  const sender = getUserById(message.senderId);
  const receiver = getUserById(message.receiverId);
  return {
    ...message,
    senderName: sender?.name || message.senderId,
    receiverName: receiver?.name || message.receiverId
  };
}

// socket.io 이벤트 (채팅방 입장 + 메시지 브로드캐스트)
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ postId }) => {
    socket.join(postId);
    const history = getMessagesByPost(postId).map(enrichMessage);
    socket.emit("chatHistory", history);
  });

  socket.on("chatMessage", ({ postId, senderId, receiverId, content }) => {
    if (!content?.trim()) {
      return;
    }
    const post = getPostById(postId);
    if (!post) return;

    const message = addMessage({
      postId,
      senderId,
      receiverId,
      content: content.trim()
    });

    io.to(postId).emit("chatMessage", enrichMessage(message));
  });
});

// 서버가 다시 켜졌을 때 이전에 잡아둔 약속도 다시 예약해 둡니다.
const snapshot = getStateSnapshot();
snapshot.appointments?.forEach((appointment) => {
  scheduleAppointmentReminder({ appointment, io });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`서버가 실행 중입니다: http://localhost:${PORT}`);
});

