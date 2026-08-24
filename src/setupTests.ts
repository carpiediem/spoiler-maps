import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom doesn't implement the layout APIs ProseMirror (Tiptap's editing
// engine, used by the description editor) needs to translate a mouse/
// selection event into a document position — without these, any real
// interaction with the editor throws.
document.elementFromPoint = () => null;
Range.prototype.getClientRects = () => ({ item: () => null, length: 0 }) as unknown as DOMRectList;
Range.prototype.getBoundingClientRect = () =>
  ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 }) as DOMRect;
