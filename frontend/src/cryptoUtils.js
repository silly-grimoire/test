/**
 * cryptoUtils.js
 * Native Web Crypto API utilities for PBKDF2 key derivation and 256-bit AES-GCM encryption.
 */

/**
 * Encrypts a string of data using a password.
 * @param {string} dataString - The plain-text data to encrypt.
 * @param {string} password - The password to derive the key from.
 * @returns {Promise<string>} Base64-encoded encrypted string containing salt, iv, and ciphertext.
 */
export async function encryptData(dataString, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const passwordBytes = new TextEncoder().encode(password);
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  
  const dataBytes = new TextEncoder().encode(dataString);
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    dataBytes
  );
  
  const ciphertextBytes = new Uint8Array(ciphertextBuffer);
  
  // Combine salt + iv + ciphertext into one buffer
  const combined = new Uint8Array(salt.length + iv.length + ciphertextBytes.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertextBytes, salt.length + iv.length);
  
  // Convert combined bytes to base64
  let binary = "";
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return window.btoa(binary);
}

/**
 * Decrypts a base64-encoded encrypted string using a password.
 * @param {string} encryptedBase64 - The base64-encoded encrypted string containing salt, iv, and ciphertext.
 * @param {string} password - The password to derive the key from.
 * @returns {Promise<string>} The decrypted plain-text data.
 */
export async function decryptData(encryptedBase64, password) {
  const binaryString = window.atob(encryptedBase64);
  const combined = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    combined[i] = binaryString.charCodeAt(i);
  }
  
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertextBytes = combined.slice(28);
  
  const passwordBytes = new TextEncoder().encode(password);
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    ciphertextBytes
  );
  
  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Hashes a password using SHA-256.
 * @param {string} password - The plain-text password.
 * @returns {Promise<string>} The hexadecimal representation of the hash.
 */
export async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

