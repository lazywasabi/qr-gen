# PromptPay EMV Reference

This app builds PromptPay QR payloads using EMVCo QR Code Specification for Payment Systems, Merchant-Presented Mode, with Thailand's PromptPay template.

Sources:

- EMVCo QR Code overview: https://www.emvco.com/emv-technologies/qr-codes/
- Bank of Thailand Thai QR Payment Standard: https://www.bot.or.th/content/dam/bot/documents/th/our-roles/payment-systems/about-payment-systems/ThaiQRCode_Payment_Standard.pdf
- `thai-qr-payment` implementation reference: https://thai-qr-payment.js.org/th/reference/spec/
- `promptpay-qrcode` Structure Deep Dive: https://github.com/devhyphenplus/promptpay-qrcode/blob/main/docs/promptpay-qr-structure.md

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
  - sub-tag `03` e-wallet ID: 15 digits.
  - Other PromptPay identifiers exist, such as bank account, but the current app only supports mobile number, 13-digit ID, and 15-digit e-wallet ID.
- `53` Transaction Currency: `764` for Thai baht.
- `54` Transaction Amount: optional, formatted as decimal with up to 2 fractional digits; omit this tag when the amount should be entered by the payer.
- `58` Country Code: `TH`.
- `63` CRC: CRC-16/CCITT-FALSE, calculated over the payload plus `6304`, then emitted as four uppercase hex characters.
  - Parameters: Polynomial `0x1021`, Initial `0xFFFF`, No Input/Output Reflection, No Final XOR.
  - Test vector: `CRC("123456789") = 0x29B1`.

## Reference Data for Other PromptPay Layouts (Not currently implemented)

The following formats are defined under the Bank of Thailand QR standard but are not currently supported by this app:

### Tag 29 — Credit Transfer (Other Identifiers)
- sub-tag `04` bank account: up to 43 alphanumeric characters (3-digit bank code + account number).
- sub-tag `05` OTA (One-Time Authorization): 10 characters, mandatory when customer-presented AID (`A000000677010114`) is used.

### Tag 30 — Bill Payment (Merchant-Presented)
Nested template containing:
- sub-tag `00` AID: `A000000677010112` for domestic bill payment, or `A000000677012006` for cross-border bill payment.
- sub-tag `01` Biller ID: 15 digits (13-digit Tax ID + 2-digit suffix). Bank-assigned, mandatory.
- sub-tag `02` Reference 1: alphanumeric, up to 20 characters. Biller-defined customer/invoice ID, mandatory.
- sub-tag `03` Reference 2: alphanumeric, up to 20 characters. Secondary reference (e.g., branch, order ID), optional.

### Tag 31 — Payment Innovation
Nested template containing:
- sub-tag `00` AID: `A000000677012004` (official BOT API standard) or `A000000677010113` (vendor-specific KBank/KShop standard).

## Point of Initiation Method Nuances (Tag 01)

- Tag `01` signals the intent of the merchant (static `11` vs dynamic `12`).
- A dynamic QR payload (`12`) is physically reusable because it does not carry a nonce, counter, or expiry at the QR string level. Whether it is reusable in practice is determined by the bank's processing backend.
- Omit the amount tag (`54`) for static payment (`11`). A fixed amount can be used under either `11` or `12` depending on issuer compatibility (some apps, like K PLUS, have been reported to reject `12` in certain contexts).

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
- National ID / tax ID input should accept any 13 digits. Do not enforce Thai citizen ID checksum because tax IDs use the same length.
- E-wallet input should accept exactly 15 digits and emit sub-tag `03`.
- Amount should be blank or greater than 0 with no more than 2 decimal places.
- When changing QR generation code, test at least one phone-number payload, one 13-digit ID payload, and one 15-digit e-wallet payload.
