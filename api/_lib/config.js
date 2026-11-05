// Club settings shared by every API route. The website reads these through /api/availability,
// so changing them here changes the booking page and the dashboard together.

// How many courts can be booked at the same hour.
export const COURTS = Number(process.env.COURTS || 1);

// Bookable start times (each session is 60 minutes). Matches the club's booking sheet:
// 9:00AM to 12:00MN, with no 11:00AM slot.
export const TIMES = (process.env.BOOKING_TIMES ||
  '09:00,10:00,12:00,13:00,14:00,15:00,16:00,17:00,18:00,19:00,20:00,21:00,22:00,23:00')
  .split(',').map((t) => t.trim()).filter(Boolean);

// How many days ahead guests can book (today counts as day 1).
export const BOOKING_DAYS = Number(process.env.BOOKING_DAYS || 14);

// Most upcoming requests one contact number may hold at once (stops spam).
export const MAX_ACTIVE_PER_CONTACT = Number(process.env.MAX_ACTIVE_PER_CONTACT || 3);

export const FORMATS = ['Doubles · 4 players', 'Singles · 2 players', 'Clinic', 'Event / shoot'];
export const SOURCES = ['Website', 'Messenger', 'Walk-in', 'Phone', 'Staff'];
// booking = a group renting the court · openplay = the club's open play session (drop-in)
export const KINDS = ['booking', 'openplay'];
export const STATUSES = ['pending', 'approved', 'declined', 'cancelled'];

// All dates are the club's local dates.
export const TIMEZONE = 'Asia/Manila';
