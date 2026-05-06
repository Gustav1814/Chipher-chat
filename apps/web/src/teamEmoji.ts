/** Emoji prefix for team / group–style conversations (keywords on display name + username). */
const RULES: { re: RegExp; emoji: string }[] = [
  { re: /\b(dev|engineering|eng|code|build|ship)\b/i, emoji: '🛠️' },
  { re: /\b(design|creative|ux|ui)\b/i, emoji: '🎨' },
  { re: /\b(sales|revenue|biz|business)\b/i, emoji: '💼' },
  { re: /\b(support|help|success|cs)\b/i, emoji: '🎧' },
  { re: /\b(marketing|growth|mktg)\b/i, emoji: '📈' },
  { re: /\b(ops|operations|infra)\b/i, emoji: '⚙️' },
  { re: /\b(security|sec|infosec)\b/i, emoji: '🔐' },
  { re: /\b(data|analytics|bi)\b/i, emoji: '📊' },
  { re: /\b(hr|people|talent)\b/i, emoji: '🧑‍🤝‍🧑' },
  { re: /\b(team|group|squad|crew|guild|club)\b/i, emoji: '👥' },
];

export function teamEmojiFor(displayName: string | null | undefined, username: string): string | null {
  const hay = `${displayName ?? ''} ${username}`;
  for (const { re, emoji } of RULES) {
    if (re.test(hay)) return emoji;
  }
  return null;
}

export function isLikelyTeamChat(displayName: string | null | undefined, username: string): boolean {
  return teamEmojiFor(displayName, username) !== null;
}
