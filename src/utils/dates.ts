/**
 * Receives a date in string "dd/mm/yyyy" format, parse and return a `Date` object
 * @param date a "dd/mm/yyyy" formatted string date
 */
export function getDateFromString(date: string): Date {
  const parts = date.split('/')
  return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10), parseInt(parts[0], 10))
}

/**
 * Returns difference/distance between two dates in days
 * It returns a negative value is first date is newer than the second one
 */
export function getDurationBetweenDates(d1: Date, d2: Date): number {
  const diffTime = d2.getTime() - d1.getTime()
  return Math.ceil(diffTime / 86400000) // -> (1000 * 60 * 60 * 24)
}

/**
 * Transforms the received date into string dd/mm/yyyy format
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  let month = (1 + date.getMonth()).toString()
  month = month.length > 1 ? month : '0' + month
  let day = date.getDate().toString()
  day = day.length > 1 ? day : '0' + day
  return day + '/' + month + '/' + year
}
