// Shared parsing for `?from=YYYY-MM-DD&to=YYYY-MM-DD` on the "all logs" endpoints.
// Dates are plain YYYY-MM-DD strings (same format stored in the logs), so lexicographic
// comparison in MongoDB matches chronological order and uses the {user, date} index.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;
const DEFAULT_RANGE_DAYS = 120; // used when the client sends no range (legacy clients)

const isValidDate = (str) => {
  if (typeof str !== 'string' || !DATE_RE.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

const toDay = (str) => {
  const [y, m, d] = str.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

const fromDay = (day) => new Date(day * 86400000).toISOString().slice(0, 10);

/**
 * Returns { from, to } (inclusive) or { error } with a user-facing message.
 * - both given: validated and capped to MAX_RANGE_DAYS
 * - only `from`: up to MAX_RANGE_DAYS after it
 * - only `to`: MAX_RANGE_DAYS before it
 * - none: the last DEFAULT_RANGE_DAYS days
 */
const parseDateRange = (query, now = new Date()) => {
  const { from, to } = query || {};

  if (from !== undefined && !isValidDate(from)) return { error: 'Tham số from phải có dạng YYYY-MM-DD hợp lệ' };
  if (to !== undefined && !isValidDate(to)) return { error: 'Tham số to phải có dạng YYYY-MM-DD hợp lệ' };

  const today = Math.floor(now.getTime() / 86400000);

  let fromDayNum;
  let toDayNum;
  if (from !== undefined && to !== undefined) {
    fromDayNum = toDay(from);
    toDayNum = toDay(to);
  } else if (from !== undefined) {
    fromDayNum = toDay(from);
    toDayNum = fromDayNum + MAX_RANGE_DAYS - 1;
  } else if (to !== undefined) {
    toDayNum = toDay(to);
    fromDayNum = toDayNum - (MAX_RANGE_DAYS - 1);
  } else {
    toDayNum = today + 1; // +1 so a client timezone ahead of UTC still sees "today"
    fromDayNum = toDayNum - DEFAULT_RANGE_DAYS;
  }

  if (fromDayNum > toDayNum) return { error: 'from phải nhỏ hơn hoặc bằng to' };
  if (toDayNum - fromDayNum + 1 > MAX_RANGE_DAYS) {
    return { error: `Khoảng ngày tối đa là ${MAX_RANGE_DAYS} ngày` };
  }

  return { from: fromDay(fromDayNum), to: fromDay(toDayNum) };
};

module.exports = { parseDateRange, isValidDate, MAX_RANGE_DAYS, DEFAULT_RANGE_DAYS };
