/**
 * Formats a UTC date as YYYY-MM-DD.
 */
export const formatLocalDate = (dateObj) => {
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns { weekStartDate, weekDates: [Mon..Sun], todayIndex: 0..6, todayDate }
 */
export const getCurrentWeekContext = (referenceDate = new Date()) => {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(referenceDate);
  const year = Number(dateParts.find((part) => part.type === 'year').value);
  const month = Number(dateParts.find((part) => part.type === 'month').value);
  const day = Number(dateParts.find((part) => part.type === 'day').value);
  const current = new Date(Date.UTC(year, month - 1, day));

  // Convert UTC getDay() (Sun=0..Sat=6) to Monday-first index (Mon=0..Sun=6)
  const todayIndex = (current.getUTCDay() + 6) % 7;

  const monday = new Date(current);
  monday.setUTCDate(current.getUTCDate() - todayIndex);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    weekDates.push(formatLocalDate(d));
  }

  return {
    weekStartDate: weekDates[0],
    weekDates,
    todayIndex,
    todayDate: weekDates[todayIndex],
  };
};