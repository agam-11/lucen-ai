// lucen-backend/utils/encryption.js
const CryptoJS = require("crypto-js");

const secretKey = process.env.ENCRYPTION_SECRET_KEY;

if (!secretKey) {
  throw new Error(
    "ENCRYPTION_SECRET_KEY is not defined in environment variables."
  );
}

// Function to encrypt data (turns an object into a scrambled string)
exports.encryptData = (data) => {
  const dataString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(dataString, secretKey).toString();
};

// Function to decrypt data (turns a scrambled string back into an object)
exports.decryptData = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) {
      // This handles cases where the decryption results in an empty string
      return null;
    }
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null; // Return null if decryption fails
  }
};
