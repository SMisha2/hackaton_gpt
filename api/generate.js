const CATEGORIES = new Set(["housing", "shop", "work", "municipal", "delivery", "other"]);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;
const rateLimitBuckets = new Map();

// Best-effort per warm serverless instance. Add a provider-level firewall limit for a public launch.
export function consumeRateLimit(key, now = Date.now()) {
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    if (rateLimitBuckets.size > 1000) {
      for (const [entryKey, entry] of rateLimitBuckets) {
        if (now >= entry.resetAt) rateLimitBuckets.delete(entryKey);
      }
    }
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count += 1;
  return true;
}

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    document: { type: "string" },
    plan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" }
        },
        required: ["title", "description"]
      }
    },
    review_notes: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["document", "plan", "review_notes"]
};

export function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Некорректный формат запроса." };
  }
  if (payload.consent !== true) {
    return { ok: false, error: "Для ИИ-режима требуется отдельное согласие." };
  }
  if (!CATEGORIES.has(payload.category)) {
    return { ok: false, error: "Выберите категорию обращения." };
  }
  if (typeof payload.description !== "string" || !payload.description.trim()) {
    return { ok: false, error: "Добавьте описание ситуации." };
  }
  if (payload.description.length > 1800) {
    return { ok: false, error: "Описание слишком длинное." };
  }
  const fields = ["recipient", "city", "since", "desired", "previousContact", "evidence"];
  for (const field of fields) {
    if (payload[field] !== undefined && (typeof payload[field] !== "string" || payload[field].length > 240)) {
      return { ok: false, error: "Одно из дополнительных полей имеет неверный формат." };
    }
  }
  return {
    ok: true,
    data: {
      category: payload.category,
      description: payload.description.trim(),
      recipient: (payload.recipient || "").trim(),
      city: (payload.city || "").trim(),
      since: (payload.since || "").trim(),
      desired: (payload.desired || "").trim(),
      previousContact: (payload.previousContact || "").trim(),
      evidence: (payload.evidence || "").trim()
    }
  };
}

export function normalizeGeneratedResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid generated result");
  }
  if (typeof value.document !== "string" || value.document.trim().length < 80 || value.document.length > 12000) {
    throw new Error("Invalid generated document");
  }
  if (!Array.isArray(value.plan) || value.plan.length < 3 || value.plan.length > 5) {
    throw new Error("Invalid action plan");
  }
  const plan = value.plan.map((item) => {
    if (!item || typeof item.title !== "string" || typeof item.description !== "string") {
      throw new Error("Invalid action item");
    }
    return {
      title: item.title.slice(0, 100),
      description: item.description.slice(0, 500)
    };
  });
  const review_notes = Array.isArray(value.review_notes)
    ? value.review_notes.filter((note) => typeof note === "string").slice(0, 6).map((note) => note.slice(0, 300))
    : [];
  return { document: value.document.trim(), plan, review_notes };
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Метод не поддерживается." });
  }

  const origin = request.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.host) {
        return response.status(403).json({ error: "Запрос отклонён." });
      }
    } catch {
      return response.status(403).json({ error: "Некорректный источник запроса." });
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(503).json({ error: "ИИ-сервер не настроен." });
  }

  const forwardedFor = request.headers["x-forwarded-for"];
  const clientIp = typeof forwardedFor === "string"
    ? forwardedFor.split(",")[0].trim()
    : Array.isArray(forwardedFor) ? String(forwardedFor[0] || "unknown") : "unknown";
  if (!consumeRateLimit(clientIp)) {
    response.setHeader("Retry-After", "60");
    return response.status(429).json({ error: "Слишком много запросов. Повторите попытку позже." });
  }

  const validation = validatePayload(request.body);
  if (!validation.ok) {
    return response.status(400).json({ error: validation.error });
  }

  const instructions = [
    "Ты — редактор официальных обращений для русскоязычного бытового сервиса.",
    "Преобразуй описание пользователя в ясный, уважительный, фактически точный проект обращения и практический план.",
    "Не называй себя юристом и не давай гарантий результата.",
    "Не выдумывай факты, даты, адреса, названия органов, номера законов, статьи, обязанности, суммы и сроки.",
    "Не добавляй в документ обстоятельства, которых нет во входных данных. Разделяй утверждения пользователя и неподтверждённые предположения.",
    "Если не хватает сведений, используй квадратные скобки для заполнения или добавь пункт проверки в review_notes.",
    "Сохраняй суть жалобы, но заменяй оскорбления и эмоциональные оценки нейтральными формулировками.",
    "Сформулируй конкретную просьбу, соразмерную категории проблемы. Не обещай, что адресат обязан выполнить действие, если это нельзя подтвердить.",
    "Не вставляй неподтверждённые юридические нормы, сроки ответа и ссылки на сайты. При необходимости скажи пользователю проверить применимый порядок.",
    "Составь 3–5 конкретных шагов плана с короткими и безопасными описаниями.",
    "В review_notes перечисли 2–6 важных проверок перед отправкой: адресат, даты, факты, доказательства, заполнение плейсхолдеров.",
    "Верни только объект JSON в заданном формате, без Markdown и текста вокруг."
  ].join("\n");

  const input = [
    "Категория: " + validation.data.category,
    "Адресат: " + (validation.data.recipient || "не указан"),
    "Населённый пункт: " + (validation.data.city || "не указан"),
    "Дата или период: " + (validation.data.since || "не указан"),
    "Желаемый результат: " + (validation.data.desired || "не указан"),
    "Предыдущие обращения: " + (validation.data.previousContact || "не указаны"),
    "Подтверждения: " + (validation.data.evidence || "не указаны"),
    "Описание ситуации: " + validation.data.description
  ].join("\n");

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-6.2-sol",
        store: false,
        instructions,
        input,
        max_output_tokens: 2200,
        text: {
          format: {
            type: "json_schema",
            name: "bureaucratic_translator_result",
            strict: true,
            schema: OUTPUT_SCHEMA
          }
        }
      })
    });

    if (!upstream.ok) {
      return response.status(502).json({ error: "ИИ-провайдер временно не смог обработать запрос." });
    }

    const result = await upstream.json();
    const outputText = (result.output || [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text)
      .join("\n");

    if (!outputText) {
      return response.status(502).json({ error: "ИИ вернул пустой результат." });
    }

    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      return response.status(502).json({ error: "Не удалось проверить структуру ответа ИИ." });
    }

    return response.status(200).json(normalizeGeneratedResult(parsed));
  } catch {
    return response.status(502).json({ error: "Не удалось связаться с ИИ-провайдером." });
  }
}
