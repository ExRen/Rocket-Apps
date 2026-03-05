import dayjs from 'dayjs';
import 'dayjs/locale/id';
dayjs.locale('id');

export const formatDate = (date: string | Date) => dayjs(date).format('DD MMM YYYY');
export const formatDateTime = (date: string | Date) => dayjs(date).format('DD MMM YYYY HH:mm');
export const isDatePast = (date: string | Date) => dayjs(date).isBefore(dayjs());
export const daysUntil = (date: string | Date) => dayjs(date).diff(dayjs(), 'day');
