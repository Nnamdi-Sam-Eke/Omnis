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
    { "id": "A", "name": "option name", "description": "short" }
  ],
  "variables": [
    {
      "name": "income_per_task",
      "value": 5000,
      "unit": "NGN",
      "confidence": "High",
      "type": "financial",
      "impact_direction": "positive"
    }
  ],
  "causal_links": [
    {
      "from": "variable or option name",
      "to": "outcome or other variable",
      "relationship": "increases / decreases / enables / blocks",
      "strength": "Strong / Moderate / Weak"
    }
  ],
  "missing_info": [
    { "id": "m1", "question": "what must be known to simulate better?" }
  ],
  "assumptions": [
    { "id": "a1", "assumption": "only if needed", "fragility": "what breaks it" }
  ]
}

Variable type options: financial, time, energy, skill, risk, social, legal, identity, unknown
Variable impact_direction options: positive, negative, neutral, unknown

Rules:
- Use only options present in the scenario (don't invent options).
- Extract numeric variables when present.
- If unclear, set value null and add to missing_info.
- Always populate causal_links with at least 1-2 relationships you can infer.
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
// ANCHOR VARIABLE EXTRACTOR
// Identifies the highest-stakes variables in the blueprint.
// Injected into simulation so the engine cannot ignore them.
// ==============================
function extractAnchorVariables(blueprint) {
  if (!blueprint?.variables?.length) return [];
  const scored = blueprint.variables
    .map((v) => {
      let score = 0;
      if (v.confidence === "High") score += 3;
      if (v.confidence === "Medium") score += 1;
      if (v.value !== null && v.value !== undefined) score += 2;
      if (v.type === "financial") score += 2;
      if (v.impact_direction === "positive") score += 1;
      // Human-dimension scoring — life decisions aren't just financial
      if (v.type === "identity") score += 2;
      if (v.type === "energy") score += 2;
      if (v.type === "social") score += 1.5;
      if (v.impact_direction === "negative") score += 1; // downside drives real decisions
      if (/autonomy|stability|burnout|focus|reputation|trust/i.test(v.name || "")) score += 2;
      return { ...v, _score: score };
    })
    .sort((a, b) => b._score - a._score);
  return scored.slice(0, 3).map((v) => {
    const valueStr = v.value !== null ? `${v.value} ${v.unit || ""}`.trim() : "unknown value";
    return `${v.name} (${valueStr}, confidence: ${v.confidence}) — if this changes, simulation shifts significantly`;
  });
}

// ==============================
// NEW — inferLatentPattern(blueprint)
// Purpose:
// The missing "intuition compression" layer.
// Sits between blueprint and simulation.
// Converts the decision map into the HIDDEN PATTERN beneath it —
// the deeper force that makes the situation what it truly is.
// Without this, Omnis only says "Option A does this."
// With this, Omnis says "This scenario is really about THIS deeper force."
// ==============================
export async function inferLatentPattern(blueprint) {
  if (!blueprint || typeof blueprint !== "object") return null;

  const systemPrompt = `
You are Omnis - a latent-pattern inference engine.

Your job is NOT to simulate outcomes yet.
Your job is to identify what this decision is REALLY about underneath.

You must compress the blueprint into the hidden structure beneath it —
the deeper recurring pattern, force, or tension that explains WHY this
decision is hard and what the user is truly navigating.

Return JSON only, in this exact shape:

{
  "core_tension": "short phrase naming the main trade-off",
  "dominant_tradeoff": "the single most consequential exchange in this decision",
  "hidden_pattern": "short phrase naming the deeper recurring system pattern",
  "decision_gravity": "what pressure is distorting or pulling this decision",
  "likely_regret_source": "what the user may regret later if they choose poorly",
  "identity_pull": "what identity need or self-image is influencing the choice",
  "irreversible_threshold": "what event, lock-in, or loss makes reversal much harder",
  "optimization_bias": "what the user seems to be optimizing, intentionally or not",
  "pattern_confidence": "Low | Medium | High",
  "pattern_reason": "why this pattern inference is credible from the blueprint"
}

Rules:
- Be grounded ONLY in the blueprint. Do not invent facts.
- Name the real trade-off, not generic advice.
- Prefer precise system patterns like:
  "stability vs autonomy",
  "short-term relief vs long-term leverage",
  "single-point dependency risk",
  "identity-protective hesitation",
  "hidden fixed-cost fragility",
  "uncertainty avoidance under pressure",
  "control illusion masking exposure".
- Be compact and honest.
- Do NOT recommend an option.
- Do NOT simulate outcomes — that comes next.
`.trim();

  const userPrompt = `
Decision Blueprint:
${JSON.stringify(blueprint, null, 2)}

Return ONLY valid JSON.
`.trim();

  const raw = await callGroqChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return tryExtractJson(raw);
}

// ==============================
// FIX 1 — SIMULATION ENGINE
// simulateOmnisOutcomes(blueprint)
// Anchor variables explicitly surfaced so the engine
// cannot soft-pedal the most fragile high-stakes inputs.
// ==============================
export async function simulateOmnisOutcomes(blueprint, latentPattern = null) {
  if (!blueprint || typeof blueprint !== "object") return null;

  const anchorVariables = extractAnchorVariables(blueprint);
  const anchorBlock = anchorVariables.length
    ? `\nCRITICAL ANCHOR VARIABLES (address each in the relevant option's failure path and fragility_triggers):\n${anchorVariables.map((a) => `- ${a}`).join("\n")}\n`
    : "";

  const latentPatternBlock = latentPattern
    ? `\nLatent Pattern Inference (use to sharpen causality and failure logic — do NOT turn into generic advice):\n${JSON.stringify(latentPattern, null, 2)}\n`
    : "";

  const systemPrompt = `
You are Omnis - a causal scenario simulation engine.

Your job is NOT to give advice.
Your job is to project what each option most likely causes across time,
based purely on the variables, constraints, causal links, and assumptions
in the Decision Blueprint.

Think like a systems modeler:
- trace cause to effect chains
- identify what compounds, what breaks, what becomes irreversible
- model three probability paths: best, base (most likely), failure

SIMULATION RULES:
- Narratives must be causally specific. Reference actual variable names and values.
  BAD: "stable income, reduced freelancing"
  GOOD: "salary covers rent with surplus; big client likely lost within 90 days due to time constraints"
- For every anchor variable flagged in the user prompt, explicitly project what
  happens to it under each option's base and failure paths. Do not soft-pedal it.
- If a variable has high confidence and high value, its loss must appear
  as a named failure mode, not just a vague fragility trigger.
- Narratives must be 20 to 40 words — causally meaningful, not vague.

Return JSON only, in this exact shape:

{
  "simulation_confidence": "Low | Medium | High",
  "confidence_reason": "why confidence is this level",
  "options": [
    {
      "id": "A",
      "name": "option name",
      "paths": {
        "best": {
          "probability": "~20%",
          "narrative": "specific causal outcome referencing actual variables/values",
          "key_driver": "what makes this path possible"
        },
        "base": {
          "probability": "~60%",
          "narrative": "specific causal outcome referencing actual variables/values",
          "key_driver": "what makes this the default"
        },
        "failure": {
          "probability": "~20%",
          "narrative": "specific causal outcome referencing actual variables/values",
          "key_driver": "what triggers this path"
        }
      },
      "timeline": {
        "0_30_days": "specific actions or changes — name the variable",
        "30_90_days": "what becomes visible or locked in — name the variable",
        "3_12_months": "what the option has concretely produced — use numbers where possible"
      },
      "reversibility": "Easy | Moderate | Hard",
      "reversibility_reason": "why — reference what is lost or locked in",
      "compounding_effects": ["what builds positively over time — be specific"],
      "fragility_triggers": ["what could break this option — name the variable"],
      "failure_modes": ["specific named ways this option collapses"]
    }
  ]
}

Rules:
- Only simulate options present in the blueprint. Do not invent options.
- Use variables and causal_links from the blueprint to justify every projection.
- Be honest about uncertainty — reflect it in simulation_confidence.
- Do not recommend. Do not advise. Only project.
`.trim();

  const userPrompt = `
Decision Blueprint:
${JSON.stringify(blueprint, null, 2)}
${latentPatternBlock}
${anchorBlock}
Use the latent pattern only to sharpen causality and failure logic.
Do NOT turn it into generic advice.
Do NOT invent new options.
Return ONLY valid JSON.
`.trim();

  const raw = await callGroqChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return tryExtractJson(raw);
}

// ==============================
// FIX 2 — UPDATED generateOmnisContent()
// Now returns: { blueprint, latentPattern, simulation, summary, error }
// Pipeline: clarify → blueprint → inferLatentPattern → simulate → summarize
// ==============================
export async function generateOmnisContent(scenarioText, clarifications = null) {
  // --- Step 1: Build the structured decision model ---
  const blueprint = await buildDecisionBlueprint(scenarioText, clarifications);

  if (!blueprint || typeof blueprint !== "object") {
    const fallbackSummary = await callGroqChat([
      {
        role: "system",
        content: "You are Omnis. The blueprint stage failed. Ask the user 3 specific questions needed to proceed.",
      },
      {
        role: "user",
        content: `Blueprint failed for this scenario:\n\n${scenarioText}\n\nWhat 3 things are missing?`,
      },
    ]);
    return {
      blueprint: null,
      latentPattern: null,
      simulation: null,
      summary: fallbackSummary,
      error: "blueprint_failed",
    };
  }

  // --- Step 2: Infer the hidden pattern beneath the decision ---
  // This is the intuition compression layer — names the deeper force
  // before simulation begins, so projection is shaped by pattern awareness.
  const latentPattern = await inferLatentPattern(blueprint);

  // --- Step 3: Run the simulation engine on blueprint + latent pattern ---
  const simulation = await simulateOmnisOutcomes(blueprint, latentPattern);

  // --- Step 4: Generate the user-facing summary ---
  const systemPrompt = `
You are Omnis - a decision intelligence engine presenting results to a user.

You have already:
- mapped the decision structure (blueprint),
- inferred the hidden pattern beneath it (latent pattern),
- simulated future paths across time (simulation).

Your job now is to present a crisp, structured summary.

Hard constraints:
- Total output <= 260 words
- Use bullets only
- Each bullet <= 14 words
- No repetition
- Zero fluff
- Do not use motivational language
- Ground every section in blueprint, latent pattern, or simulation data

Tone:
- Crisp
- Structured
- Grounded
`.trim();

  const clarificationBlock = buildClarificationBlock(
    clarifications,
    "Clarifications (override assumptions)"
  );

  const userPrompt = `
Decision Blueprint:
${JSON.stringify(blueprint, null, 2)}

Latent Pattern:
${latentPattern ? JSON.stringify(latentPattern, null, 2) : "Unavailable"}

Simulation Results:
${simulation ? JSON.stringify(simulation, null, 2) : "Simulation unavailable — work from blueprint only."}
${clarificationBlock ? `\n${clarificationBlock}\n` : ""}

Produce a crisp summary using this structure:

**System Map**
- Decision
- Objective
- Constraints
- Options

**Underlying Pattern**
- Core tension
- Hidden pattern
- What the user is optimizing without realizing it
- Irreversible threshold

**Simulated Outcomes**
- 1 bullet per option showing most likely path

**Decision Posture**
- Best-fit option inferred from simulation (not advice — posture)
- 2 bullets why, grounded in simulation
- 1 override rule

**Next 48 Hours**
- 1 concrete action
`.trim();

  const summary = await callGroqChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return {
    blueprint,
    latentPattern,
    simulation,
    summary,
    error: null,
  };
}

// ==============================
// FIX 3 — UPDATED expandOmnisText()
// Now accepts latentPattern as explicit param.
// The hidden pattern shapes the Context Layer's meaning compression.
// Pipeline: summary + blueprint + latentPattern + simulation → full report
// ==============================
export async function expandOmnisText(
  previousOutput,
  clarifications = null,
  blueprint = null,
  latentPattern = null,
  simulation = null
) {
  const systemPrompt = `
You are Omnis - a decision intelligence engine.

Expand into layered analysis that reduces decision fatigue.
Your expansion must be grounded in the simulation data, latent pattern,
and blueprint provided — not in re-interpreting the summary text.

Hard constraints:
- TOTAL output <= 900 words
- Use bullets only
- Each bullet <= 15 words
- Max 5 bullets per section
- Deep Layer <= 320 words
- No repetition

Decision Posture rule:
- MUST suggest ONE path inferred from simulation.
- Frame it as Decision Posture, not personal advice.
- Must remain conditional and non-absolute.
- Use qualitative risk (Low/Medium/High).

Tone:
- Crisp
- Structured
- Practical
`.trim();

  const clarificationNote = buildClarificationBlock(
    clarifications,
    "Clarifications (override assumptions)"
  );

  const blueprintBlock = blueprint
    ? `\nDecision Blueprint (source of truth):\n${JSON.stringify(blueprint, null, 2)}\n`
    : "";

  const latentPatternBlock = latentPattern
    ? `\nLatent Pattern (hidden structure beneath this decision):\n${JSON.stringify(latentPattern, null, 2)}\n`
    : "";

  const simulationBlock = simulation
    ? `\nSimulation Results (use these for timeline, reversibility, paths):\n${JSON.stringify(simulation, null, 2)}\n`
    : "";

  const userPrompt = `
Original summary:
${previousOutput}
${blueprintBlock}
${latentPatternBlock}
${simulationBlock}
${clarificationNote ? `\n${clarificationNote}\n` : ""}

Structure the full expansion as:

## Summary Layer
### Decision Snapshot
- 2 bullets: core situation
### Options
- 2-3 options with one-line descriptions
### Trade-offs
For each option:
- Improves
- Breaks
- Risk level
### Decision Posture
- Best-fit option inferred from simulation
- Why (3 bullets grounded in simulation)
- Confidence: Low/Medium/High
- Override rule
### Next 7 Days
- 3 concrete actions

## Context Layer
### Hidden Pattern
- Core tension
- Hidden pattern
- Decision gravity
- Likely regret source
- Irreversible threshold
### Hidden Constraints
- Max 5 bullets
### Assumptions & Fragility
- Per option: 1 assumption, 1 fragility trigger (from simulation if available)
### Key Uncertainties
- 3 bullets max

## Deep Layer
### Cause → Effect
- Per option, from simulation causal chains
### Timeline
- 0-30d / 30-90d / 3-12mo
### Reversibility
- Easy/Moderate/Hard + reason
### Failure Modes
- From simulation failure paths
### Red Flags
- Max 4
### 7-14 Day Plan
- Max 5 steps
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return await callGroqChat(messages);
}