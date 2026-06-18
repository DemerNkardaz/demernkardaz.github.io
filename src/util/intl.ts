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
