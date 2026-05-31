import CryptoJS from 'crypto-js';

// Generate random encryption key and IV
export const generateFileKey = () => {
  const key = CryptoJS.lib.WordArray.random(32);
  const iv = CryptoJS.lib.WordArray.random(16);
  return {
    key: key.toString(CryptoJS.enc.Hex),
    iv: iv.toString(CryptoJS.enc.Hex)
  };
};

// Encrypt file before upload
export const encryptFile = async (file, encryptionKey, encryptionIV) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
        
        const encrypted = CryptoJS.AES.encrypt(wordArray, 
          CryptoJS.enc.Hex.parse(encryptionKey),
          {
            iv: CryptoJS.enc.Hex.parse(encryptionIV),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
          }
        );
        
        const encryptedBlob = new Blob([encrypted.toString()], { type: 'application/octet-stream' });
        resolve(encryptedBlob);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Decrypt file after download
export const decryptFile = async (encryptedData, encryptionKey, encryptionIV) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, 
      CryptoJS.enc.Hex.parse(encryptionKey),
      {
        iv: CryptoJS.enc.Hex.parse(encryptionIV),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const uint8Array = new Uint8Array(decrypted.sigBytes);
    for (let i = 0; i < decrypted.sigBytes; i++) {
      uint8Array[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    
    return new Blob([uint8Array]);
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Failed to decrypt file. The key may be incorrect.');
  }
};

// Derive key from password
export const deriveKeyFromPassword = (password, salt) => {
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256
  });
  return key.toString(CryptoJS.enc.Hex);
};

// Generate random salt
export const generateSalt = () => {
  return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
};