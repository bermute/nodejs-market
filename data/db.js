const fs = require("fs");
const path = require("path");

const STORAGE_PATH = path.join(__dirname, "storage.json");

// 간단한 JSON 파일에 데이터를 보관합니다.
const seedData = {
  users: [
    { id: "user1", name: "홍길동", address: "서울 마포구 망원동" },
    { id: "user2", name: "김영희", address: "경기 부천시 상동" }
  ],
  posts: [],
  appointments: [],
  messages: []
};

let state = loadState();

function loadState() {
  try {
    if (!fs.existsSync(STORAGE_PATH)) {
      return seedData;
    }
    const raw = fs.readFileSync(STORAGE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("데이터 파일을 불러오지 못했습니다. 초기 데이터로 시작합니다.", error);
    return seedData;
  }
}

function saveState() {
  try {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("데이터 저장 중 오류 발생:", error);
  }
}

function getUsers() {
  return state.users;
}

function getUserById(id) {
  return state.users.find((user) => user.id === id);
}

function getPosts() {
  return [...state.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getPostById(id) {
  return state.posts.find((post) => post.id === id);
}

function addPost(newPost) {
  state.posts.push(newPost);
  saveState();
  return newPost;
}

function updatePost(postId, updates) {
  const post = getPostById(postId);
  if (!post) {
    return null;
  }
  Object.assign(post, updates);
  saveState();
  return post;
}

function getMessagesByPost(postId) {
  return state.messages.filter((msg) => msg.postId === postId);
}

function addMessage(message) {
  const newMessage = {
    id: `msg-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    ...message
  };
  state.messages.push(newMessage);
  saveState();
  return newMessage;
}

function addAppointment(appointment) {
  removeAppointmentByPost(appointment.postId);
  const record = {
    ...appointment,
    createdAt: new Date().toISOString(),
    cancelRequestedBy: null
  };
  state.appointments.push(record);
  saveState();
  return record;
}

function removeAppointmentByPost(postId) {
  state.appointments = state.appointments.filter((appointment) => appointment.postId !== postId);
  saveState();
}

function getAppointmentByPost(postId) {
  return state.appointments.find((appointment) => appointment.postId === postId);
}

function requestAppointmentCancellation(postId, userId) {
  const appointment = getAppointmentByPost(postId);
  if (!appointment) return null;
  appointment.cancelRequestedBy = userId;
  saveState();
  return appointment;
}

function finalizeAppointmentCancellation(postId) {
  const appointment = getAppointmentByPost(postId);
  if (!appointment) return null;
  removeAppointmentByPost(postId);
  return appointment;
}

function deletePost(postId) {
  const beforeLength = state.posts.length;
  state.posts = state.posts.filter((post) => post.id !== postId);
  state.messages = state.messages.filter((msg) => msg.postId !== postId);
  removeAppointmentByPost(postId);
  if (state.posts.length !== beforeLength) {
    saveState();
    return true;
  }
  return false;
}

function getStateSnapshot() {
  return JSON.parse(JSON.stringify(state));
}

module.exports = {
  getUsers,
  getUserById,
  getPosts,
  getPostById,
  addPost,
  updatePost,
  addMessage,
  getMessagesByPost,
  addAppointment,
  getAppointmentByPost,
  requestAppointmentCancellation,
  finalizeAppointmentCancellation,
  deletePost,
  removeAppointmentByPost,
  getStateSnapshot
};

