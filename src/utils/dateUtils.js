const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const normalizeDateOfBirth = (value) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;

    return formatDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
  }

  if (typeof value !== "string") return null;

  const normalized = value.trim();
  let year;
  let month;
  let day;
  let match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);

  if (match) {
    [, year, month, day] = match;
  } else {
    match = normalized.match(/^(\d{1,2})([./-])(\d{1,2})\2(\d{4})$/);

    if (match) {
      [, day, , month, year] = match;
    } else {
      match = normalized.match(/^(\d{1,2})[- ]([a-z]{3,9})[- ](\d{4})$/i);

      if (!match) return null;

      const monthName = match[2].slice(0, 3).toLowerCase();
      month = MONTHS[monthName];

      if (!month) return null;

      [, day, , year] = match;
    }
  }

  return formatDate(Number(year), Number(month), Number(day));
};

const formatDate = (year, month, day) => {
  if (!Number.isInteger(year) || year < 1) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

module.exports = { normalizeDateOfBirth };
