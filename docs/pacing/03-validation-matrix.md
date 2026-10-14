# Exam Date Input Validation Matrix (`validateExamDate`)

| Input Scenario | Validation Rule | Status | Result / Error |
| :--- | :--- | :--- | :--- |
| `null` | Clears target exam date | 200 | `{ valid: true, date: null }` |
| `"2027-05-15"` | Valid future date | 200 | `{ valid: true, date: Date }` |
| Non-string (number/obj) | Rejected | 400 | Exam date must be an ISO date string or null |
| Empty string `""` | Rejected | 400 | Exam date cannot be empty |
| Past date (`< today`) | Rejected | 400 | Exam date cannot be in the past |
| Today's date | Accepted (Exam Day) | 200 | `{ valid: true, date: Date }` |
| Future date `> 3 years` | Rejected | 400 | Exam date cannot be more than 3 years in the future |
| Invalid format | Rejected | 400 | Invalid date format |
