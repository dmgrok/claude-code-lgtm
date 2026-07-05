---
description: Show token optimization status and recommendations
---

Check the token-optimizer preset status for this project:

1. Read `.claude/presets.lock.json` and confirm token-optimizer is installed
2. Read `.claude/settings.json` and report:
   - Current model setting (should be "opusplan")
   - Number of pre-approved permissions (reduces roundtrip tokens)
   - Hook configuration status
3. Suggest any additional optimizations based on the current setup
