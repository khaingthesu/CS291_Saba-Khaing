//Import Firebase core
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

//Firestore (database)
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

//Authentication
import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ================= CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyCIEnfvJUMjJ1EWd5C2cL5FNRtBaXSHfB0",
  authDomain: "share-lite-bbb07.firebaseapp.com",
  projectId: "share-lite-bbb07",
  storageBucket: "share-lite-bbb07.firebasestorage.app",
  messagingSenderId: "1045732530235",
  appId: "1:1045732530235:web:62974c1904772a7614641e"
};

// ================= INIT =================
const app = initializeApp(firebaseConfig);

// Firestore DB
const db = getFirestore(app);

// Auth
const auth = getAuth(app);

// ================= EXPORT =================
export { db, auth, collection, addDoc, getDoc, doc };

// ================= UI ELEMENTS =================
const messageInput = document.getElementById("message");
const encryptButton = document.getElementById("encryptBtn");
const resultBox = document.querySelector(".result");
const messageKeyOutput = document.getElementById("messageKeyOutput");
const copyMessageKeyBtn = document.getElementById("copyMessageKeyBtn");
const messageCopyStatus = document.getElementById("messageCopyStatus");

const decryptKeyInput = document.getElementById("decryptKey");
const decryptButton = document.getElementById("decryptBtn");
const decryptedOutput = document.querySelector(".decrypted-output");
const decryptedMessage = document.getElementById("decryptedMessage");

// NEW: Message ID input
const messageIdInput = document.getElementById("messageIdInput");

// File elements (unchanged)
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

// ================= ENCRYPT MESSAGE =================
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

    // OPTIONAL: download file
    const encryptedBlob = new Blob(
      [JSON.stringify(encryptedPackage)],
      { type: "text/plain" }
    );
    downloadBlob(encryptedBlob, "encrypted-message.txt");

    // 🔥 SAVE TO FIREBASE
    const docRef = await addDoc(collection(db, "messages"), {
      iv: encryptedMessage.iv,
      data: encryptedMessage.data,
      createdAt: Date.now()
    });

    const messageId = docRef.id;

    // Show key + ID
    messageKeyOutput.textContent =
      "Key:\n" + exportedKey + "\n\nMessage ID:\n" + messageId;

    resultBox.style.display = "block";

  } catch (error) {
    alert("Something went wrong while encrypting.");
    console.error(error);
  }
});

// Copy key
copyMessageKeyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(messageKeyOutput.textContent);
  messageCopyStatus.textContent = "Copied.";
});

// ================= DECRYPT MESSAGE (FROM FIREBASE) =================
decryptButton.addEventListener("click", async () => {
  const messageId = messageIdInput.value.trim();
  const key = decryptKeyInput.value.trim();

  if (!messageId || key === "") {
    alert("Enter message ID and key.");
    return;
  }

  try {
    const docRef = doc(db, "messages", messageId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      alert("Message not found.");
      return;
    }

    const encryptedPackage = docSnap.data();

    const decryptedText = await decryptText(encryptedPackage, key);

    decryptedMessage.textContent = decryptedText;
    decryptedOutput.style.display = "block";

  } catch (error) {
    alert("Wrong key or failed to decrypt.");
    console.error(error);
  }
});

// ================= FILE ENCRYPTION (UNCHANGED) =================
encryptFileBtn.addEventListener("click", async () => {
  const file = zipFileInput.files[0];

  if (!file || !file.name.toLowerCase().endsWith(".zip")) {
    alert("Upload a ZIP file.");
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
    alert("Error encrypting file.");
    console.error(error);
  }
});

// ================= CRYPTO FUNCTIONS (UNCHANGED) =================
async function generateCryptoKey() {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptText(text, key) {
  const encoder = new TextEncoder();
  return await encryptBuffer(encoder.encode(text), key);
}

async function decryptText(encryptedPackage, base64Key) {
  const decryptedBuffer = await decryptBuffer(encryptedPackage, base64Key);
  return new TextDecoder().decode(decryptedBuffer);
}

async function encryptBuffer(buffer, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
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
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const iv = base64ToArrayBuffer(encryptedPackage.iv);
  const data = base64ToArrayBuffer(encryptedPackage.data);

  return await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
}

async function exportKey(key) {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function downloadBlob(blob, fileName) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}
