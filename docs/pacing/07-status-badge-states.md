# Status Badge State Machine
1. `!isSet`: "No Exam Date" (Neutral badge)
2. `isToday`: "🔥 Exam Day!" (Accent badge, targets all remaining items)
3. `daysRemaining === 1`: "⏳ 1 Day Left (Tomorrow)" (Accent badge)
4. `daysRemaining > 1`: "⏳ X Days Left" (Success badge)
5. `isPast`: "Exam Passed" (Neutral badge, prompt to pick new date)
