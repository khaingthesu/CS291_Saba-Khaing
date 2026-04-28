const messageInput = document.getElementById("message");
const expireSelect = document.getElementById("expire");
const viewsSelect = document.getElementById("views");
const generateButton = document.getElementById("encryptBtn");
const decryptButton = document.getElementById("decryptBtn");

const resultBox = document.querySelector(".result");
const linkOutput = document.querySelectorAll(".result-value")[0];
const keyOutput = document.querySelectorAll(".result-value")[1];

const decryptLinkInput = document.getElementById("decryptLink");
const decryptKeyInput = document.getElementById("decryptKey");
const decryptedOutput = document.querySelector(".decrypted-output");
const decryptedMessage = document.getElementById("decryptedMessage");

const copyButtons = document.querySelectorAll(".copy-btn");

resultBox.style.display = "none";
decryptedOutput.style.display = "none";

generateButton.addEventListener("click", async () => {
  const message = messageInput.value.trim();

  if (message === "") {
    alert("Please type a message first.");
    return;
  }

  const key = await generateCryptoKey();
  const encryptedMessage = await encryptMessage(message, key);
  const exportedKey = await exportKey(key);

  const messageData = {
    encryptedMessage: encryptedMessage,
    expiresAfter: expireSelect.value,
    maxViews: viewsSelect.value,
    viewsUsed: 0,
    createdAt: new Date().toISOString()
  };

  const messageId = "msg_" + Date.now();

  localStorage.setItem(messageId, JSON.stringify(messageData));

  const shareLink =
    window.location.origin + window.location.pathname + "?id=" + messageId;

  linkOutput.textContent = shareLink;
  keyOutput.textContent = exportedKey;

  resultBox.style.display = "block";
});

copyButtons[0].addEventListener("click", () => {
  navigator.clipboard.writeText(linkOutput.textContent);
  alert("Link copied!");
});

copyButtons[1].addEventListener("click", () => {
  navigator.clipboard.writeText(keyOutput.textContent);
  alert("Key copied!");
});

decryptButton.addEventListener("click", async () => {
  const link = decryptLinkInput.value.trim();
  const key = decryptKeyInput.value.trim();

  if (link === "" || key === "") {
    alert("Please enter both the encrypted link and decryption key.");
    return;
  }

  const messageId = getMessageIdFromLink(link);
  const storedMessage = localStorage.getItem(messageId);

  if (!storedMessage) {
    alert("Message not found or expired.");
    return;
  }

  const messageData = JSON.parse(storedMessage);

  if (isExpired(messageData)) {
    localStorage.removeItem(messageId);
    alert("This message has expired.");
    return;
  }

  if (hasReachedMaxViews(messageData)) {
    localStorage.removeItem(messageId);
    alert("This message reached its max views and was deleted.");
    return;
  }

  try {
    const decryptedText = await decryptMessage(
      messageData.encryptedMessage,
      key
    );

    messageData.viewsUsed += 1;
    localStorage.setItem(messageId, JSON.stringify(messageData));

    decryptedMessage.textContent = decryptedText;
    decryptedOutput.style.display = "block";

    if (hasReachedMaxViews(messageData)) {
      localStorage.removeItem(messageId);
    }
  } catch (error) {
    alert("Wrong decryption key or damaged message.");
  }
});

function getMessageIdFromLink(link) {
  const url = new URL(link);
  return url.searchParams.get("id");
}

function isExpired(messageData) {
  const createdAt = new Date(messageData.createdAt);
  const now = new Date();

  let hoursAllowed = 24;

  if (messageData.expiresAfter === "1 hour") {
    hoursAllowed = 1;
  } else if (messageData.expiresAfter === "7 days") {
    hoursAllowed = 168;
  }

  const expirationTime = createdAt.getTime() + hoursAllowed * 60 * 60 * 1000;

  return now.getTime() > expirationTime;
}

function hasReachedMaxViews(messageData) {
  let maxViews = 3;

  if (messageData.maxViews === "1 view") {
    maxViews = 1;
  } else if (messageData.maxViews === "10 views") {
    maxViews = 10;
  }

  return messageData.viewsUsed >= maxViews;
}

async function generateCryptoKey() {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptMessage(message, key) {
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encodedMessage
  );

  return {
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(encryptedData)
  };
}

async function decryptMessage(encryptedMessage, base64Key) {
  const keyBuffer = base64ToArrayBuffer(base64Key);

  const key = await window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    {
      name: "AES-GCM"
    },
    false,
    ["decrypt"]
  );

  const iv = base64ToArrayBuffer(encryptedMessage.iv);
  const data = base64ToArrayBuffer(encryptedMessage.data);

  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

async function exportKey(key) {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
