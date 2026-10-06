# Login V7 — focused integrated QA

Executed: 2026-09-24T18:31:35.860Z. Revision: c96844a14af1fc2975f9321c803083e948f15d2a. URL: http://127.0.0.1:4430.

Result: 95 pass, 0 fail, 0 skip, 0 block.

Both real login UIs, demo-profile API, credential submission and logout through the local gateway and identity service. No API interception or fabricated sessions. Existing synthetic demo users only. Initial layout and axe at four viewport sizes per login.

No production deployment, external messages, payment effects, data edits, full portal regression, persistence write/recovery test, physical mobile, Safari or Windows validation. A green run does not establish aesthetic acceptance or comprehensive accessibility/security.

| View | Scroll / viewport width | Document height | Heading size | Form / demos width | Axe violations |
| --- | --- | --- | --- | --- | --- |
| desktop-1366-hospital | 1366 / 1366 | 768 | 36px | 420 / 420 | 0 |
| desktop-1366-company | 1366 / 1366 | 768 | 36px | 420 / 420 | 0 |
| desktop-1440-hospital | 1440 / 1440 | 900 | 36px | 420 / 420 | 0 |
| desktop-1440-company | 1440 / 1440 | 900 | 36px | 420 / 420 | 0 |
| mobile-390-hospital | 390 / 390 | 844 | 34px | 350 / 350 | 0 |
| mobile-390-company | 390 / 390 | 844 | 34px | 350 / 350 | 0 |
| narrow-320-hospital | 320 / 320 | 768 | 32px | 288 / 288 | 0 |
| narrow-320-company | 320 / 320 | 740 | 32px | 288 / 288 | 0 |

Each view has initial viewport/full screenshots and sanitized axe results. review.json contains exact geometry, request outcomes and all checks. Credentials and bearer tokens are not stored.


`QA_BASE_URL=http://127.0.0.1:4430 node qa/login-layout-review.mjs`
