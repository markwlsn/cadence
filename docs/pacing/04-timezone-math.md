# Calendar Day Arithmetic Across Timezones
Function: `daysUntilExam(examDate, now, timezoneOffsetMinutes)`  
The local calendar day is determined by:
```ts
const nowLocalMs = nowDate.getTime() + timezoneOffsetMinutes * 60 * 1000;
const nowDayIndex = Math.floor(nowLocalMs / (24 * 60 * 60 * 1000));
const examDayIndex = Math.floor(Date.UTC(y, m - 1, d) / (24 * 60 * 60 * 1000));
return examDayIndex - nowDayIndex;
```
Ensures users in UTC+8 (+480m) and UTC-5 (-300m) see exact local calendar offsets without server-side skew.
