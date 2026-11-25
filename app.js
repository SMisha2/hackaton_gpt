import { categoryData, buildLocalResult, cleanText } from "./lib/generator.js";

const $ = (selector) => document.querySelector(selector);
const form = $("#problemForm");
const description = $("#description");
const charCount = $("#charCount");
const resultEmpty = $("#resultEmpty");
const resultReady = $("#resultReady");
const resultStatus = $("#resultStatus");
const documentText = $("#documentText");
const planList = $("#planList");
const progressBar = $("#progressBar");
const progressText = $("#progressText");
const planFinish = $("#planFinish");
const reviewBox = $("#reviewBox");
const reviewList = $("#reviewList");
const aiModeToggle = $("#aiModeToggle");
const aiConsent = $("#aiConsent");
const aiConsentPanel = $("#aiConsentPanel");
const aiModeChip = $("#aiModeChip");
const aiModeText = $("#aiModeText");
const generateButton = $("#generateButton");
const printSheet = $("#printSheet");
const toast = $("#toast");

let aiAvailable = false;
let toastTimer = 0;
let installPrompt = null;
let currentCategory = "housing";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function getFormData() {
  return {
    category: form.querySelector('input[name="category"]:checked')?.value || "other",
    description: description.value,
    recipient: cleanText(form.elements.recipient.value),
    city: cleanText(form.elements.city.value),
    since: cleanText(form.elements.since.value),
    desired: cleanText(form.elements.desired.value),
    previousContact: cleanText(form.elements.previousContact.value),
    evidence: cleanText(form.elements.evidence.value)
  };
}

function updateCounter() {
  charCount.textContent = description.value.length.toLocaleString("ru-RU") + " / 1800";
  description.setCustomValidity(description.value.trim() ? "" : "Опишите ситуацию несколькими словами.");
}

function updateCategory() {
  currentCategory = getFormData().category;
  const hints = {
    housing: ["Когда началось?", "Что уже пробовали?", "Чем мешает?"],
    shop: ["Когда купили?", "Что не так с товаром?", "Как хотите решить?"],
    work: ["Когда возникла проблема?", "К кому обращались?", "Какой результат нужен?"],
    municipal: ["Где именно?", "Когда заметили?", "Что требуется сделать?"],
    delivery: ["Когда обещали доставить?", "Что показывает статус?", "Куда уже обращались?"],
    other: ["Когда началось?", "Кто уже знает об этом?", "Какого результата ждёте?"]
  };
  const prompts = $("#quickPrompts");
  prompts.replaceChildren();
  hints[currentCategory].forEach((hint) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = hint;
    button.addEventListener("click", () => appendPrompt(hint.replace("?", "")));
    prompts.append(button);
  });
  const placeholder = {
    housing: "Например: батареи уже две недели еле тёплые, дома холодно. Звонил в управляющую компанию, но ничего не изменилось.",
    shop: "Например: купил наушники неделю назад, один перестал работать. В магазине отправляют в сервис и не объясняют, что делать.",
    work: "Например: зарплату задерживают уже несколько недель. Писал руководителю, но точной даты выплаты так и не назвали.",
    municipal: "Например: возле дома большая яма на тротуаре, её не огородили. Напишите, как попросить ответственную службу проверить участок.",
    delivery: "Например: заказ обещали привезти три дня назад. В приложении статус не меняется, поддержка не отвечает.",
    other: "Расскажите, что произошло, когда это началось, к кому вы уже обращались и какого результата хотите."
  };
  description.placeholder = placeholder[currentCategory];
}

function appendPrompt(text) {
  const separator = description.value.trim() ? " " : "";
  description.value += separator + text + ": ";
  description.focus();
  description.setSelectionRange(description.value.length, description.value.length);
  updateCounter();
}

function renderPlan(items) {
  planList.replaceChildren();
  items.forEach((item, index) => {
    const label = document.createElement("label");
    label.className = "plan-step";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("aria-label", "Выполнено: " + item.title);
    checkbox.addEventListener("change", updateProgress);
    const copy = document.createElement("span");
    copy.className = "plan-step-copy";
    const title = document.createElement("strong");
    title.textContent = (index + 1) + ". " + item.title;
    const details = document.createElement("span");
    details.textContent = item.description;
    copy.append(title, details);
    label.append(checkbox, copy);
    planList.append(label);
  });
  $("#planCount").textContent = String(items.length);
  updateProgress();
}

function updateProgress() {
  const boxes = [...planList.querySelectorAll('input[type="checkbox"]')];
  const done = boxes.filter((box) => box.checked).length;
  const total = boxes.length;
  progressBar.style.width = (total ? done / total * 100 : 0) + "%";
  progressText.textContent = done + " из " + total;
  planFinish.hidden = done !== total || total === 0;
}

function renderReview(notes) {
  reviewList.replaceChildren();
  (Array.isArray(notes) ? notes : []).slice(0, 6).forEach((note) => {
    const li = document.createElement("li");
    li.textContent = note;
    reviewList.append(li);
  });
  reviewBox.hidden = reviewList.childElementCount === 0;
}

function selectTab(name) {
  document.querySelectorAll(".result-tab").forEach((button) => {
    const active = button.dataset.tab === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  $("#documentPanel").hidden = name !== "document";
  $("#planPanel").hidden = name !== "plan";
}

function updateDocumentStats() {
  const text = documentText.value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  $("#documentWords").textContent = words + " слов";
}

function showGeneratedResult(result, mode) {
  documentText.value = result.document;
  updateDocumentStats();
  renderPlan(result.plan);
  renderReview(result.review_notes);
  resultEmpty.hidden = true;
  resultReady.hidden = false;
  resultStatus.classList.add("is-ready");
  resultStatus.innerHTML = "<i></i> " + (mode === "ai" ? "ПОДГОТОВЛЕНО С ИИ" : "ЧЕРНОВИК ГОТОВ");
  selectTab("document");
  $("#resultCard").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

async function requestAiDraft(data) {
  const endpoint = new URL("api/generate", document.baseURI);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ consent: true, ...data })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "AI_REQUEST_FAILED");
    error.status = response.status;
    throw error;
  }
  if (!payload || typeof payload.document !== "string" || !Array.isArray(payload.plan)) {
    throw new Error("INVALID_AI_RESPONSE");
  }
  return payload;
}

async function handleGenerate(event) {
  event.preventDefault();
  updateCounter();
  if (!form.reportValidity()) return;
  const data = getFormData();
  if (!data.description.trim()) {
    description.focus();
    showToast("Добавьте хотя бы пару предложений о ситуации.");
    return;
  }
  if (aiModeToggle.checked && !aiConsent.checked) {
    aiConsent.focus();
    showToast("Подтвердите передачу текста ИИ-провайдеру или выключите ИИ.");
    return;
  }

  const original = generateButton.innerHTML;
  generateButton.disabled = true;
  generateButton.innerHTML = '<span class="generate-label">Готовим ваш документ…</span><span class="generate-arrow">…</span>';
  resultStatus.classList.remove("is-ready");
  resultStatus.innerHTML = "<i></i> СОБИРАЕМ РЕЗУЛЬТАТ";

  try {
    if (aiModeToggle.checked && aiAvailable) {
      try {
        const generated = await requestAiDraft(data);
        showGeneratedResult(generated, "ai");
        showToast("Черновик готов. Проверьте даты, факты и адресата.");
      } catch (error) {
        const fallback = buildLocalResult(data);
        fallback.review_notes.unshift("ИИ не ответил. Ниже показан локальный шаблонный черновик.");
        showGeneratedResult(fallback, "local");
        showToast(error.status === 503 ? "ИИ не настроен. Подготовлен локальный черновик." : "ИИ временно недоступен. Подготовлен локальный черновик.");
      }
    } else {
      showGeneratedResult(buildLocalResult(data), "local");
      showToast("Готово. Теперь проверьте черновик и план действий.");
    }
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = original;
  }
}

function setAiAvailability(available) {
  aiAvailable = available;
  aiModeToggle.disabled = !available;
  if (!available) {
    aiModeToggle.checked = false;
    aiConsent.checked = false;
    aiConsentPanel.hidden = true;
    aiModeChip.textContent = "Локальный редактор";
    aiModeText.textContent = "Переформулирует текст по категории прямо в браузере, без отправки на сервер.";
  } else {
    aiModeChip.textContent = "Доступен на сервере";
    aiModeText.textContent = "ИИ может лучше понять контекст и подготовить персональный план.";
  }
}

async function checkAiAvailability() {
  try {
    const endpoint = new URL("api/status", document.baseURI);
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) return setAiAvailability(false);
    const status = await response.json();
    setAiAvailability(status.available === true);
  } catch {
    setAiAvailability(false);
  }
}

function loadExample(category = "housing") {
  const examples = {
    housing: {
      recipient: "Управляющая компания",
      city: "Якутск",
      description: "Уже третью неделю батареи еле тёплые, дома очень холодно. Звонили в управляющую компанию, но ничего не меняется. Достало, невозможно терпеть. Разберитесь уже с отоплением.",
      since: "С начала ноября",
      desired: "Проверить отопление и восстановить нормальную подачу тепла",
      previousContact: "Звонили в управляющую компанию на прошлой неделе, письменного ответа не получили",
      evidence: "Фото термометра и переписка с управляющей компанией"
    },
    shop: {
      recipient: "Магазин, в котором приобретён товар",
      city: "",
      description: "Купил наушники, через несколько дней один перестал работать. В магазине сказали, что ничем не могут помочь. Хочу, чтобы проверили товар и объяснили, как решить вопрос.",
      since: "На прошлой неделе",
      desired: "Проверить товар и предложить решение в рамках правил покупки",
      previousContact: "Обращался к продавцу устно",
      evidence: "Электронный чек и фотографии товара"
    },
    work: {
      recipient: "Работодатель",
      city: "",
      description: "Зарплату задерживают, а точную дату выплаты никто не называет. Я уже писал руководителю, но ответа по срокам не получил. Хочу получить понятное объяснение ситуации.",
      since: "С конца прошлого месяца",
      desired: "Получить разъяснение по срокам выплаты",
      previousContact: "Писал руководителю в рабочем чате",
      evidence: "Переписка и расчётный листок"
    },
    municipal: {
      recipient: "Администрация муниципального образования",
      city: "Якутск",
      description: "Возле нашего дома большая яма на тротуаре. Люди обходят её по проезжей части, а ограждения нет. Прошу проверить этот участок и сообщить, какие меры планируется принять.",
      since: "Заметили несколько дней назад",
      desired: "Проверить участок и организовать необходимые меры безопасности",
      previousContact: "",
      evidence: "Фотографии участка"
    },
    delivery: {
      recipient: "Продавец и служба доставки",
      city: "",
      description: "Заказ обещали привезти три дня назад, но он так и не приехал. В приложении статус не меняется, поддержка не отвечает. Хочу узнать, где заказ и когда будет решение.",
      since: "Три дня назад",
      desired: "Получить информацию о заказе и согласовать дальнейшие действия",
      previousContact: "Писал в чат поддержки",
      evidence: "Номер заказа и скриншоты статуса"
    }
  };
  const data = examples[category] || examples.housing;
  form.querySelector('input[name="category"][value="' + category + '"]').checked = true;
  for (const [key, value] of Object.entries(data)) form.elements[key].value = value;
  updateCategory();
  updateCounter();
  $("#detailsPanel").open = true;
  description.focus();
  showToast("Пример загружен. Измените его под свою ситуацию.");
}

function clearAll() {
  form.reset();
  aiConsent.checked = false;
  aiConsentPanel.hidden = true;
  description.setCustomValidity("");
  updateCounter();
  updateCategory();
  resultReady.hidden = true;
  resultEmpty.hidden = false;
  resultStatus.classList.remove("is-ready");
  resultStatus.innerHTML = "<i></i> ОЖИДАЕТ ДАННЫХ";
  documentText.value = "";
  planList.replaceChildren();
  reviewBox.hidden = true;
  planFinish.hidden = true;
  progressBar.style.width = "0%";
  progressText.textContent = "0 из 0";
  selectTab("document");
  showToast("Форма и результат очищены.");
}

async function copyDocument() {
  try {
    await navigator.clipboard.writeText(documentText.value);
    showToast("Текст скопирован.");
  } catch {
    documentText.focus();
    documentText.select();
    const success = document.execCommand("copy");
    showToast(success ? "Текст скопирован." : "Выделите текст и скопируйте вручную.");
  }
}

function downloadDocument() {
  const blob = new Blob(["\uFEFF", documentText.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "obrashchenie-" + new Date().toISOString().slice(0, 10) + ".txt";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Файл подготовлен.");
}

function updateTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("bureau-theme", theme);
  const dark = theme === "dark";
  $("#themeToggle").querySelector(".theme-icon").textContent = dark ? "☼" : "◐";
  $("#themeToggle").setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
  document.querySelector('meta[name="theme-color"]').content = dark ? "#151815" : "#f5f5f0";
}

function registerPwa() {
  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    const url = new URL("service-worker.js", document.baseURI);
    navigator.serviceWorker.register(url).catch(() => {});
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    $("#installButton").hidden = false;
  });
  $("#installButton").addEventListener("click", async () => {
    if (!installPrompt) {
      showToast("Откройте меню браузера и выберите «Установить приложение».");
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $("#installButton").hidden = true;
  });
}

form.addEventListener("submit", handleGenerate);
description.addEventListener("input", updateCounter);
form.querySelectorAll('input[name="category"]').forEach((radio) => radio.addEventListener("change", updateCategory));

$("#loadExample").addEventListener("click", () => loadExample(currentCategory));
$("#clearButton")?.addEventListener("click", clearAll);
$("#copyButton").addEventListener("click", copyDocument);
$("#downloadButton").addEventListener("click", downloadDocument);
$("#printButton").addEventListener("click", () => {
  printSheet.textContent = documentText.value;
  window.print();
});
documentText.addEventListener("input", updateDocumentStats);
document.querySelectorAll(".result-tab").forEach((button) => button.addEventListener("click", () => selectTab(button.dataset.tab)));

aiModeToggle.addEventListener("change", () => {
  aiConsentPanel.hidden = !aiModeToggle.checked;
  aiConsent.checked = false;
  if (aiModeToggle.checked) showToast("Подтвердите согласие перед отправкой текста ИИ.");
});

$("#themeToggle").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  updateTheme(next);
});

$("#quickPrompts").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-prompt]");
  if (button) appendPrompt(button.dataset.prompt);
});

window.addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  $("#scrollProgress").style.width = (max > 0 ? window.scrollY / max * 100 : 0) + "%";
}, { passive: true });

try {
  const savedTheme = localStorage.getItem("bureau-theme");
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  updateTheme(savedTheme || preferred);
} catch {
  updateTheme("light");
}

updateCounter();
updateCategory();
checkAiAvailability();
registerPwa();
