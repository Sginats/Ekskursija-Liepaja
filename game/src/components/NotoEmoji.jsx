/**
 * NotoEmoji
 *
 * Renders an animated emoji using the Google Noto Emoji Animation CDN.
 * URL format: https://fonts.gstatic.com/s/e/notoemoji/latest/{codepoint}/512.gif
 *
 * Falls back to the plain text emoji if the image fails to load.
 *
 * Usage:
 *   <NotoEmoji emoji="🌊" size={32} />
 *   <NotoEmoji emoji="⭐" size={20} style={{ marginRight: 6 }} />
 */
import { useState } from 'react';

const NOTO_BASE = 'https://fonts.gstatic.com/s/e/notoemoji/latest';

/**
 * Convert an emoji string to the underscore-joined hex codepoint string
 * that the Noto CDN expects.  Variation selectors (fe0f) are stripped.
 */
function toCodepoint(emoji) {
  return [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(cp => cp !== 'fe0f')
    .join('_');
}

export default function NotoEmoji({ emoji, size = 24, alt, style, className }) {
  const [errored, setErrored] = useState(false);
  const cp  = toCodepoint(emoji);
  const src = `${NOTO_BASE}/${cp}/512.gif`;

  if (errored) {
    // Graceful fallback: render plain text emoji at the requested size
    return (
      <span
        className={className}
        style={{ fontSize: size, display: 'inline-block', verticalAlign: 'middle', ...style }}
        aria-label={alt ?? emoji}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? emoji}
      width={size}
      height={size}
      className={className}
      style={{
        display:       'inline-block',
        verticalAlign: 'middle',
        flexShrink:    0,
        ...style,
      }}
      onError={() => setErrored(true)}
    />
  );
}
