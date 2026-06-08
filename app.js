const PROMPTPAY_AID = "A000000677010111";
const GENERIC_TEXT_LIMIT = 300;
const MAX_AMOUNT = 9999999.99;
const QR_PLACEHOLDER = '<div class="qr-placeholder"></div>';
const LUCIDE_BASE = "https://cdn.jsdelivr.net/npm/lucide-static@1.17.0/icons";

const ICONS = {
  check: `${LUCIDE_BASE}/check.svg`,
  pencil: `${LUCIDE_BASE}/pencil.svg`
};

const QR_TYPES = {
  promptpay: "promptpay",
  generic: "generic"
};

const THB_FORMATTER = {
  format(value) {
    const num = Number(value);
    const fractionDigits = num % 1 === 0 ? 0 : 2;
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2
    }).format(num);
  }
};

const dom = {
  panel: document.getElementById("panel"),
  form: document.getElementById("payment-form"),
  editTitle: document.getElementById("edit-title"),
  promptpayFields: document.getElementById("promptpay-fields"),
  genericFields: document.getElementById("generic-fields"),
  idInput: document.getElementById("promptpay-id"),
  amountInput: document.getElementById("amount"),
  genericTextInput: document.getElementById("generic-text"),
  errorNode: document.getElementById("error"),
  qrNode: document.getElementById("qrcode"),
  displayId: document.getElementById("display-id"),
  displayAmount: document.getElementById("display-amount"),
  displayGeneric: document.getElementById("display-generic"),
  displayFields: document.querySelector(".display-fields"),
  downloadButton: document.getElementById("download-qr"),
  shareButton: document.getElementById("share-button"),
  copyLinkButton: document.getElementById("copy-link"),
  promptpayTypeButton: document.getElementById("promptpay-type-button"),
  genericTypeButton: document.getElementById("generic-type-button"),
  modeButton: document.getElementById("mode-button"),
  modeIcon: document.getElementById("mode-icon")
};

const state = {
  currentPayload: "",
  currentShareUrl: "",
  currentQrType: QR_TYPES.promptpay,
  isEditing: false
};

function tlv(id, value) {
  return id + String(value.length).padStart(2, "0") + value;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidThaiCitizenId(digits) {
  if (!/^\d{13}$/.test(digits)) return false;

  const sum = digits
    .slice(0, 12)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  const checksum = (11 - (sum % 11)) % 10;

  return checksum === Number(digits[12]);
}

function normalizePromptPayId(rawValue) {
  const digits = onlyDigits(rawValue);

  if (/^0[689]\d{8}$/.test(digits)) {
    return {
      label: digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3"),
      type: "01",
      value: "0066" + digits.slice(1)
    };
  }

  if (isValidThaiCitizenId(digits)) {
    return {
      label: digits.replace(/(\d)(\d{4})(\d{5})(\d{2})(\d)/, "$1-$2-$3-$4-$5"),
      type: "02",
      value: digits
    };
  }

  throw new Error("หมายเลขโทรศัพท์หรือบัตรประชาชนไม่ถูกต้อง");
}

function normalizeAmount(rawValue) {
  const cleaned = String(rawValue || "").replace(/,/g, "").trim();

  if (!cleaned) return "";

  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) {
    throw new Error("จำนวนเงินต้องมากกว่า 0");
  }

  const [wholeRaw, decimalRaw = ""] = cleaned.split(".");
  const whole = (wholeRaw || "0").replace(/^0+(?=\d)/, "");
  const decimal = decimalRaw.slice(0, 2).padEnd(2, "0");
  const normalized = whole + "." + decimal;
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("จำนวนเงินต้องมากกว่า 0");
  }

  if (amount > MAX_AMOUNT) {
    throw new Error("จำนวนเงินสูงสุด 9,999,999.99 บาท");
  }

  return decimal === "00" ? whole : normalized;
}

function crc16CcittFalse(value) {
  let crc = 0xffff;

  for (let i = 0; i < value.length; i += 1) {
    crc ^= value.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildPromptPayPayload(rawId, rawAmount) {
  const target = normalizePromptPayId(rawId);
  const amount = normalizeAmount(rawAmount);
  const merchantInfo = tlv("00", PROMPTPAY_AID) + tlv(target.type, target.value);
  const data = [
    tlv("00", "01"),
    tlv("01", amount ? "12" : "11"),
    tlv("29", merchantInfo),
    tlv("58", "TH"),
    tlv("53", "764"),
    amount ? tlv("54", amount) : ""
  ].join("");
  const crc = crc16CcittFalse(data + "6304");

  return {
    amount,
    payload: data + tlv("63", crc),
    targetLabel: target.label
  };
}

function normalizeGenericText(rawValue) {
  const text = String(rawValue || "").trim();

  if (!text) {
    throw new Error("กรอกข้อความหรือ URL");
  }

  if (text.length > GENERIC_TEXT_LIMIT) {
    throw new Error("ข้อความยาวเกินไป");
  }

  return text;
}

function encodeQrText(value) {
  return unescape(encodeURIComponent(value));
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function getActiveInput() {
  return state.currentQrType === QR_TYPES.generic ? dom.genericTextInput : dom.idInput;
}

function isPromptPayMode() {
  return state.currentQrType === QR_TYPES.promptpay;
}

function getTrimmedValue(input) {
  return String(input.value || "").trim();
}

function setActionButtonsEnabled(hasImage, hasLink = hasImage) {
  dom.downloadButton.disabled = !hasImage;
  dom.shareButton.disabled = !hasImage;
  dom.copyLinkButton.disabled = !hasLink;
}

function setPromptPaySearchParams(url, options = {}) {
  const id = getTrimmedValue(dom.idInput);
  const amountRaw = getTrimmedValue(dom.amountInput);

  if (id) url.searchParams.set("id", id);
  if (!amountRaw) return;

  try {
    const amount = normalizeAmount(amountRaw);
    if (amount) url.searchParams.set("amount", amount);
  } catch (error) {
    if (options.throwOnInvalidAmount) throw error;
  }
}

function setGenericSearchParams(url) {
  const text = getTrimmedValue(dom.genericTextInput);
  if (text) url.searchParams.set("text", text);
}

function makeUrlFromInputs(options = {}) {
  const url = new URL(window.location.href);
  url.search = "";

  if (state.currentQrType === QR_TYPES.generic) {
    setGenericSearchParams(url);
  } else {
    setPromptPaySearchParams(url, options);
  }

  return url.toString();
}

function syncUrlState() {
  history.replaceState(null, "", makeUrlFromInputs());
}

function updateDisplayVisibility() {
  const promptpayMode = isPromptPayMode();
  const hasGenericText = dom.displayGeneric.textContent || dom.displayGeneric.children.length > 0;

  dom.displayId.hidden = !promptpayMode;
  dom.displayAmount.hidden = !promptpayMode;
  dom.displayGeneric.hidden = promptpayMode || !hasGenericText;
  dom.displayAmount.classList.toggle("small", promptpayMode && !dom.displayAmount.textContent);
  dom.displayFields.classList.toggle("generic-view", !promptpayMode);
}

function resetDisplay() {
  dom.displayId.textContent = "";
  dom.displayAmount.textContent = "";
  dom.displayAmount.classList.add("small");
  clearGenericDisplay();
  updateDisplayVisibility();
}

function clearPromptPayDisplay() {
  dom.displayId.textContent = "";
  dom.displayAmount.textContent = "";
  dom.displayAmount.classList.add("small");
}

function clearGenericDisplay() {
  dom.displayGeneric.replaceChildren();
  dom.displayGeneric.textContent = "";
}

function setQrType(nextType) {
  state.currentQrType = nextType;
  const promptpayMode = isPromptPayMode();

  dom.editTitle.textContent = promptpayMode ? "สร้าง QR พร้อมเพย์" : "สร้าง QR ทั่วไป";
  dom.promptpayFields.hidden = !promptpayMode;
  dom.genericFields.hidden = promptpayMode;
  dom.promptpayTypeButton.classList.toggle("is-active", promptpayMode);
  dom.genericTypeButton.classList.toggle("is-active", !promptpayMode);
  dom.promptpayTypeButton.setAttribute("aria-pressed", String(promptpayMode));
  dom.genericTypeButton.setAttribute("aria-pressed", String(!promptpayMode));
  updateDisplayVisibility();
}

function setEditing(nextValue) {
  state.isEditing = nextValue;
  dom.panel.classList.toggle("is-editing", state.isEditing);
  dom.modeIcon.src = state.isEditing ? ICONS.check : ICONS.pencil;
  dom.modeButton.setAttribute("aria-label", state.isEditing ? "บันทึก" : "แก้ไข");
  dom.modeButton.setAttribute("title", state.isEditing ? "บันทึก" : "แก้ไข");

  if (state.isEditing) {
    window.setTimeout(() => getActiveInput().focus(), 0);
  }
}

function setPlaceholder() {
  dom.qrNode.innerHTML = QR_PLACEHOLDER;
  state.currentPayload = "";
  state.currentShareUrl = "";
  resetDisplay();
  setActionButtonsEnabled(false);
  syncUrlState();
}

function renderQr(payload) {
  dom.qrNode.replaceChildren();

  if (typeof QRCode !== "function") {
    dom.qrNode.innerHTML = QR_PLACEHOLDER;
    return false;
  }

  new QRCode(dom.qrNode, {
    text: payload,
    width: 640,
    height: 640,
    colorDark: "#111827",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });

  dom.qrNode.removeAttribute("title");
  dom.qrNode.querySelectorAll("[title]").forEach((node) => node.removeAttribute("title"));

  return true;
}

function applyRenderedQr(payload, rendered) {
  state.currentPayload = payload;
  state.currentShareUrl = makeUrlFromInputs({ throwOnInvalidAmount: true });
  setActionButtonsEnabled(rendered, true);
  history.replaceState(null, "", state.currentShareUrl);
}

function updatePromptPayQr() {
  if (!getTrimmedValue(dom.idInput)) {
    setPlaceholder();
    return false;
  }

  const result = buildPromptPayPayload(dom.idInput.value, dom.amountInput.value);
  const rendered = renderQr(result.payload);

  dom.displayId.textContent = result.targetLabel;
  clearGenericDisplay();

  if (result.amount) {
    dom.displayAmount.textContent = THB_FORMATTER.format(Number(result.amount)) + " บาท";
    dom.displayAmount.classList.remove("small");
  } else {
    dom.displayAmount.textContent = "";
    dom.displayAmount.classList.add("small");
  }

  updateDisplayVisibility();
  applyRenderedQr(result.payload, rendered);
  return true;
}

function updateGenericQr() {
  if (!getTrimmedValue(dom.genericTextInput)) {
    setPlaceholder();
    return false;
  }

  const text = normalizeGenericText(dom.genericTextInput.value);
  const rendered = renderQr(encodeQrText(text));

  clearPromptPayDisplay();
  clearGenericDisplay();

  if (isHttpUrl(text)) {
    const link = document.createElement("a");
    link.href = text;
    link.textContent = text;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    dom.displayGeneric.appendChild(link);
  } else {
    dom.displayGeneric.textContent = text;
  }

  updateDisplayVisibility();
  applyRenderedQr(text, rendered);
  return true;
}

function updateQr() {
  dom.errorNode.textContent = "";
  syncUrlState();

  try {
    return state.currentQrType === QR_TYPES.generic ? updateGenericQr() : updatePromptPayQr();
  } catch (error) {
    setPlaceholder();
    dom.errorNode.textContent = error.message;
    return false;
  }
}

function commitAmount() {
  dom.amountInput.value = normalizeAmount(dom.amountInput.value);
}

let copyTimeout;

async function copyLink() {
  if (!state.currentShareUrl) return;

  try {
    await navigator.clipboard.writeText(state.currentShareUrl);
  } catch (error) {
    const helper = document.createElement("textarea");
    helper.value = state.currentShareUrl;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }

  const icon = dom.copyLinkButton.querySelector("img");
  if (icon) {
    if (copyTimeout) clearTimeout(copyTimeout);
    const originalSrc = `${LUCIDE_BASE}/link.svg`;
    icon.src = ICONS.check;
    copyTimeout = window.setTimeout(() => {
      icon.src = originalSrc;
      copyTimeout = null;
    }, 1500);
  }
}

async function fallbackShareLink() {
  if (!state.currentShareUrl) return;

  if (navigator.share) {
    try {
      await navigator.share({ url: state.currentShareUrl });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }

  await copyLink();
}

function makeQrFilename() {
  if (state.currentQrType === QR_TYPES.generic) {
    return "qr-code.png";
  }

  const id = onlyDigits(dom.idInput.value) || "qr";
  const amount = normalizeAmount(dom.amountInput.value);
  return amount ? `qr-promptpay-${id}-${amount}.png` : `qr-promptpay-${id}.png`;
}

function getQrCanvasBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

async function shareQr() {
  if (!state.currentPayload || !state.currentShareUrl) return;

  const canvas = dom.qrNode.querySelector("canvas");
  if (canvas && navigator.share && navigator.canShare) {
    const blob = await getQrCanvasBlob(canvas);

    if (!blob) {
      await fallbackShareLink();
      return;
    }

    try {
      const file = new File([blob], makeQrFilename(), { type: "image/png" });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: state.currentQrType === QR_TYPES.generic ? "QR Code" : "PromptPay QR Code",
          text: state.currentQrType === QR_TYPES.generic ? "QR Code ทั่วไป" : "QR Code สแกนจ่ายพร้อมเพย์"
        });
        return;
      }
    } catch (error) {
      console.error("QR image share failed:", error);
    }
  }

  await fallbackShareLink();
}

function downloadQr() {
  if (!state.currentPayload) return;

  const canvas = dom.qrNode.querySelector("canvas");
  const image = dom.qrNode.querySelector("img");
  const link = document.createElement("a");
  link.download = makeQrFilename();

  if (canvas) {
    link.href = canvas.toDataURL("image/png");
  } else if (image) {
    link.href = image.src;
  } else {
    return;
  }

  link.click();
}

function prefillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const amount = params.get("amount");
  const text = params.get("text");
  const hasPrefill = text !== null || id !== null;

  if (text !== null) {
    dom.genericTextInput.value = text;
    setQrType(QR_TYPES.generic);
  } else {
    if (id !== null) dom.idInput.value = id;
    if (amount !== null) dom.amountInput.value = amount;
    setQrType(QR_TYPES.promptpay);
  }

  setEditing(!hasPrefill);
  if (!updateQr()) {
    setEditing(true);
  }
}

function finishEditing() {
  if (state.isEditing && updateQr()) {
    commitAmount();
    setEditing(false);
  }
}

function bindEvents() {
  dom.form.addEventListener("submit", (event) => {
    event.preventDefault();
    finishEditing();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !state.isEditing || event.isComposing) return;
    if (event.target === dom.genericTextInput) return;
    event.preventDefault();
    finishEditing();
  });

  dom.idInput.addEventListener("input", updateQr);
  dom.amountInput.addEventListener("input", updateQr);
  dom.genericTextInput.addEventListener("input", updateQr);
  dom.downloadButton.addEventListener("click", downloadQr);
  dom.copyLinkButton.addEventListener("click", copyLink);
  dom.shareButton.addEventListener("click", shareQr);
  dom.promptpayTypeButton.addEventListener("click", () => {
    setQrType(QR_TYPES.promptpay);
    updateQr();
  });
  dom.genericTypeButton.addEventListener("click", () => {
    setQrType(QR_TYPES.generic);
    updateQr();
  });
  dom.modeButton.addEventListener("click", () => {
    const isValid = updateQr();
    if (state.isEditing && isValid) commitAmount();
    setEditing(state.isEditing ? !isValid : true);
  });
}

bindEvents();
updateDisplayVisibility();
prefillFromUrl();
