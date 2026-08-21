import { icon, type Icon } from 'leaflet';

function textColorFor(colorHex: string): string {
  const r = parseInt(colorHex.substring(0, 2), 16);
  const g = parseInt(colorHex.substring(2, 4), 16);
  const b = parseInt(colorHex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

/**
 * Builds a teardrop map pin labeled with one or two characters, as an
 * inline SVG data URI. Adapted from buildPinIcon in
 * https://github.com/carpiediem/game-of-thrones-map/pull/6, which itself
 * replaced the discontinued chart.googleapis.com Dynamic Icons API.
 */
export function buildPinIcon(label: string, colorHex: string): Icon {
  const hex = colorHex.replace('#', '');
  const textColor = textColorFor(hex);
  // Two-character labels (e.g. position index 10+) need a smaller font to
  // fit inside the same pin width as a single character.
  const fontSize = label.length > 1 ? 10 : 12;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="37" viewBox="0 0 24 37">' +
    `<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 25 12 25s12-16 12-25C24 5.4 18.6 0 12 0z" fill="#${hex}" stroke="#000000" stroke-width="1.5"/>` +
    `<text x="12" y="13" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}">${label}</text>` +
    '</svg>';

  return icon({
    iconUrl: 'data:image/svg+xml,' + encodeURIComponent(svg),
    iconSize: [24, 37],
    iconAnchor: [12, 37],
  });
}
