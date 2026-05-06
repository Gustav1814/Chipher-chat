/** Semi-transparent avatar fills — indigo / cyan / teal (Cipher palette) */
export function avatarColorsFor(username: string, displayName?: string | null) {
  const key = (displayName || username).toLowerCase();
  if (key.includes('dev') || key.includes('team'))
    return { bg: 'rgba(0,155,130,0.15)', color: 'rgba(0,220,185,0.72)', fs: '11px' as const };
  const h = username.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const presets = [
    { bg: 'rgba(60,65,220,0.22)', color: 'rgba(180,190,255,0.88)' },
    { bg: 'rgba(0,140,210,0.18)', color: 'rgba(140,210,255,0.80)' },
    { bg: 'rgba(0,155,130,0.18)', color: 'rgba(100,220,185,0.78)' },
    { bg: 'rgba(0,100,190,0.16)', color: 'rgba(120,195,255,0.72)' },
  ];
  return { ...presets[h % presets.length], fs: '14px' as const };
}
