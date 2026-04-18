# Security: Is This End-to-End Encrypted?

**Yes.** This app is a real end-to-end encrypted (E2E) chat: only the sender and the recipient can read messages. The server cannot decrypt them.

---

## What Is E2E Secure

| Aspect | How it works |
|--------|----------------|
| **Key agreement** | Each device has an ECDH P-256 key pair. Public keys are exchanged via the server; **private keys never leave the device**. Only the two participants can derive the same shared secret. |
| **Encryption** | Messages are encrypted in the **browser** with AES-256-GCM. Only ciphertext + IV (+ ephemeral public key) go to the server. |
| **Decryption** | Only the recipient’s client has the key to decrypt. The server has no key and never sees plaintext. |
| **Integrity** | AES-GCM provides authentication: tampering with ciphertext is detected and decryption fails. |
| **Passwords** | Stored only as bcrypt hashes on the server; plain passwords are never stored. |

---

## Gaps We Filled (All Free, No Paid Services)

| Gap | What we added |
|-----|----------------|
| **Key verification** | **Fingerprints:** Each public key has a short fingerprint (SHA-256, first 32 hex chars). In the chat UI you see "Your fingerprint" and "Their fingerprint". Compare them with the other person (in person or by phone); if they match, tick "I verified this contact". Verified contacts show a ✓ in the user list and "Verified · Encrypted" in the chat header. Stored in localStorage. |
| **Forward secrecy** | **Ephemeral key per message:** Each message is encrypted with a **new** ephemeral ECDH key pair. The sender’s ephemeral private key is never stored; only the ephemeral public key is sent with the ciphertext. The recipient uses their long-term private key + ephemeral public to derive the one-time key and decrypt. If a key is compromised later, past messages are not re-derivable. |
| **Replay protection** | **Message IDs:** Every message has a unique `messageId`. The client tracks received message IDs and ignores duplicates, so replayed messages are dropped. |
| **HTTPS** | **Warning banner:** If the app is loaded over HTTP (and not on localhost), a banner appears: "This connection is not secure. Use HTTPS in production." Deploy behind HTTPS (e.g. Let’s Encrypt, or a host that provides it for free) so login and metadata are protected in transit. |

---

## Summary

- **Is it E2E encrypted?** **Yes.** Only the two chat participants can read the messages; the server cannot.
- **Key verification?** **Yes.** Fingerprints are shown; users can verify out-of-band and mark contacts as verified.
- **Forward secrecy?** **Yes.** Each message uses an ephemeral key; compromise of long-term keys does not reveal past messages.
- **Replay protection?** **Yes.** Duplicate message IDs are ignored.
- **HTTPS?** **Your responsibility.** The app warns when not using HTTPS; use a free TLS certificate (e.g. Let’s Encrypt) or a host that provides HTTPS when you deploy.

All of the above are implemented with free, standard crypto (Web Crypto API) and no paid services.
