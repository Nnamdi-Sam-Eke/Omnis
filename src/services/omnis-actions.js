// ==============================
// CLIENT-SIDE GROQ CALL WRAPPER
// ==============================
export async function callGroqChat(messages, options = {}) {
  const backendUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:5000/api/groq-chat"
      : "/api/groq-chat";

  const response = await fetch(backendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, options }),
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
// 2) GENERATE OMNIS CONTENT (STEP 1) - CONCISE VERSION
// UPDATED: Accept clarifications
// ==============================
export async function generateOmnisContent(scenarioText, clarifications = null) {
  const systemPrompt = `
You are Omnis – a digital-twin reasoning engine.

You provide CONCISE, structured overviews of decision scenarios.
Keep everything brief and scannable. Users can request deeper analysis separately.

Your role is to:
- Identify key decision points quickly
- Sketch 2–3 plausible future paths (brief summaries only)
- Flag major trade-offs
- Keep it SHORT - this is the preview, not the full analysis

Important constraints:
- Maximum 2-3 sentences per section
- No deep explanations yet
- Focus on WHAT, not WHY (the why comes later)
- Be punchy and clear

Tone & style:
- Crisp, direct, minimal
- Use strong verbs
- No fluff or repetition
`.trim();

  // Clarifications formatting block
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
Analyze this scenario with a BRIEF overview. Keep everything concise.

${clarificationBlock ? `${clarificationBlock}\n\n` : ""}

Required structure:

**Current State**
1-2 sentences max. What's the core situation and main pressure point?

**Decision Forks**
List 2–3 realistic choices (one line each, no explanations).

**Future Paths**
For EACH fork, provide ONLY:
- One-line summary of where this path leads
- Main upside (5-8 words)
- Main downside (5-8 words)

**Key Trade-Off**
1-2 sentences. What's the central tension across all paths?

**Next Step**
One concrete action to take in the next 48 hours.

Scenario:
${scenarioText}

IMPORTANT:
- Keep this BRIEF.
- If clarifications exist, they override assumptions.
- Each section should be scannable in 5 seconds.
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return await callGroqChat(messages);
}

// ==============================
// 3) EXPAND OMNIS TEXT (STEP 2) - DEEP DIVE VERSION
// OPTIONAL: pass clarifications if you want later
// ==============================
export async function expandOmnisText(previousOutput, clarifications = null) {
  const systemPrompt = `
You are Omnis – a decision intelligence engine.

Your task is to expand a brief scenario overview into a layered analysis:

1️⃣ Summary Layer – quick scan (2–3 sentences per section)
2️⃣ Context Layer – causal and emotional context (4–6 sentences)
3️⃣ Deep Layer – full causal depth, tactical steps, red flags

Key rules:
- Keep output readable and scannable.
- Use bullet points for clarity.
- Avoid long paragraphs; break text into digestible chunks.
- Neutral tone: no prescriptive commands, no hard percentages (use qualitative descriptors like Low/Medium/High risk).
- Explicitly highlight alignment with core values (faith, purpose, well-being, autonomy).
- Use headings for each section and indicate which layer each part belongs to.

Tone:
- Thoughtful, reverent, advisory
- Supportive, not controlling
- Encourage clarity and reflection
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

Transform this into a layered analysis with the following structure:

**Summary Layer** (default view)
- Current State: 2–3 sentences highlighting core pressures
- Decision Forks: 2–3 choices, 1 line each
- Future Paths: 1 line per path (summary + main upside + main downside)
- Key Trade-Off: 1–2 sentences
- Next Step: 1 concrete action for next 48 hours

**Context Layer** (click to expand)
- Expand Current State: 4–6 sentences, including hidden constraints and emotional factors
- Decision Forks: 1–2 sentences logic per choice
- Future Paths: explain triggers, assumptions, and fragility (qualitative, not numeric)
- Trade-Off Analysis: deeper explanation of central tension and value alignment

**Deep Layer** (optional, full insight)
- Full causal depth per path
- Timeline breakdown (0–30, 30–90, 90–365 days)
- Hidden factors: psychological, second-order, overlooked aspects
- Path reversibility (Easy/Moderate/Hard/Irreversible)
- Risk vs. Reward matrix (qualitative)
- Tactical 7–14 day next steps
- Red Flags

Guidelines:
- Present each layer progressively; users can stop at any layer.
- Keep all text scannable with bullet points and headings.
- Avoid overwhelming the user at first glance.
- Use clarifications if present; do not contradict them.
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return await callGroqChat(messages);
}
