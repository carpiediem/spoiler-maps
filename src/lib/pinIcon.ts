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

/**
 * Builds a standalone skull marker (no pin/teardrop shape) for a
 * CharacterPosition marked dead, as an inline SVG data URI — not a "☠" text
 * glyph, which renders inconsistently (colored emoji, missing-glyph box, or
 * nothing) depending on the platform's font/emoji support. The linework is
 * "ionicons-v5-l"'s skull-outline icon (see public/icons/skull.svg, from
 * https://www.svgrepo.com/svg/522543/skull-outline), inlined here (rather
 * than referenced by URL) for the same bundler-simplicity reason as
 * buildPinIcon above; a white fill sits behind the outline so it reads
 * clearly against the map underneath it.
 */
export function buildSkullIcon(): Icon {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512">' +
    '<path d="M448,225.64v99a64,64,0,0,1-40.23,59.42l-23.68,9.47A32,32,0,0,0,364.6,417l-10,50.14A16,16,0,0,1,338.88,480H173.12a16,16,0,0,1-15.69-12.86L147.4,417a32,32,0,0,0-19.49-23.44l-23.68-9.47A64,64,0,0,1,64,324.67V224C64,118.08,149.77,32.19,255.65,32S448,119.85,448,225.64Z" fill="#ffffff" stroke="#000000" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/>' +
    '<circle cx="168" cy="280" r="40" fill="none" stroke="#000000" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/>' +
    '<circle cx="344" cy="280" r="40" fill="none" stroke="#000000" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/>' +
    '<polygon points="256 336 240 384 272 384 256 336" fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>' +
    '<line x1="256" y1="448" x2="256" y2="480" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>' +
    '<line x1="208" y1="448" x2="208" y2="480" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>' +
    '<line x1="304" y1="448" x2="304" y2="480" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>' +
    '</svg>';

  return icon({
    iconUrl: 'data:image/svg+xml,' + encodeURIComponent(svg),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}
