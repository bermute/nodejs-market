(function () {
  if (!window.io) return;
  const socket = io();
  const chatLog = document.getElementById("chatMessages");
  const chatForm = document.getElementById("chatForm");

  const postId = window.App?.currentPostId;
  if (!postId || !chatLog) {
    return;
  }

  socket.emit("joinRoom", { postId, userId: window.App.currentUserId });

  function appendMessage(message, isSystem) {
    const wrapper = document.createElement("div");
    wrapper.className = isSystem
      ? "chat-message system"
      : `chat-message ${message.senderId === window.App.currentUserId ? "me" : ""}`;

    if (isSystem) {
      wrapper.innerHTML = `<p>${message.content}</p>`;
    } else {
      const senderLabel = message.senderName || message.senderId;
      wrapper.innerHTML = `
        <p class="sender">${senderLabel}</p>
        <p>${message.content}</p>
        <small>${new Date(message.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</small>
      `;
    }
    chatLog.appendChild(wrapper);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  socket.on("chatMessage", (message) => {
    appendMessage(message);
  });

  socket.on("systemMessage", (payload) => {
    appendMessage({ content: payload.content }, true);
    window.App?.showBanner(payload.content);
  });

  socket.on("chatHistory", (messages = []) => {
    chatLog.innerHTML = "";
    messages.forEach((msg) => appendMessage(msg));
  });

  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(chatForm);
    const content = formData.get("content");
    if (!content?.trim()) return;

    socket.emit("chatMessage", {
      postId,
      senderId: formData.get("senderId"),
      receiverId: formData.get("receiverId"),
      content
    });
    chatForm.reset();
  });
})();

