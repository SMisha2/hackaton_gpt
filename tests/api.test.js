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

test("replaces emotional phrases with neutral wording", () => {
  const result = formalize("Достало, ничего не делают, разберитесь уже.");
  assert.match(result, /обеспокоенность/i);
  assert.match(result, /проблема не устранена/i);
  assert.match(result, /прошу проверить обстоятельства/i);
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
