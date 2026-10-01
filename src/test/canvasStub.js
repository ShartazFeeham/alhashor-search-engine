import { vi } from 'vitest';

// A canvas context that records what is drawn. Text is as wide as half its font size per character.
export function stubContext() {
  const texts = [];
  const rects = [];
  const ctx = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillRect: vi.fn((...args) => rects.push(args)),
    measureText: (text) => ({ width: text.length * parseFloat(/(\d+(?:\.\d+)?)px/.exec(ctx.font)[1]) * 0.5 }),
    fillText: vi.fn((text, x, y) =>
      texts.push({ text, x, y, font: ctx.font, fillStyle: ctx.fillStyle, textAlign: ctx.textAlign, alpha: ctx.globalAlpha })
    ),
  };
  return { ctx, texts, rects };
}

// jsdom has no canvas: getContext returns this recording context, and toBlob hands back a PNG blob.
export function stubCanvas() {
  const stub = stubContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(stub.ctx);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function toBlob(callback, type = 'image/png') {
    callback(new Blob(['png'], { type }));
  });
  return stub;
}
