// ==============================
// CLIENT-SIDE GROQ CALL WRAPPER
// ==============================
export async function callGroqChat(messages) {
  const response = await fetch("/api/groq-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend error: ${response.status} - ${errorText}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Expected JSON, got: ${text.substring(0, 100)}...`);
  }

  const result = await response.json();

  let content =
    result.choices?.[0]?.message?.content || // OpenAI/Groq format
    result.content || // Simple format
    result.text ||
    result.message ||
    result;

  if (Array.isArray(content)) {
    content = content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");
  }

  if (typeof content === "string") {
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  }

  return content;
}

// ==============================
// HELPERS
// ==============================
function tryExtractJson(text) {
  if (!text || typeof text !== "string") return null;

  // First attempt: direct parse
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Second attempt: extract JSON block
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) {}
  }

  return null;
}

function normalizeClarifications(parsed) {
  // Expected:
  // { clarifications: [ {id:"q1", question:"..."}, ... ] }
  const arr = parsed?.clarifications;
  if (!Array.isArray(arr)) return [];

  return arr
    .map((q, idx) => {
      const id = String(q?.id || `q${idx + 1}`);
      const question = String(q?.question || "").trim();
      if (!question) return null;
      return { id, question };
    })
    .filter(Boolean)
    .slice(0, 5);
}

// ==============================
// 1) CLARIFYING QUESTIONS (NEW)
// ==============================
export async function generateOmnisClarifications(scenarioText) {
  const systemPrompt = `
You are the clarification layer of a decision simulation system.

Your role is NOT to give advice.
Your role is to reduce uncertainty before simulation.

Read the user's scenario and determine what critical unknowns would
change the predicted outcome.

Generate 3 to 5 concise clarification questions.

Rules:
- Ask only questions that materially affect consequences.
- Do NOT ask for unnecessary background details.
- Do NOT repeat what is already clear.
- Avoid generic questions (e.g., "tell me more").
- Each question must target a different uncertainty dimension.
- Neutral tone. No judgment. No advice.

Output format: JSON only

{
  "clarifications": [
    { "id": "q1", "question": "..." },
    { "id": "q2", "question": "..." }
  ]
}
`.trim();

  const userPrompt = `
Scenario:
${scenarioText}

Return ONLY valid JSON in the required format.
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const raw = await callGroqChat(messages);

  const parsed = tryExtractJson(raw);
  const normalized = normalizeClarifications(parsed);

  // Fallback: if model didn't comply, return a minimal safe set
  if (!normalized.length) {
    return [
      { id: "q1", question: "What outcome matters most to you here (success definition)?" },
      { id: "q2", question: "What is your main constraint right now (money/time/energy/authority)?" },
      { id: "q3", question: "What is your time horizon for this decision (days/weeks/months)?" },
    ];
  }

  return normalized;
}

// ==============================
// 2) STEP 1 – CONCISE SNAPSHOT + SUGGESTED PATH
// ==============================
export async function generateOmnisContent(scenarioText, clarifications = null) {
  const systemPrompt = `
You are Omnis – a digital-twin reasoning engine.

You provide ULTRA-CONCISE decision snapshots.
You MUST suggest one best-fit path (based on priorities + constraints), while still presenting alternatives fairly.

Hard constraints:
- Total output <= 220 words
- Use bullets only
- Each bullet <= 14 words
- No repetition
- Zero fluff

Tone:
- Crisp
- Structured
- Practical
`.trim();

  const clarificationBlock = (() => {
    if (!clarifications) return "";
    // clarifications can be array OR object map
    let pairs = [];
    if (Array.isArray(clarifications)) {
      pairs = clarifications
        .map((c, i) => {
          const q = (c?.question || `Clarification ${i + 1}`).trim();
          const a = (c?.answer || "").trim();
          if (!a) return null;
          return `- ${q}\n  Answer: ${a}`;
        })
        .filter(Boolean);
    } else if (typeof clarifications === "object") {
      pairs = Object.entries(clarifications)
        .map(([q, a]) => `- ${String(q).trim()}\n  Answer: ${String(a).trim()}`)
        .filter(Boolean);
    }
    if (!pairs.length) return "";
    return `
Clarifications (higher priority than assumptions):
${pairs.join("\n")}
`.trim();
  })();

  const userPrompt = `
Analyze this scenario briefly.

${clarificationBlock ? `${clarificationBlock}\n\n` : ""}

Required structure:

**Decision Snapshot**
- 1 bullet: core situation + pressure

**Options**
- 2–3 options, one line each

**Trade-offs (per option)**
For each option:
- Improves: (5–8 words)
- Breaks: (5–8 words)
- Risk: Low/Medium/High

**Suggested Path**
- Suggested option: [ONE option]
- Why: exactly 2 bullets
- Override rule: "If your #1 priority is ___, choose ___ instead."

**Next 48 Hours**
- 1 concrete action

Scenario:
${scenarioText}
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return await callGroqChat(messages);
}

// ==============================
// 3) STEP 2 – LAYERED EXPANSION (COMPRESSED + DECISIVE)
// ==============================
export async function expandOmnisText(previousOutput, clarifications = null) {
  const systemPrompt = `
You are Omnis – a decision intelligence engine.

Expand the brief overview into layered analysis that reduces decision fatigue.

Hard constraints:
- TOTAL output <= 900 words
- Use bullets only
- Each bullet <= 15 words
- Max 5 bullets per section
- Deep Layer <= 320 words
- No repetition

Recommendation rule:
- MUST suggest ONE path.
- Must remain conditional and non-absolute.
- Use qualitative risk (Low/Medium/High).

Tone:
- Crisp
- Structured
- Practical
`.trim();

  const clarificationNote = (() => {
    if (!clarifications) return "";
    // same flexibility as generateOmnisContent
    let pairs = [];
    if (Array.isArray(clarifications)) {
      pairs = clarifications
        .map((c, i) => {
          const q = (c?.question || `Clarification ${i + 1}`).trim();
          const a = (c?.answer || "").trim();
          if (!a) return null;
          return `- ${q}\n  Answer: ${a}`;
        })
        .filter(Boolean);
    } else if (typeof clarifications === "object") {
      pairs = Object.entries(clarifications)
        .map(([q, a]) => `- ${String(q).trim()}\n  Answer: ${String(a).trim()}`)
        .filter(Boolean);
    }
    if (!pairs.length) return "";
    return `
Clarifications provided by the user (override assumptions):
${pairs.join("\n")}
`.trim();
  })();

  const userPrompt = `
Original brief overview:
${previousOutput}

${clarificationNote ? `\n\n${clarificationNote}\n\n` : "\n\n"}

Structure output as:

## 🔎 Summary Layer (default)
### Decision Snapshot
- 2 bullets: core situation
### Options
- 2–3 options
### Trade-offs
For each option:
- Improves
- Breaks
- Risk
### Suggested Path
- Suggested option
- Why (3 bullets)
- Confidence: Low/Medium/High
- Override rule
### Next 7 Days
- 3 actions

## 🔍 Context Layer
### Hidden Constraints
- Max 5 bullets
### Assumptions & Fragility
- Per option: 1 assumption, 1 fragility trigger
### Key Uncertainties
- 3 bullets max

## 🧠 Deep Layer (optional, compressed)
### Cause → Effect (per option)
### Timeline Highlights (0–30, 30–90, 90–365)
### Reversibility (Easy/Moderate/Hard)
### Red Flags (max 4)
### 7–14 Day Plan (max 5)
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return await callGroqChat(messages);
}