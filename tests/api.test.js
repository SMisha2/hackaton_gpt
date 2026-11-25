import test from "node:test";
import assert from "node:assert/strict";
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

test("accepts a valid payload only when explicit consent is present", () => {
  const result = validatePayload(validPayload);
  assert.equal(result.ok, true);
  assert.equal(result.data.category, "housing");
  assert.equal(result.data.city, "Якутск");
});

test("rejects requests without consent", () => {
  const result = validatePayload({ ...validPayload, consent: false });
  assert.equal(result.ok, false);
});

test("rejects invalid categories", () => {
  const result = validatePayload({ ...validPayload, category: "unknown" });
  assert.equal(result.ok, false);
});

test("rejects empty or oversized descriptions", () => {
  assert.equal(validatePayload({ ...validPayload, description: "  " }).ok, false);
  assert.equal(validatePayload({ ...validPayload, description: "x".repeat(1801) }).ok, false);
});

test("rejects oversized additional fields", () => {
  const result = validatePayload({ ...validPayload, evidence: "x".repeat(241) });
  assert.equal(result.ok, false);
});

test("normalizes valid model output and bounds list sizes", () => {
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
  for (let index = 0; index < 8; index += 1) {
    assert.equal(consumeRateLimit(key, 10_000), true);
  }
  assert.equal(consumeRateLimit(key, 10_000), false);
  assert.equal(consumeRateLimit(key, 70_001), true);
});
