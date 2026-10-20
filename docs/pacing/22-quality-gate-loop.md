# Quality Gate R-01 Automated Validation Loop
- Evaluates longest common subsequence (LCS) overlap between back text and source chunk.
- If overlap exceeds 55%, rejection trigger fires.
- Supervisor generates corrective retry prompt with identified issues. Max 2 attempts before graceful heuristic fallback.
