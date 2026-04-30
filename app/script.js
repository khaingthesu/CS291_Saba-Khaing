// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIEnfvJUMjJ1EWd5C2cL5FNRtBaXSHfB0",
  authDomain: "share-lite-bbb07.firebaseapp.com",
  projectId: "share-lite-bbb07",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ================= UI =================
const messageInput = document.getElementById("message");
const encryptBtn = document.getElementById("encryptBtn");
const decryptBtn = document.getElementById("decryptBtn");

const messageKeyOutput = document.getElementById("messageKeyOutput");
const resultBox = document.querySelector(".result");

const decryptKeyInput = document.getElementById("decryptKey");
const messageIdInput = document.getElementById("messageIdInput");
const decryptedMessage = document.getElementById("decryptedMessage");
const decryptedOutput = document.querySelector(".decrypted-output");

resultBox.style.display = "none";
decryptedOutput.style.display = "none";

// ================= ENCRYPT =================
encryptBtn.addEventListener("click", async () => {
  const text = messageInput.value.trim();
  if (!text) return alert("Type a message");

  try {
    const key = await generateKey();
    const exportedKey = await exportKey(key);
    const encrypted = await encrypt(text, key);

    const packageData = {
      iv: encrypted.iv,
      data: encrypted.data
    };

    // 🔥 CREATE BLOB
    const blob = new Blob(
      [JSON.stringify(packageData)],
      { type: "text/plain" }
    );

    // 🔥 FORCE DOWNLOAD (RIGHT HERE — no delay after this)
    download(blob, "encrypted-message.txt");

    // 🔥 AFTER download → Firebase (safe now)
    await addDoc(collection(db, "encrypted_keys"), {
      ...packageData,
      createdAt: Date.now()
    });

    messageKeyOutput.textContent = exportedKey;
    resultBox.style.display = "block";

  } catch (err) {
    console.error(err);
    alert("Encryption failed");
  }
});
// ================= DECRYPT =================
decryptBtn.addEventListener("click", async () => {
  const id = messageIdInput.value.trim();
  const key = decryptKeyInput.value.trim();

  if (!id || !key) return alert("Enter ID + key");

  try {
    const snap = await getDoc(doc(db, "encrypted_keys", id));
    if (!snap.exists()) return alert("Message not found");

    const data = snap.data();
    const text = await decrypt(data, key);

    decryptedMessage.textContent = text;
    decryptedOutput.style.display = "block";

  } catch (err) {
    console.error(err);
    alert("Decryption failed");
  }
});

// ================= CRYPTO =================
async function generateKey() {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(text, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    iv: toBase64(iv),
    data: toBase64(encrypted)
  };
}

async function decrypt(pkg, base64Key) {
  const key = await crypto.subtle.importKey(
    "raw",
    fromBase64(base64Key),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(pkg.iv) },
    key,
    fromBase64(pkg.data)
  );

  return new TextDecoder().decode(decrypted);
}

async function exportKey(key) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64(raw);
}

// ================= HELPERS =================
function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64) {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

function download(blob, name) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
