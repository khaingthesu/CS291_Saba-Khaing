const messageInput = document.getElementById("message");
const encryptButton = document.getElementById("encryptBtn");
const resultBox = document.querySelector(".result");
const messageKeyOutput = document.getElementById("messageKeyOutput");
const copyMessageKeyBtn = document.getElementById("copyMessageKeyBtn");
const messageCopyStatus = document.getElementById("messageCopyStatus");

const encryptedMessageInput = document.getElementById("encryptedMessageInput");
const decryptKeyInput = document.getElementById("decryptKey");
const decryptButton = document.getElementById("decryptBtn");
const decryptedOutput = document.querySelector(".decrypted-output");
const decryptedMessage = document.getElementById("decryptedMessage");

const zipFileInput = document.getElementById("zipFileInput");
const encryptFileBtn = document.getElementById("encryptFileBtn");
const encryptedZipInput = document.getElementById("encryptedZipInput");
const fileDecryptKey = document.getElementById("fileDecryptKey");
const decryptFileBtn = document.getElementById("decryptFileBtn");
const fileOutput = document.querySelector(".file-output");
const fileKeyOutput = document.getElementById("fileKeyOutput");
const copyFileKeyBtn = document.getElementById("copyFileKeyBtn");
const fileCopyStatus = document.getElementById("fileCopyStatus");

resultBox.style.display = "none";
decryptedOutput.style.display = "none";
fileOutput.style.display = "none";

encryptButton.addEventListener("click", async () => {
  const message = messageInput.value.trim();

  if (message === "") {
    alert("Please type a message first.");
    return;
  }

  try {
    const key = await generateCryptoKey();
    const exportedKey = await exportKey(key);
    const encryptedMessage = await encryptText(message, key);

    const encryptedPackage = {
      type: "SecureShare Lite Encrypted Message",
      iv: encryptedMessage.iv,
      data: encryptedMessage.data
    };

    const encryptedBlob = new Blob(
      [JSON.stringify(encryptedPackage)],
      { type: "text/plain" }
    );

    downloadBlob(encryptedBlob, "encrypted-message.txt");

    messageKeyOutput.textContent = exportedKey;
    resultBox.style.display = "block";
  } catch (error) {
    alert("Something went wrong while encrypting the message.");
    console.error(error);
  }
});

copyMessageKeyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(messageKeyOutput.textContent);
  messageCopyStatus.textContent = "Message key copied.";
});

decryptButton.addEventListener("click", async () => {
  const file = encryptedMessageInput.files[0];
  const key = decryptKeyInput.value.trim();

  if (!file || key === "") {
    alert("Please choose the encrypted message file and enter the key.");
    return;
  }

  if (!file.name.toLowerCase().endsWith(".txt")) {
    alert("Please upload the encrypted .txt message file.");
    return;
  }

  try {
    const encryptedText = await file.text();
    const encryptedPackage = JSON.parse(encryptedText);

    const decryptedText = await decryptText(encryptedPackage, key);

    decryptedMessage.textContent = decryptedText;
    decryptedOutput.style.display = "block";
  } catch (error) {
    alert("Wrong key or damaged encrypted message file.");
    console.error(error);
  }
});

encryptFileBtn.addEventListener("click", async () => {
  const file = zipFileInput.files[0];

  if (!file) {
    alert("Please choose a ZIP file first.");
    return;
  }

  if (!file.name.toLowerCase().endsWith(".zip")) {
    alert("Only ZIP files are allowed. Please compress your folder into a .zip file first.");
    return;
  }

  try {
    const key = await generateCryptoKey();
    const exportedKey = await exportKey(key);
    const fileBuffer = await file.arrayBuffer();

    const encryptedFile = await encryptBuffer(fileBuffer, key);

    const encryptedPackage = {
      type: "SecureShare Lite Encrypted ZIP",
      originalFileName: file.name,
      iv: encryptedFile.iv,
      data: encryptedFile.data
    };

    const encryptedBlob = new Blob(
      [JSON.stringify(encryptedPackage)],
      { type: "application/json" }
    );

    downloadBlob(encryptedBlob, file.name + ".encrypted");

    fileKeyOutput.textContent = exportedKey;
    fileOutput.style.display = "block";
  } catch (error) {
    alert("Something went wrong while encrypting the ZIP file.");
    console.error(error);
  }
});

copyFileKeyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(fileKeyOutput.textContent);
  fileCopyStatus.textContent = "File key copied.";
});

decryptFileBtn.addEventListener("click", async () => {
  const encryptedFile = encryptedZipInput.files[0];
  const keyText = fileDecryptKey.value.trim();

  if (!encryptedFile || keyText === "") {
    alert("Please choose the encrypted ZIP file and enter the file key.");
    return;
  }

  try {
    const encryptedText = await encryptedFile.text();
    const encryptedPackage = JSON.parse(encryptedText);

    const decryptedBuffer = await decryptBuffer(encryptedPackage, keyText);

    const originalName = encryptedPackage.originalFileName || "decrypted-file.zip";
    const decryptedBlob = new Blob([decryptedBuffer], { type: "application/zip" });

    downloadBlob(decryptedBlob, originalName);
  } catch (error) {
    alert("Wrong file key or damaged encrypted ZIP file.");
    console.error(error);
  }
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

async function encryptText(text, key) {
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);

  return await encryptBuffer(encodedText, key);
}

async function decryptText(encryptedPackage, base64Key) {
  const decryptedBuffer = await decryptBuffer(encryptedPackage, base64Key);
  const decoder = new TextDecoder();

  return decoder.decode(decryptedBuffer);
}

async function encryptBuffer(buffer, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    buffer
  );

  return {
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(encryptedData)
  };
}

async function decryptBuffer(encryptedPackage, base64Key) {
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

  const iv = base64ToArrayBuffer(encryptedPackage.iv);
  const data = base64ToArrayBuffer(encryptedPackage.data);

  return await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    data
  );
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

function downloadBlob(blob, fileName) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
} 
