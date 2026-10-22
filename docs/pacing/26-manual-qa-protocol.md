# 5-Step Manual QA Verification Protocol
1. **Default State**: Open `/decks/deck-bio-101`, verify "No Exam Date" label.
2. **Quick Set Persistence**: Click "1 Week", verify saving indicator and server persistence after browser refresh.
3. **Past Date Rejection**: Pick yesterday's date, verify red inline error message without console exceptions.
4. **Clear Action**: Click "Clear", verify date resets to null on server.
5. **LocalStorage Migration**: Set legacy key in DevTools, reload, verify migration and key removal.
