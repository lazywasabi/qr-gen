---
name: promptpay-qr
description: Maintain PromptPay QR generation for the qr-gen static web app. Use when changing PromptPay payload construction, Thai mobile or citizen/tax ID validation, amount normalization, QR filename rules, URL prefill behavior for PromptPay, EMV TLV ordering, CRC-16/CCITT-FALSE logic, or PromptPay payment-spec documentation.
---

# PromptPay QR

Use this skill for PromptPay-specific payment behavior in this repository. Keep general QR text/URL behavior in the app docs unless it affects PromptPay mode.

## Workflow

1. Read `references/promptpay-emv.md` before editing PromptPay payload, validation, or QR download/share behavior.
2. Preserve the current app's EMV TLV order unless a spec-driven change explicitly requires a different order.
3. Keep visible UI text in Thai and keep implementation in `app.js` unless the project structure changes.
4. Test at least one valid Thai mobile-number payload and one valid 13-digit citizen/tax ID payload after changing PromptPay logic.
5. If possible, scan in a Thai banking app in a safe, non-production context and confirm the displayed recipient and amount.

## Implementation Notes

- PromptPay remains the default QR mode.
- Omit the amount tag when the payer should enter the amount in their banking app.
- Use `qr-promptpay-[id].png` for PromptPay without amount and `qr-promptpay-[id]-[amount].png` for PromptPay with amount.
- Update this skill when supported PromptPay identifiers, URL parameters, amount behavior, EMV fields, or CRC rules change.

