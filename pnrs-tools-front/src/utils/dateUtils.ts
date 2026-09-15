// src/utils/dateUtils.ts

export const formatDateToIso = (ddmmaaaa: string): string => {
  if (!ddmmaaaa || ddmmaaaa.length !== 8) return '';
  const day = ddmmaaaa.substring(0, 2);
  const month = ddmmaaaa.substring(2, 4);
  const year = ddmmaaaa.substring(4, 8);
  return `${year}-${month}-${day}`;
};

export const formatDateToDdmmaaaa = (isoDate: string): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}${month}${year}`;
};

export const isFutureDate = (ddmmaaaa: string): boolean => {
  if (!ddmmaaaa || ddmmaaaa.length !== 8) return false;
  const day = parseInt(ddmmaaaa.substring(0, 2), 10);
  const month = parseInt(ddmmaaaa.substring(2, 4), 10) - 1;
  const year = parseInt(ddmmaaaa.substring(4, 8), 10);
  const inputDate = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate >= today;
};
