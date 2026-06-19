import { locale } from '@/i18n';

const dateLocalizer = new Intl.DateTimeFormat(locale, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  timeZoneName: 'short',
});

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  return dateLocalizer.format(date);
}

export function formatNumber(number: number): string {
  return new Intl.NumberFormat(locale).format(number);
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [
    h &&
      new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'hour',
        unitDisplay: 'short',
      }).format(h),

    m &&
      new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'minute',
        unitDisplay: 'short',
      }).format(m),

    s &&
      new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'second',
        unitDisplay: 'short',
      }).format(s),
  ]
    .filter(Boolean)
    .join(' ');
}
