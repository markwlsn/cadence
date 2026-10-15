# Daily Study Target Pacing Formulas
When `daysRemaining > 1`:
- `unmasteredCards = Math.max(0, totalCards - masteredCards)`
- `remainingQuizzes = Math.max(0, totalQuizzes - completedQuizzes)`
- `dailyCardsGoal = Math.max(1, Math.ceil(unmasteredCards / daysRemaining))`
- `dailyQuizzesGoal = Math.max(1, Math.ceil(remainingQuizzes / daysRemaining))`
Provides realistic, achievable pacing goals that adapt dynamically as cards reach mastery stability.
