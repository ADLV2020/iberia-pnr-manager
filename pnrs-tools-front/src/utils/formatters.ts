// src/utils/formatters.ts

export const formatVisualTime = (val: string): string => {
  const clean = val.replace(/\D/g, '').slice(0, 4);
  if (clean.length > 2) return `${clean.slice(0, clean.length - 2)}:${clean.slice(clean.length - 2)}`;
  return clean;
};
