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

  try {
    return JSON.parse(text);
  } catch (_) {}

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

function buildClarificationBlock(clarifications, label = "Clarifications") {
  if (!clarifications) return "";
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
  return `${label}:\n${pairs.join("\n")}`;
}

// ==============================
// 0) DECISION BLUEPRINT (SYSTEM ARCHITECT MODE)
// ==============================
export async function buildDecisionBlueprint(scenarioText, clarifications = null) {
  const systemPrompt = `
You are Omnis, acting as a systems architect for decision-making.

Goal: convert messy scenario text into a clean decision model.
Do NOT give advice. Do NOT recommend. Do NOT write long explanations.

Return JSON only, in this exact shape:

{
  "decision": "one-line decision to make",
  "time_horizon": "e.g., 6 months / 30 days / 1 year / unknown",
  "objective": ["what success means (1-3 items)"],
  "constraints": ["limits (money/time/skills/energy/legal/etc)"],
  "options": [
    { "id": "A", "name": "option name", "description": "short" },
    { "id": "B", "name": "option name", "description": "short" }
  ],
  "variables": [
    { "name": "income_per_task", "value": 5000, "unit": "NGN", "confidence": "High" }
  ],
  "missing_info": [
    { "id": "m1", "question": "what must be known to simulate better?" }
  ],
  "assumptions": [
    { "id": "a1", "assumption": "only if needed", "fragility": "what breaks it" }
  ]
}

Rules:
- Use only options present in the scenario (don't invent options).
- Extract numeric variables when present.
- If unclear, set value null and add to missing_info.
- Keep it compact.
`.trim();

  const clarificationBlock = buildClarificationBlock(clarifications, "Clarifications");

  const userPrompt = `
Scenario:
${scenarioText}
${clarificationBlock ? `\n${clarificationBlock}\n` : ""}
Return ONLY valid JSON.
`.trim();

  const raw = await callGroqChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return tryExtractJson(raw);
}

// ==============================
// 1) CLARIFYING QUESTIONS
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
// 2) STEP 1 - SNAPSHOT + SUGGESTED PATH
// ==============================
export async function generateOmnisContent(scenarioText, clarifications = null) {
  const systemPrompt = `
You are Omnis - a decision partner. Prioritize structure, systems thinking, and clear reasoning.
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

  const blueprint = await buildDecisionBlueprint(scenarioText, clarifications);

  if (!blueprint || typeof blueprint !== "object") {
    return await callGroqChat([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Your blueprint failed. Ask 3 specific missing questions needed to simulate:\n\nScenario:\n${scenarioText}`,
      },
    ]);
  }

  const clarificationBlock = buildClarificationBlock(clarifications, "Clarifications (higher priority than assumptions)");

  const userPrompt = `
You are Omnis - a decision partner who thinks like a systems architect.

Use the Decision Blueprint as your source of truth.
Do not invent new options.
If blueprint.missing_info is non-empty, ask for the top 3 missing items first.

Decision Blueprint (JSON):
${JSON.stringify(blueprint, null, 2)}
${clarificationBlock ? `\n${clarificationBlock}\n` : ""}
Now produce the output using this structure:

**System Map**
- Decision
- Objective
- Constraints
- Options

**Key Trade-offs**
- 1-2 bullets per option

**Suggested Path**
- One option + 2 bullets why
- One "override rule"

**Next 48 Hours**
- 1 action
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return await callGroqChat(messages);
}

// ==============================
// 3) STEP 2 - LAYERED EXPANSION (COMPRESSED + DECISIVE)
// ==============================
export async function expandOmnisText(previousOutput, clarifications = null) {
  const systemPrompt = `
You are Omnis - a decision intelligence engine.

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

  const clarificationNote = buildClarificationBlock(clarifications, "Clarifications provided by the user (override assumptions)");

  const userPrompt = `
Original brief overview:
${previousOutput}
${clarificationNote ? `\n${clarificationNote}\n` : ""}
Structure output as:

## Summary Layer (default)
### Decision Snapshot
- 2 bullets: core situation
### Options
- 2-3 options
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

## Context Layer
### Hidden Constraints
- Max 5 bullets
### Assumptions & Fragility
- Per option: 1 assumption, 1 fragility trigger
### Key Uncertainties
- 3 bullets max

## Deep Layer (optional, compressed)
### Cause -> Effect (per option)
### Timeline Highlights (0-30, 30-90, 90-365)
### Reversibility (Easy/Moderate/Hard)
### Red Flags (max 4)
### 7-14 Day Plan (max 5)
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return await callGroqChat(messages);
}