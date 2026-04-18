# CipherChat – TODO (do later)

- [ ] **Fix "?" on current user's PFP in chat**  
  In the chat window, messages you send show a "?" in the avatar circle instead of your profile picture or initial. Cause: `myAvatar` comes from `userAvatars[username]`, which isn’t set for the current user when rendering bubbles. Fix: ensure the current user’s avatar is loaded (e.g. after login or from profile) and/or use a fallback to show the first letter of `username` or `myDisplayName` instead of "?".  
  Code: `ChatWindow.tsx` → `MessageBubble` when `isMe` and `!myAvatar` (currently renders `?`).

- [ ] **Decryption errors**  
  Some received messages show "[Decryption failed]". To fix later: confirm key format (ephemeral vs long-term), normalize `fromUser` (e.g. lowercase) when looking up `sharedKeys` in the message handler, and add clearer error handling/logging.

- [ ] **Message layout**  
  Confirm layout matches requirement: your messages on the left, other person’s on the right. Adjust `MessageBubble` flex/alignment in `ChatWindow.tsx` if needed.
