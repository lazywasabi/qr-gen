# PromptPay EMV Reference

This app builds PromptPay QR payloads using EMVCo QR Code Specification for Payment Systems, Merchant-Presented Mode, with Thailand's PromptPay template.

Sources:

- EMVCo QR Code overview: https://www.emvco.com/emv-technologies/qr-codes/
- Bank of Thailand Thai QR Payment Standard: https://www.bot.or.th/content/dam/bot/documents/th/our-roles/payment-systems/about-payment-systems/ThaiQRCode_Payment_Standard.pdf
- `thai-qr-payment` implementation reference: https://thai-qr-payment.js.org/th/reference/spec/

## Payload Rules

- Root payload uses EMV TLV: two-digit tag, two-digit length, then value.
- `00` Payload Format Indicator: `01`.
- `01` Point of Initiation Method:
  - `11` for static QR when amount is omitted.
  - `12` for dynamic QR when amount is included.
- `29` Merchant Account Information for PromptPay credit transfer.
- Under tag `29`:
  - sub-tag `00` AID: `A000000677010111` for standard merchant-presented PromptPay.
  - sub-tag `01` mobile number: 13 digits in `0066XXXXXXXXX` form, converted from a Thai `0XXXXXXXXX` mobile number.
  - sub-tag `02` national ID / tax ID: 13 digits.
  - Other PromptPay identifiers exist, such as e-wallet and bank account, but the current app only supports mobile number and 13-digit ID.
- `53` Transaction Currency: `764` for Thai baht.
- `54` Transaction Amount: optional, formatted as decimal with up to 2 fractional digits; omit this tag when the amount should be entered by the payer.
- `58` Country Code: `TH`.
- `63` CRC: CRC-16/CCITT-FALSE, calculated over the payload plus `6304`, then emitted as four uppercase hex characters.

## Current App Ordering

`app.js` currently emits root fields in this order:

1. `00` Payload Format Indicator
2. `01` Point of Initiation Method
3. `29` Merchant Account Information
4. `58` Country Code
5. `53` Transaction Currency
6. `54` Transaction Amount, only when present
7. `63` CRC

Preserve this order for compatibility unless a spec-driven change requires otherwise.

## Validation Expectations

- Phone input should normalize only a valid Thai mobile number pattern: 10 digits beginning with `06`, `08`, or `09`.
- National ID / tax ID input should accept exactly 13 digits and pass the Thai citizen ID checksum.
- Amount should be blank or greater than 0 with no more than 2 decimal places.
- When changing QR generation code, test at least one phone-number payload and one 13-digit ID payload.

