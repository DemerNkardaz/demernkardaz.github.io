import { defineConfig } from 'unocss';
import { handler as h } from '@unocss/preset-mini/utils';

function fluidRem(px: number, base: number = 16): string {
  return `${px / base}rem`;
}

function normalizeDec(s: string): number {
  return Number(s.replace('_', '.'));
}

function shift(x: number = 0, y: number = 0) {
  const parts: string[] = [];
  if (x !== 0) parts.push(`translateX(${fluidRem(x)})`);
  if (y !== 0) parts.push(`translateY(${fluidRem(y)})`);
  return parts.join(' ') || 'translate(0, 0)';
}

const NUM = '-?[\\d._]+';

export default defineConfig({
  rules: [
    [
      /^text-shadow(?:-(.+))?$/,
      ([, s], { theme }) => {
        const v = theme.textShadow?.[s || 'DEFAULT'];
        if (v != null) {
          return { 'text-shadow': Array.isArray(v) ? v.join(', ') : v };
        }

        const raw = h.bracket.cssvar.global(s);
        if (!raw) return;

        const fluid = raw.replace(/(-?\d+(?:\.\d+)?)px/g, (_, n) => `${fluidRem(Number(n))}`);
        return { 'text-shadow': fluid };
      },
    ],
    // ─── Positioning ───────────────────────────────────────────
    [/^top-(-?[\d._]+)px$/, ([, d]) => ({ top: fluidRem(normalizeDec(d)) })],
    [/^bottom-(-?[\d._]+)px$/, ([, d]) => ({ bottom: fluidRem(normalizeDec(d)) })],
    [/^left-(-?[\d._]+)px$/, ([, d]) => ({ left: fluidRem(normalizeDec(d)) })],
    [/^right-(-?[\d._]+)px$/, ([, d]) => ({ right: fluidRem(normalizeDec(d)) })],

    [/^top-(-?[\d._]+)[%p]$/, ([, d]) => ({ top: `${normalizeDec(d)}%` })],
    [/^bottom-(-?[\d._]+)[%p]$/, ([, d]) => ({ bottom: `${normalizeDec(d)}%` })],
    [/^left-(-?[\d._]+)[%p]$/, ([, d]) => ({ left: `${normalizeDec(d)}%` })],
    [/^right-(-?[\d._]+)[%p]$/, ([, d]) => ({ right: `${normalizeDec(d)}%` })],

    [/^inset-(-?[\d._]+)px$/, ([, d]) => ({ inset: fluidRem(normalizeDec(d)) })],
    [
      /^inset-x-(-?[\d._]+)px$/,
      ([, d]) => ({ left: fluidRem(normalizeDec(d)), right: fluidRem(normalizeDec(d)) }),
    ],
    [
      /^inset-y-(-?[\d._]+)px$/,
      ([, d]) => ({ top: fluidRem(normalizeDec(d)), bottom: fluidRem(normalizeDec(d)) }),
    ],

    [/^inset-x-(\d+)[%p]$/, ([, d]) => ({ 'inset-inline': `${d}%` })],
    [/^inset-y-(\d+)[%p]$/, ([, d]) => ({ 'inset-block': `${d}%` })],
    ['inset-x-center', { 'inset-inline-start': '50%', transform: 'translateX(-50%)' }],
    ['inset-y-center', { 'inset-block-start': '50%', transform: 'translateY(-50%)' }],
    [
      /^inset-x-([\d._]+)[%p]-translate-([\d._]+)[%p]$/,
      ([, d, e]) => ({
        'inset-inline-start': `${normalizeDec(d)}%`,
        transform: `translateX(-${normalizeDec(e)}%)`,
      }),
    ],
    [
      /^inset-y-([\d._]+)[%p]-translate-([\d._]+)[%p]$/,
      ([, d, e]) => ({
        'inset-block-start': `${normalizeDec(d)}%`,
        transform: `translateY(-${normalizeDec(e)}%)`,
      }),
    ],

    [
      /^shift-x-center-(-?[\d._]+)px$/,
      ([, val]) => {
        const offset = fluidRem(normalizeDec(val));
        return {
          'inset-inline-start': `50%`,
          transform: `translateX(calc(-50% + ${offset}))`,
        };
      },
    ],
    [
      /^shift-y-center-(-?[\d._]+)px$/,
      ([, val]) => {
        const offset = fluidRem(normalizeDec(val));
        return {
          'inset-block-start': `50%`,
          transform: `translateY(calc(-50% + ${offset}))`,
        };
      },
    ],

    [/^shift-x-(-?[\d._]+)px$/, ([, d]) => ({ transform: shift(normalizeDec(d)) })],
    [/^shift-y-(-?[\d._]+)px$/, ([, d]) => ({ transform: shift(0, normalizeDec(d)) })],

    // ─── Sizing ────────────────────────────────────────────────
    [/^w-(-?[\d._]+)px$/, ([, d]) => ({ width: fluidRem(normalizeDec(d)) })],
    [/^h-(-?[\d._]+)px$/, ([, d]) => ({ height: fluidRem(normalizeDec(d)) })],
    [/^w-(-?[\d._]+)[%p]$/, ([, d]) => ({ width: `${normalizeDec(d)}%` })],
    [/^h-(-?[\d._]+)[%p]$/, ([, d]) => ({ height: `${normalizeDec(d)}%` })],
    [
      /^wh-(-?[\d._]+)px$/,
      ([, d]) => ({ width: fluidRem(normalizeDec(d)), height: fluidRem(normalizeDec(d)) }),
    ],
    [
      /^wh-(-?[\d._]+)[%p]$/,
      ([, d]) => ({ width: `${normalizeDec(d)}%`, height: `${normalizeDec(d)}%` }),
    ],
    [
      /^h-\[calc\((.+)\)\]$/,
      ([, expr]) => {
        const converted = expr
          .replace(/(-?[\d.]+)(px|pt)/g, (_, n, unit) =>
            unit === 'px' ? fluidRem(Number(n)) : fluidRem(Number(n), 12)
          )
          .replace(/([+\-])/g, ' $1 ')
          .replace(/\s+/g, ' ')
          .trim();
        return { height: `calc(${converted})` };
      },
    ],
    [
      /^w-\[calc\((.+)\)\]$/,
      ([, expr]) => {
        const converted = expr
          .replace(/(-?[\d.]+)(px|pt)/g, (_, n, unit) =>
            unit === 'px' ? fluidRem(Number(n)) : fluidRem(Number(n), 12)
          )
          .replace(/([+\-])/g, ' $1 ')
          .replace(/\s+/g, ' ')
          .trim();
        return { width: `calc(${converted})` };
      },
    ],

    [
      /^size-(-?[\d._]+)px$/,
      ([, d]) => ({ width: fluidRem(normalizeDec(d)), height: fluidRem(normalizeDec(d)) }),
    ],
    [/^min-w-(-?[\d._]+)px$/, ([, d]) => ({ 'min-width': fluidRem(normalizeDec(d)) })],
    [/^max-w-(-?[\d._]+)px$/, ([, d]) => ({ 'max-width': fluidRem(normalizeDec(d)) })],
    [/^min-h-(-?[\d._]+)px$/, ([, d]) => ({ 'min-height': fluidRem(normalizeDec(d)) })],
    [/^max-h-(-?[\d._]+)px$/, ([, d]) => ({ 'max-height': fluidRem(normalizeDec(d)) })],

    // ─── Margin ────────────────────────────────────────────────
    [/^m-(-?[\d._]+)px$/, ([, d]) => ({ margin: fluidRem(normalizeDec(d)) })],
    [
      /^mx-(-?[\d._]+)px$/,
      ([, d]) => ({
        'margin-left': fluidRem(normalizeDec(d)),
        'margin-right': fluidRem(normalizeDec(d)),
      }),
    ],
    [
      /^my-(-?[\d._]+)px$/,
      ([, d]) => ({
        'margin-top': fluidRem(normalizeDec(d)),
        'margin-bottom': fluidRem(normalizeDec(d)),
      }),
    ],
    [/^mt-(-?[\d._]+)px$/, ([, d]) => ({ 'margin-top': fluidRem(normalizeDec(d)) })],
    [/^mb-(-?[\d._]+)px$/, ([, d]) => ({ 'margin-bottom': fluidRem(normalizeDec(d)) })],
    [/^ml-(-?[\d._]+)px$/, ([, d]) => ({ 'margin-left': fluidRem(normalizeDec(d)) })],
    [/^mr-(-?[\d._]+)px$/, ([, d]) => ({ 'margin-right': fluidRem(normalizeDec(d)) })],

    // ─── Padding ───────────────────────────────────────────────
    [/^p-(-?[\d._]+)px$/, ([, d]) => ({ padding: fluidRem(normalizeDec(d)) })],
    [
      /^px-(-?[\d._]+)px$/,
      ([, d]) => ({
        'padding-left': fluidRem(normalizeDec(d)),
        'padding-right': fluidRem(normalizeDec(d)),
      }),
    ],
    [
      /^py-(-?[\d._]+)px$/,
      ([, d]) => ({
        'padding-top': fluidRem(normalizeDec(d)),
        'padding-bottom': fluidRem(normalizeDec(d)),
      }),
    ],
    [/^pt-(-?[\d._]+)px$/, ([, d]) => ({ 'padding-top': fluidRem(normalizeDec(d)) })],
    [/^pb-(-?[\d._]+)px$/, ([, d]) => ({ 'padding-bottom': fluidRem(normalizeDec(d)) })],
    [/^pl-(-?[\d._]+)px$/, ([, d]) => ({ 'padding-left': fluidRem(normalizeDec(d)) })],
    [/^pr-(-?[\d._]+)px$/, ([, d]) => ({ 'padding-right': fluidRem(normalizeDec(d)) })],

    // ─── Typography ────────────────────────────────────────────
    [/^text-(-?[\d._]+)px$/, ([, d]) => ({ 'font-size': fluidRem(normalizeDec(d)) })],
    [/^leading-(-?[\d._]+)px$/, ([, d]) => ({ 'line-height': fluidRem(normalizeDec(d)) })],
    [/^tracking-(-?[\d._]+)px$/, ([, d]) => ({ 'letter-spacing': fluidRem(normalizeDec(d)) })],
    [/^indent-(-?[\d._]+)px$/, ([, d]) => ({ 'text-indent': fluidRem(normalizeDec(d)) })],
    [/^word-spacing-(-?[\d._]+)px$/, ([, d]) => ({ 'word-spacing': fluidRem(normalizeDec(d)) })],

    // ─── Border ────────────────────────────────────────────────
    [/^border-(-?[\d._]+)px$/, ([, d]) => ({ 'border-width': fluidRem(normalizeDec(d)) })],
    [/^border-t-(-?[\d._]+)px$/, ([, d]) => ({ 'border-top-width': fluidRem(normalizeDec(d)) })],
    [/^border-b-(-?[\d._]+)px$/, ([, d]) => ({ 'border-bottom-width': fluidRem(normalizeDec(d)) })],
    [/^border-l-(-?[\d._]+)px$/, ([, d]) => ({ 'border-left-width': fluidRem(normalizeDec(d)) })],
    [/^border-r-(-?[\d._]+)px$/, ([, d]) => ({ 'border-right-width': fluidRem(normalizeDec(d)) })],
    [/^rounded-(-?[\d._]+)px$/, ([, d]) => ({ 'border-radius': fluidRem(normalizeDec(d)) })],
    [
      /^rounded-tl-(-?[\d._]+)px$/,
      ([, d]) => ({ 'border-top-left-radius': fluidRem(normalizeDec(d)) }),
    ],
    [
      /^rounded-tr-(-?[\d._]+)px$/,
      ([, d]) => ({ 'border-top-right-radius': fluidRem(normalizeDec(d)) }),
    ],
    [
      /^rounded-bl-(-?[\d._]+)px$/,
      ([, d]) => ({ 'border-bottom-left-radius': fluidRem(normalizeDec(d)) }),
    ],
    [
      /^rounded-br-(-?[\d._]+)px$/,
      ([, d]) => ({ 'border-bottom-right-radius': fluidRem(normalizeDec(d)) }),
    ],
    [
      /^rounded-t-(-?[\d._]+)px$/,
      ([, d]) => ({
        'border-top-left-radius': fluidRem(normalizeDec(d)),
        'border-top-right-radius': fluidRem(normalizeDec(d)),
      }),
    ],
    [
      /^rounded-b-(-?[\d._]+)px$/,
      ([, d]) => ({
        'border-bottom-left-radius': fluidRem(normalizeDec(d)),
        'border-bottom-right-radius': fluidRem(normalizeDec(d)),
      }),
    ],
    [
      /^rounded-l-(-?[\d._]+)px$/,
      ([, d]) => ({
        'border-top-left-radius': fluidRem(normalizeDec(d)),
        'border-bottom-left-radius': fluidRem(normalizeDec(d)),
      }),
    ],
    [
      /^rounded-r-(-?[\d._]+)px$/,
      ([, d]) => ({
        'border-top-right-radius': fluidRem(normalizeDec(d)),
        'border-bottom-right-radius': fluidRem(normalizeDec(d)),
      }),
    ],

    // ─── Gap / Flexbox / Grid ──────────────────────────────────
    [/^gap-(-?[\d._]+)px$/, ([, d]) => ({ gap: fluidRem(normalizeDec(d)) })],
    [/^gap-x-(-?[\d._]+)px$/, ([, d]) => ({ 'column-gap': fluidRem(normalizeDec(d)) })],
    [/^gap-y-(-?[\d._]+)px$/, ([, d]) => ({ 'row-gap': fluidRem(normalizeDec(d)) })],
    [/^basis-(-?[\d._]+)px$/, ([, d]) => ({ 'flex-basis': fluidRem(normalizeDec(d)) })],

    // ─── Effects ───────────────────────────────────────────────
    [
      /^shadow-(-?[\d._]+)px$/,
      ([, d]) => ({
        'box-shadow': `0 ${fluidRem(normalizeDec(d))} ${fluidRem(normalizeDec(d) * 2)} 0 rgb(0 0 0 / 0.1)`,
      }),
    ],
    [/^blur-(-?[\d._]+)px$/, ([, d]) => ({ filter: `blur(${fluidRem(normalizeDec(d))})` })],
    [/^outline-(-?[\d._]+)px$/, ([, d]) => ({ 'outline-width': fluidRem(normalizeDec(d)) })],
    [
      /^ring-(-?[\d._]+)px$/,
      ([, d]) => ({ 'box-shadow': `0 0 0 ${fluidRem(normalizeDec(d))} currentColor` }),
    ],

    // ─── Transform ─────────────────────────────────────────────
    [
      /^translate-x-(-?[\d._]+)px$/,
      ([, d]) => ({ transform: `translateX(${fluidRem(normalizeDec(d))})` }),
    ],
    [
      /^translate-y-(-?[\d._]+)px$/,
      ([, d]) => ({ transform: `translateY(${fluidRem(normalizeDec(d))})` }),
    ],
    [
      /^-translate-x-(-?[\d._]+)px$/,
      ([, d]) => ({ transform: `translateX(-${fluidRem(normalizeDec(d))})` }),
    ],
    [
      /^-translate-y-(-?[\d._]+)px$/,
      ([, d]) => ({ transform: `translateY(-${fluidRem(normalizeDec(d))})` }),
    ],

    [
      /^translate-x--(-?[\d._]+)[%p]$/,
      ([, d]) => ({ transform: `translateX(-${normalizeDec(d)}%)` }),
    ],
    [
      /^translate-y--(-?[\d._]+)[%p]$/,
      ([, d]) => ({ transform: `translateY(-${normalizeDec(d)}%)` }),
    ],

    // ─── Columns / Scroll ──────────────────────────────────────
    [/^columns-(-?[\d._]+)px$/, ([, d]) => ({ columns: fluidRem(normalizeDec(d)) })],
    [/^scroll-m-(-?[\d._]+)px$/, ([, d]) => ({ 'scroll-margin': fluidRem(normalizeDec(d)) })],
    [/^scroll-p-(-?[\d._]+)px$/, ([, d]) => ({ 'scroll-padding': fluidRem(normalizeDec(d)) })],

    //

    [/^mask-\[(.+)\]$/, ([, v]) => ({ mask: v.replace(/_/g, ' ') })],
    [/^mask-composite-\[(.+)\]$/, ([, v]) => ({ 'mask-composite': v.replace(/_/g, ' ') })],
  ],
});
