const forge = require('node-forge');

const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || 'meesho_panel_enc_key_32chars!!').padEnd(32, '0').slice(0, 32);

function encrypt(plaintext) {
  if (!plaintext) return null;
  const iv = forge.random.getBytesSync(16);
  const cipher = forge.cipher.createCipher('AES-CBC', ENCRYPTION_KEY);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(plaintext, 'utf8'));
  cipher.finish();
  const encrypted = cipher.output.getBytes();
  return forge.util.encode64(iv + encrypted);
}

function decrypt(ciphertext) {
  if (!ciphertext) return null;
  try {
    const raw = forge.util.decode64(ciphertext);
    const iv = raw.slice(0, 16);
    const encrypted = raw.slice(16);
    const decipher = forge.cipher.createDecipher('AES-CBC', ENCRYPTION_KEY);
    decipher.start({ iv });
    decipher.update(forge.util.createBuffer(encrypted));
    decipher.finish();
    return decipher.output.toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt };
