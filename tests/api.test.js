import test from "node:test";
import assert from "node:assert/strict";
import { categoryData, buildLocalResult, cleanText, formalize } from "../lib/generator.js";
import { validatePayload, normalizeGeneratedResult, consumeRateLimit } from "../api/generate.js";

const validPayload = {
  consent: true,
  category: "housing",
  description: "В квартире уже несколько дней не работает отопление.",
  recipient: "Управляющая компания",
  city: "Якутск",
  since: "с 20 ноября",
  desired: "Проверить отопление",
  previousContact: "Звонили диспетчеру",
  evidence: "Фото термометра"
};

test("all six supported categories have useful plans and requests", () => {
  assert.equal(Object.keys(categoryData).length, 6);
  for (const [key, value] of Object.entries(categoryData)) {
    assert.ok(value.ask.length >= 3, key + " should have requests");
    assert.ok(value.plans.length >= 3, key + " should have a plan");
  }
});

test("normalizes whitespace without changing the meaning", () => {
  assert.equal(cleanText("  Уже   неделю   нет воды. "), "Уже неделю нет воды.");
});

test("removes emotional filler while preserving the underlying problem", () => {
  const result = formalize("Достало, ничего не делают, разберитесь уже.");
  assert.match(result, /проблема до настоящего времени не устранена/i);
  assert.doesNotMatch(result, /достало|разберитесь/i);
});

test("creates a structured local document and a usable action plan", () => {
  const result = buildLocalResult({
    category: "housing",
    description: "Батареи уже две недели еле тёплые, дома холодно.",
    city: "Якутск",
    since: "с 10 ноября",
    desired: "Восстановить отопление",
    previousContact: "Звонили диспетчеру",
    evidence: "Фото термометра"
  });
  assert.match(result.document, /Адресат:/);
  assert.match(result.document, /Суть обращения/);
  assert.match(result.document, /Ранее предпринятые действия/);
  assert.equal(result.plan.length, 4);
  assert.equal(result.plan[0].title, "Зафиксируйте температуру");
  assert.ok(result.review_notes.length >= 2);
});

test("rewrites a housing complaint into a formal narrative instead of copying it", () => {
  const original = "Уже третью неделю батареи еле тёплые, дома очень холодно. Звонили в управляющую компанию, но ничего не меняется. Достало, невозможно терпеть. Разберитесь уже с отоплением.";
  const result = buildLocalResult({ category: "housing", description: original });
  const body = result.document.split("Суть обращения\n")[1];
  assert.match(body, /Сообщаю о следующей ситуации/);
  assert.match(body, /батареи нагреваются недостаточно/i);
  assert.match(body, /температура в помещении остаётся низкой/i);
  assert.match(body, /ранее по данному вопросу обращались по телефону в управляющую компанию/i);
  assert.match(body, /однако проблема до настоящего времени не устранена/i);
  assert.match(body, /Желаемый результат: Проверить обстоятельства, связанные с отоплением/i);
  assert.doesNotMatch(body, /достало|еле тёплые|дома очень холодно|разберитесь уже/i);
  assert.notEqual(body.trim(), original);
});

test("rephrases purchase and delivery details with category-specific language", () => {
  const shop = buildLocalResult({
    category: "shop",
    description: "Купил наушники, через несколько дней один перестал работать. В магазине отправляют в сервис."
  });
  assert.match(shop.document, /после приобретения наушников один из них перестал функционировать/i);
  assert.match(shop.document, /один из наушников перестал функционировать/i);
  assert.match(shop.document, /предлагают обратиться в сервисный центр/i);
  assert.match(shop.document, /функционировать\. В магазине/i);

  const delivery = buildLocalResult({
    category: "delivery",
    description: "Заказ задержали, курьер не приехал."
  });
  assert.match(delivery.document, /срок доставки заказа нарушен/i);
  assert.match(delivery.document, /курьер не прибыл/i);
});

test("adds targeted steps for other categories", () => {
  const result = buildLocalResult({
    category: "delivery",
    description: "Заказ задержали, курьер не приехал."
  });
  assert.equal(result.plan[0].title, "Сохраните обещанный срок");
});

test("does not invent recipient, evidence or dates", () => {
  const result = buildLocalResult({ category: "other", description: "Не знаю, что делать." });
  assert.match(result.document, /Ответственная организация/);
  assert.ok(result.review_notes.some((note) => note.includes("точное название организации")));
  assert.ok(result.review_notes.some((note) => note.includes("доказательства")));
});

test("accepts a valid AI payload only when explicit consent is present", () => {
  const result = validatePayload(validPayload);
  assert.equal(result.ok, true);
  assert.equal(result.data.category, "housing");
});

test("rejects AI requests without consent or with invalid categories", () => {
  assert.equal(validatePayload({ ...validPayload, consent: false }).ok, false);
  assert.equal(validatePayload({ ...validPayload, category: "unknown" }).ok, false);
});

test("rejects empty or oversized descriptions and additional fields", () => {
  assert.equal(validatePayload({ ...validPayload, description: " " }).ok, false);
  assert.equal(validatePayload({ ...validPayload, description: "x".repeat(1801) }).ok, false);
  assert.equal(validatePayload({ ...validPayload, evidence: "x".repeat(241) }).ok, false);
});

test("validates the shape of generated AI output", () => {
  const normalized = normalizeGeneratedResult({
    document: "ОБРАЩЕНИЕ\n" + "Описание ситуации. ".repeat(8),
    plan: [
      { title: "Зафиксируйте", description: "Сохраните фото." },
      { title: "Найдите адресата", description: "Проверьте контакты." },
      { title: "Направьте", description: "Сохраните подтверждение." }
    ],
    review_notes: ["Проверьте даты.", "Заполните ФИО."]
  });
  assert.equal(normalized.plan.length, 3);
  assert.equal(normalized.review_notes.length, 2);
});

test("rejects malformed model output", () => {
  assert.throws(() => normalizeGeneratedResult({ document: "коротко", plan: [] }));
});

test("applies a per-window request limit", () => {
  const key = "test-ip-rate-limit";
  for (let index = 0; index < 8; index += 1) assert.equal(consumeRateLimit(key, 10_000), true);
  assert.equal(consumeRateLimit(key, 10_000), false);
  assert.equal(consumeRateLimit(key, 70_001), true);
});
