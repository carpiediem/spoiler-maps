/**
 * Encodes XYZ tile coordinates as a "keyhole"-style quadtree string: a 't'
 * prefix followed by one q/r/s/t letter per zoom level, quadrant-coded as
 * q=NW, r=NE, t=SW, s=SE. This is the scheme used by, e.g., Google Maps
 * ImageMapType tile sets such as https://github.com/carpiediem/game-of-thrones-map.
 */
export function toKeyholeQuadkey(x: number, y: number, z: number): string {
  let range = Math.pow(2, z);
  let xRemaining = x;
  let yRemaining = y;
  let code = 't';

  for (let level = 0; level < z; level++) {
    range /= 2;
    if (yRemaining < range) {
      if (xRemaining < range) {
        code += 'q';
      } else {
        code += 'r';
        xRemaining -= range;
      }
    } else {
      if (xRemaining < range) {
        code += 't';
        yRemaining -= range;
      } else {
        code += 's';
        xRemaining -= range;
        yRemaining -= range;
      }
    }
  }

  return code;
}

// A keyhole quadkey token is a 't' followed by any number of q/r/s/t letters,
// and nothing else — so it never collides with ordinary path segments
// (folder names, filenames) unless those also happen to be built solely from
// those four letters.
const KEYHOLE_TOKEN_PATTERN = /^t[qrst]*$/;

/**
 * Given a full tile URL that contains one literal keyhole quadkey (e.g. a
 * real tile URL copied from a working map), finds that quadkey and replaces
 * it with a {q} placeholder so the URL can be used as a template. Returns
 * null if zero or more than one path segment looks like a quadkey, since
 * then the correct one can't be identified reliably.
 */
export function extrapolateQuadkeyTemplate(exampleUrl: string): string | null {
  const segments = exampleUrl.split(/([/.])/); // keep the delimiters
  const matchIndexes = segments
    .map((segment, index) => (KEYHOLE_TOKEN_PATTERN.test(segment) ? index : -1))
    .filter((index) => index !== -1);

  if (matchIndexes.length !== 1) {
    return null;
  }

  const templateSegments = [...segments];
  templateSegments[matchIndexes[0]] = '{q}';
  return templateSegments.join('');
}
