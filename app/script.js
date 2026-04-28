const messageInput = document.getElementById("message");
const expireSelect = document.getElementById("expire");
const viewsSelect = document.getElementById("views");
const generateButton = document.querySelector("button");
const resultBox = document.querySelector(".result");

const resultValues = document.querySelectorAll(".result-value");
const linkOutput = resultValues[0];
const keyOutput = resultValues[1];

const copyButtons = document.querySelectorAll(".copy-btn");

resultBox.style.display = "none";

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
    createdAt: new Date().toISOString()
  };

  const messageId = "msg_" + Date.now();

  localStorage.setItem(messageId, JSON.stringify(messageData));

  const fakeShareLink = window.location.origin + window.location.pathname + "?id=" + messageId;

  linkOutput.textContent = fakeShareLink;
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
