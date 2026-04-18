<div align="center">

**Secure Chat Application with End-to-End Encryption**

*Project Proposal*

Secure Chat Group  
Zeerak Shahzad (22K-4692) · Moiz Ahmed Khan (22K-4795)

</div>


---

**Contents**

1. [Project Title, Group & Team](#1-project-title-group--team)  
2. [Project Description](#2-project-description)  
3. [Plan of Work](#3-plan-of-work-5-weeks)  
4. [References](#4-references)


---

## 1. Project Title, Group & Team

| | |
|:--|:--|
| **Project title** | Secure Chat Application with End-to-End Encryption |
| **Group name** | Secure Chat Group |
| **Team members** | Zeerak Shahzad (22K-4692), Moiz Ahmed Khan (22K-4795) |


## 2. Project Description

### 2.1 Overview

We propose building a **Secure Chat Application** that enables private, real-time messaging with end-to-end encryption (E2E). Only the sender and the intended recipient can read messages; the server and any intermediary cannot decrypt the content. Encryption is performed on the client using keys that never leave the user's device in plain form, aligning with modern expectations for private communication.

### 2.2 Technology Stack

We use a clear separation between backend and client.

| Layer | Technologies |
|:--|:--|
| **Backend** | Node.js, Express (REST API), Socket.IO (real-time messaging), SQLite via better-sqlite3, bcryptjs (password hashing) |
| **Frontend** | React 19, Vite 6, TypeScript, Tailwind CSS, Motion (animations), Lucide React (icons), socket.io-client |
| **Cryptography** | Web Crypto API: ECDH P-256 (key agreement), AES-256-GCM (encryption), ephemeral keys per message (forward secrecy) |
| **Client storage** | IndexedDB (local message history); server stores only ciphertext and user/friend data |

The backend is API-only. The **CipherChat** React application serves as the client and communicates with the server over HTTP and WebSockets (HTTPS/WSS in production).

### 2.3 How It Will Work

- **User registration and authentication.** Users sign up with a username and password. Credentials are stored securely using industry-standard hashing. Authentication is required before accessing the chat.

- **Key generation and exchange.** Each client generates a public/private key pair. Public keys are registered or exchanged via the server; private keys remain on the device. For each conversation, a shared secret is derived (e.g. using Elliptic Curve Diffie–Hellman) so that only the two participants can derive the same key.

- **End-to-end encryption.** Before sending, the client encrypts each message using the shared secret with a symmetric algorithm (AES). The ciphertext is sent to the server and forwarded to the recipient. The server never has the decryption key.

- **Decryption on receipt.** The recipient's client uses its private key and the agreed key-exchange data to derive the same shared secret and decrypt the message. Decryption happens only on the client.

- **Secure channel and integrity.** Communication with the server uses TLS (HTTPS/WSS). Message authentication (e.g. AEAD) ensures that messages are not tampered with in transit.

### 2.4 Functional Features

1. **User registration.** Create an account with username and password; store only a hashed password.
2. **User login / logout.** Authenticate and manage session; logout clears local session and keys as appropriate.
3. **Public key registration.** After login, the client generates or loads a key pair and uploads the public key to the server (the private key is never sent).
4. **Contact / user discovery.** Search or list users by username and retrieve their public keys for E2E setup.
5. **Key agreement (E2E).** Establish a shared secret with another user using their public key (e.g. ECDH) so that only both clients can derive the same key.
6. **Send encrypted message.** Encrypt the message with the shared secret (e.g. AES), send ciphertext (and any required nonce/IV) to the server for delivery.
7. **Receive and decrypt message.** Receive ciphertext from the server, derive the same shared secret on the recipient side, decrypt, and display plaintext.
8. **One-to-one chat.** A dedicated channel between two users with persistent E2E encryption for that conversation.
9. **Message history (client-side).** Store decrypted messages locally for the session; the server may store only ciphertext.
10. **Session and key management.** Handle login session and optionally lock or clear keys on logout or after inactivity.


## 3. Plan of Work (5 Weeks)

### 3.1 Milestones

| Week | Milestone | Description |
|:--:|:--|:--|
| 1 | Requirements and design | Finalise the functional list, architecture (client–server, key flow), and technology stack. |
| 2 | Auth and key foundation | Implement user registration, login/logout, and public key generation and registration. |
| 3 | Key agreement and crypto | Implement key agreement (e.g. ECDH) and encrypt/decrypt for one-to-one chat. |
| 4 | Messaging pipeline | Implement sending encrypted messages, receiving and decrypting, and the one-to-one chat channel. |
| 5 | Integration and hardening | Integrate all features, client-side message history and session handling, and basic testing and documentation. |

### 3.2 Team Contributions

All functional features listed in Section 2 are implemented by the team. User interface, visual design, database design, and testing are carried out in support of these features.

| | |
|:--|:--|
| **Team** | Zeerak Shahzad (22K-4692), Moiz Ahmed Khan (22K-4795) |
| **Responsibilities** | User registration; login/logout; public key registration; contact and user discovery; E2E key agreement; sending encrypted messages; receiving and decrypting messages; one-to-one chat; message history and session/key management. Supporting work includes database schema for users and public keys, API endpoints for auth and key storage, server-side message relay, WebSocket API, and UI for login, registration, contacts, and chat. |


## 4. References

All references are provided with hyperlinks for quick access to the primary sources.

| # | Reference | Link |
|:--:|:--|:--|
| 1 | Signal Protocol Specification (Signal Foundation) | [signal.org/docs](https://signal.org/docs/) |
| 2 | Messaging Layer Security (MLS), IETF | [datatracker.ietf.org/wg/mls](https://datatracker.ietf.org/wg/mls/about/) |
| 3 | SubtleCrypto – Web Crypto API (MDN) | [developer.mozilla.org/.../SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) |
| 4 | NIST SP 800-56A Rev. 3 – Key establishment | [csrc.nist.gov/.../800-56a/rev-3](https://csrc.nist.gov/publications/detail/sp/800-56a/rev-3/final) |
| 5 | NIST SP 800-57 Part 1 – Key management | [csrc.nist.gov/.../800-57-part-1](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) |
| 6 | OWASP Cryptographic Storage Cheat Sheet | [cheatsheetseries.owasp.org/.../Cryptographic_Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html) |
| 7 | RFC 8446 – TLS 1.3 (IETF) | [rfc-editor.org/rfc/rfc8446](https://www.rfc-editor.org/rfc/rfc8446) |
| 8 | OWASP Password Storage Cheat Sheet | [cheatsheetseries.owasp.org/.../Password_Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) |
