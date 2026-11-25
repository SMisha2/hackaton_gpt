const form = document.querySelector("#problemForm");
const descriptionField = document.querySelector("#description");
const charCount = document.querySelector("#charCount");
const resultEmpty = document.querySelector("#resultEmpty");
const resultContent = document.querySelector("#resultContent");
const resultStatus = document.querySelector("#resultStatus");
const documentText = document.querySelector("#documentText");
const planEmpty = document.querySelector("#planEmpty");
const planContent = document.querySelector("#planContent");
const planList = document.querySelector("#planList");
const progressBar = document.querySelector("#progressBar");
const progressText = document.querySelector("#progressText");
const toast = document.querySelector("#toast");
const aiModeToggle = document.querySelector("#aiModeToggle");
const aiModeChip = document.querySelector("#aiModeChip");
const aiModeText = document.querySelector("#aiModeText");
const aiConsentNote = document.querySelector("#aiConsentNote");
const reviewBox = document.querySelector("#reviewBox");
const reviewList = document.querySelector("#reviewList");
const printSheet = document.querySelector("#printSheet");
let toastTimer;
let aiAvailable = false;

const categoryData = {
  housing: {
    title: "ЖКХ и содержание дома",
    subject: "о проверке качества жилищно-коммунальных услуг",
    recipient: "управляющую организацию",
    ask: ["Организовать проверку изложенных обстоятельств и, при необходимости, составить акт осмотра.", "Принять меры для устранения выявленной проблемы и сообщить о планируемых сроках.", "Предоставить письменный ответ о результатах проверки и принятых мерах."],
    plans: [
      ["Зафиксируйте проблему", "Сделайте фотографии или видео, запишите даты и время. Для температуры, протечки или другой измеримой проблемы сохраните результаты замеров, если они есть."],
      ["Найдите ответственного", "Проверьте квитанцию или договор управления: там обычно указана управляющая организация и её контакты."],
      ["Передайте обращение", "Направьте заявление через официальную приёмную, ГИС ЖКХ или лично. Попросите подтвердить регистрацию."],
      ["Сохраните подтверждение", "Запишите номер обращения и дату подачи. Сохраните копию заявления и приложенные материалы."]
    ]
  },
  shop: {
    title: "Покупки и услуги",
    subject: "о проверке качества товара или оказанной услуги",
    recipient: "продавца / исполнителя услуги",
    ask: ["Рассмотреть изложенные обстоятельства и проверить документы по покупке или заказу.", "Сообщить о доступном способе урегулирования ситуации с учётом заявленных требований.", "Направить письменный ответ по результатам рассмотрения обращения."],
    plans: [
      ["Соберите подтверждения покупки", "Подготовьте чек, электронный заказ, гарантийные документы и переписку. Если чека нет, сохраните другие подтверждения покупки."],
      ["Зафиксируйте недостаток", "Сделайте фото или видео товара либо результата услуги. Кратко запишите, когда и при каких условиях обнаружилась проблема."],
      ["Обратитесь к продавцу", "Направьте письменную претензию продавцу или исполнителю и сохраните подтверждение передачи."],
      ["Сохраните ответ", "Запишите дату обращения, регистрационный номер и полученный ответ. При необходимости уточните дальнейший порядок защиты прав потребителя."]
    ]
  },
  work: {
    title: "Трудовые отношения",
    subject: "о рассмотрении вопроса, связанного с трудовыми отношениями",
    recipient: "работодателя / уполномоченного представителя организации",
    ask: ["Проверить изложенные обстоятельства и относящиеся к ним документы.", "Сообщить о принятом решении и действиях, необходимых для урегулирования ситуации.", "Предоставить письменный ответ по существу поставленных вопросов."],
    plans: [
      ["Соберите документы", "Сохраните трудовой договор, расчётные листки, графики, приказы и переписку, относящиеся к ситуации."],
      ["Запишите хронологию", "Отметьте даты событий, имена участников и конкретные договорённости. Отделите подтверждённые факты от предположений."],
      ["Подайте письменное обращение", "Направьте его работодателю или в кадровую службу способом, который подтверждает получение."],
      ["Зафиксируйте результат", "Сохраните копию обращения и ответ. Если вопрос не урегулирован, уточните порядок обращения в компетентную трудовую инспекцию или другой уполномоченный орган."]
    ]
  },
  municipal: {
    title: "Городская и общественная инфраструктура",
    subject: "о проверке состояния объекта городской инфраструктуры",
    recipient: "администрацию муниципального образования / ответственную службу",
    ask: ["Проверить состояние указанного объекта или территории.", "Определить ответственную службу и, при наличии оснований, организовать необходимые работы.", "Сообщить о результатах проверки и предполагаемых сроках решения вопроса."],
    plans: [
      ["Уточните место", "Запишите адрес, ближайший ориентир или участок улицы. Сделайте несколько фотографий с общим видом и деталями."],
      ["Определите ответственную службу", "Проверьте официальный сайт администрации: там обычно указаны профильные подразделения и электронная приёмная."],
      ["Направьте сообщение", "Укажите точное местоположение, характер проблемы и желаемый результат. Сохраните номер регистрации."],
      ["Проверьте статус", "Сохраните дату подачи и номер обращения. При отсутствии ответа уточните статус через официальный канал."]
    ]
  },
  delivery: {
    title: "Доставка и заказ",
    subject: "о нарушении условий доставки или исполнения заказа",
    recipient: "продавца / службы доставки",
    ask: ["Проверить статус заказа и обстоятельства его исполнения.", "Сообщить о причинах возникшей ситуации и возможных способах её урегулирования.", "Предоставить письменный ответ и информацию о дальнейших действиях."],
    plans: [
      ["Найдите данные заказа", "Подготовьте номер заказа, дату оформления, подтверждение оплаты и обещанный срок доставки."],
      ["Сохраните переписку", "Сделайте скриншоты статуса заказа, сообщений и уведомлений, относящихся к проблеме."],
      ["Обратитесь в поддержку", "Направьте обращение продавцу или перевозчику через официальный канал и сохраните номер заявки."],
      ["Зафиксируйте договорённость", "Сохраните ответ, согласованные сроки и итоговое решение. При изменении сроков попросите подтвердить это письменно."]
    ]
  },
  other: {
    title: "Иная бытовая ситуация",
    subject: "о рассмотрении обращения по изложенной ситуации",
    recipient: "ответственную организацию / уполномоченному лицу",
    ask: ["Рассмотреть изложенные обстоятельства в пределах компетенции адресата.", "При необходимости провести проверку и сообщить о возможных мерах решения вопроса.", "Предоставить письменный ответ по существу обращения."],
    plans: [
      ["Зафиксируйте обстоятельства", "Составьте короткую хронологию: что произошло, где, когда и кто участвовал."],
      ["Соберите подтверждения", "Сохраните фотографии, документы, сообщения и контакты свидетелей, если они есть."],
      ["Уточните адресата", "Найдите организацию или должностное лицо, которое отвечает за этот вопрос, на официальном сайте."],
      ["Передайте обращение", "Используйте официальный канал, сохраните копию заявления, подтверждение получения и номер регистрации."]
    ]
  }
};

const phraseRules = [
  [/\b(достало|надоело|сил больше нет|невозможно терпеть)\b/gi, "ситуация продолжается и требует рассмотрения"],
  [/\b(ничего не делают|никто ничего не делает)\b/gi, "по имеющейся у меня информации, проблема пока не устранена"],
  [/\b(забили на нас|игнорят|игнорируют нас)\b/gi, "обратная связь по ранее направленным сообщениям не получена"],
  [/\b(ужасный|ужасно|кошмарный|кошмар)\b/gi, "ненадлежащий"],
  [/\b(это полный бардак|полный бардак)\b/gi, "ситуация требует проверки и упорядочения"],
  [/\b(обещали и пропали)\b/gi, "обещанный ответ или результат пока не предоставлен"],
  [/\b(разберитесь уже)\b/gi, "прошу провести проверку и сообщить о принятых мерах"]
];

function cleanText(value) {
  return value.trim().replace(/\s+/g, " ").replace(/[!?]{2,}/g, ".").replace(/[.]{2,}/g, ".");
}

function formalize(value) {
  let result = cleanText(value);
  for (const [pattern, replacement] of phraseRules) result = result.replace(pattern, replacement);
  result = result.replace(/^(короче[,:]?\s*|в общем[,:]?\s*|ну вот[,:]?\s*)/i, "");
  if (result && !/[.!?]$/.test(result)) result += ".";
  return result;
}

function capitalize(value) {
  return value ? value.charAt(0).toLocaleUpperCase("ru-RU") + value.slice(1) : value;
}

function selectedCategory() {
  return form.querySelector('input[name="category"]:checked').value;
}

function buildDocument(data) {
  const info = categoryData[data.category];
  const recipient = data.recipient || info.recipient;
  const cityLine = data.city ? "Населённый пункт: " + data.city : "";
  const whenLine = data.since ? "Период / дата: " + data.since : "";
  const desiredLine = data.desired ? "Желаемый результат: " + cleanText(data.desired) + "." : "";
  const askLines = info.ask.map((item, index) => (index + 1) + ". " + item).join("\n");
  const lines = [
    "Адресат: " + recipient,
    "от: [ФИО заявителя]",
    cityLine,
    "Контакт для ответа: [указать удобный способ связи]",
    "",
    "ОБРАЩЕНИЕ",
    info.subject,
    "",
    "Прошу рассмотреть описанную ниже ситуацию.",
    "",
    "Суть обращения",
    capitalize(formalize(data.description)),
    whenLine,
    desiredLine,
    data.previousContact ? "Ранее предпринятые действия: " + cleanText(data.previousContact) + "." : "",
    data.evidence ? "Имеющиеся подтверждения: " + cleanText(data.evidence) + "." : "",
    "",
    "В связи с изложенным прошу:",
    askLines,
    "",
    "При наличии прошу учесть приложенные материалы, подтверждающие изложенные обстоятельства.",
    "",
    "Ответ прошу направить способом, указанным в контактных данных.",
    "",
    "Приложения: [перечислить документы, фотографии или иные материалы при наличии].",
    "",
    "Дата: [дата подачи]                         Подпись: [ФИО]"
  ];
  return lines.filter((line, index) => line !== "" || (index > 0 && lines[index - 1] !== "")).join("\n");
}

function updateProgress() {
  const boxes = [...planList.querySelectorAll('input[type="checkbox"]')];
  const done = boxes.filter((box) => box.checked).length;
  const percent = boxes.length ? (done / boxes.length) * 100 : 0;
  progressBar.style.width = percent + "%";
  progressText.textContent = done + " из " + boxes.length + " выполнено";
}

function renderPlan(category, customPlan = null) {
  const items = Array.isArray(customPlan) && customPlan.length
    ? customPlan.map((item) => [item.title, item.description])
    : categoryData[category].plans;
  planList.replaceChildren();
  items.forEach(([title, description], index) => {
    const label = document.createElement("label");
    label.className = "plan-step";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("aria-label", "Отметить шаг: " + title);
    checkbox.addEventListener("change", updateProgress);
    const copy = document.createElement("span");
    copy.className = "plan-step-copy";
    const heading = document.createElement("strong");
    heading.textContent = (index + 1) + ". " + title;
    const details = document.createElement("span");
    details.textContent = description;
    copy.append(heading, details);
    label.append(checkbox, copy);
    planList.append(label);
  });
  updateProgress();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2300);
}

descriptionField.addEventListener("input", () => {
  charCount.textContent = descriptionField.value.length + " / 1800";
});

function renderReview(notes = []) {
  reviewList.replaceChildren();
  if (!Array.isArray(notes) || !notes.length) {
    reviewBox.hidden = true;
    return;
  }
  notes.slice(0, 6).forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    reviewList.append(item);
  });
  reviewBox.hidden = false;
}

async function requestAiDraft(data) {
  const response = await fetch("/api/generate", {
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

function showGeneratedResult(data, generated, mode) {
  documentText.value = generated.document;
  resultEmpty.hidden = true;
  resultContent.hidden = false;
  planEmpty.hidden = true;
  planContent.hidden = false;
  resultStatus.classList.add("is-ready");
  resultStatus.innerHTML = "<span></span> " + (mode === "ai" ? "ИИ-ЧЕРНОВИК ГОТОВ" : "ЧЕРНОВИК ГОТОВ");
  renderPlan(data.category, generated.plan);
  renderReview(generated.review_notes || []);
  document.querySelector("#resultCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = {
    category: selectedCategory(),
    recipient: cleanText(form.elements.recipient.value),
    city: cleanText(form.elements.city.value),
    description: form.elements.description.value,
    since: cleanText(form.elements.since.value),
    desired: cleanText(form.elements.desired.value),
    previousContact: cleanText(form.elements.previousContact.value),
    evidence: cleanText(form.elements.evidence.value)
  };
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButton = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = "<span>Готовим обращение…</span><span class=\"button-arrow\">…</span>";
  resultStatus.classList.remove("is-ready");
  resultStatus.innerHTML = "<span></span> ФОРМИРУЕМ ЧЕРНОВИК";

  try {
    if (aiModeToggle.checked && aiAvailable) {
      try {
        const generated = await requestAiDraft(data);
        showGeneratedResult(data, generated, "ai");
        showToast("ИИ подготовил черновик. Проверьте факты перед отправкой.");
      } catch (error) {
        showGeneratedResult(data, { document: buildDocument(data), plan: categoryData[data.category].plans.map(([title, description]) => ({ title, description })), review_notes: ["ИИ-генерация не завершилась. Использован локальный шаблон.", "Проверьте адресата, факты, даты и приложения перед отправкой."] }, "local");
        showToast(error.status === 503 ? "ИИ временно недоступен. Создан локальный черновик." : "Не удалось связаться с ИИ. Создан локальный черновик.");
      }
    } else {
      showGeneratedResult(data, {
        document: buildDocument(data),
        plan: categoryData[data.category].plans.map(([title, description]) => ({ title, description })),
        review_notes: [
          "Замените поля в квадратных скобках на свои данные.",
          "Проверьте адресата, даты и точность всех изложенных фактов.",
          "Приложите только те документы и материалы, которые действительно существуют."
        ]
      }, "local");
    }
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalButton;
  }
});

document.querySelector("#exampleButton").addEventListener("click", () => {
  form.querySelector('input[name="category"][value="housing"]').checked = true;
  form.elements.recipient.value = "Управляющая компания";
  form.elements.city.value = "Якутск";
  form.elements.description.value = "Уже третью неделю батареи еле тёплые, дома очень холодно. Звонили в управляющую компанию, но ничего не делают. Достало, невозможно терпеть. Разберитесь уже с отоплением.";
  form.elements.since.value = "с начала ноября";
  form.elements.desired.value = "Проверить отопление и восстановить нормальную подачу тепла";
  form.elements.previousContact.value = "Звонили в управляющую компанию на прошлой неделе, письменного ответа не получили";
  form.elements.evidence.value = "Фото термометра и переписка с управляющей компанией";
  charCount.textContent = descriptionField.value.length + " / 1800";
  showToast("Пример заполнен. Нажмите «Собрать обращение».");
  descriptionField.focus();
});

document.querySelector("#copyButton").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(documentText.value);
    showToast("Текст обращения скопирован");
  } catch {
    documentText.focus();
    documentText.select();
    const copied = document.execCommand("copy");
    showToast(copied ? "Текст обращения скопирован" : "Выделите текст и скопируйте вручную");
  }
});

document.querySelector("#downloadButton").addEventListener("click", () => {
  const blob = new Blob(["\uFEFF", documentText.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "obrashchenie.txt";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Файл подготовлен");
});

document.querySelector("#printButton").addEventListener("click", () => {
  printSheet.textContent = documentText.value;
  window.print();
});

aiModeToggle.addEventListener("change", () => {
  aiConsentNote.hidden = !aiModeToggle.checked;
  if (aiModeToggle.checked) {
    showToast("ИИ получит данные из формы. Не добавляйте личную информацию.");
  }
});

async function checkAiAvailability() {
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (!response.ok) return;
    const status = await response.json();
    aiAvailable = status.available === true;
  } catch {
    aiAvailable = false;
  }
  if (aiAvailable) {
    aiModeToggle.disabled = false;
    aiModeChip.textContent = "ДОСТУПЕН";
    aiModeChip.classList.add("is-ai");
    aiModeText.textContent = "Можно включить ИИ-генерацию. Передача описания провайдеру будет выполняться только после включения режима.";
  } else {
    aiModeToggle.disabled = true;
    aiModeToggle.checked = false;
    aiConsentNote.hidden = true;
    aiModeChip.textContent = "ЛОКАЛЬНО";
    aiModeText.textContent = "ИИ-сервер пока не настроен. Работает локальный генератор, данные остаются в браузере.";
  }
}

checkAiAvailability();
