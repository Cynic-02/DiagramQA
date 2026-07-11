export const DEFAULT_PROMPTS = {
  extraction: `Analyse the attached diagram and extract its structure into JSON.

Return ONLY valid JSON (no markdown fences, no prose) with this EXACT shape:
{
  "diagramType": "<one of: architecture | flowchart | circuit | state-machine | process | class-diagram | network | other — pick the best fit>",
  "summary": "<one or two sentence plain-English summary of what the diagram represents>",
  "entities": [
    { "id": "e1", "label": "<human-readable label as shown>", "type": "<component|process|decision|datastore|module|node|device|actor|state|class|layer>", "role": "<optional short role, e.g. 'entry point', 'database', 'decision gate'>" }
  ],
  "relationships": [
    { "from": "e1", "to": "e2", "label": "<edge label or relationship verb>", "kind": "<flow|control|data|depends-on|contains|calls|inheritance>" }
  ],
  "layoutNotes": "<optional: brief note on spatial layout, e.g. 'left-to-right pipeline', 'hub-and-spoke'>"
}

Rules:
- Extract between 4 and 14 entities (merge trivial duplicates).
- Entity ids MUST be e1, e2, e3 … in reading order.
- Every relationship.from / relationship.to MUST reference an existing entity id.
- Labels should match what is literally written in the diagram where possible.
- If the diagram is a flowchart, capture decision branches as relationships labelled yes/no or condition names.
- Keep summary factual; do not speculate beyond what is visible.`,

  generation: `You are the Question Generation Agent in a multi-agent pipeline.
A vision agent has extracted the following structured representation of a diagram:

{{STRUCTURE}}

Target cognitive level (Bloom's taxonomy): {{BLOOM}}
Cognitive verb for this level: "{{VERB}}"
Definition: {{BLURB}}

Generate exactly {{COUNT}} question{{PLURAL}} that require a learner to operate at the {{BLOOM}} level using ONLY information derivable from the diagram structure above.
{{MCQ_INSTRUCTIONS}}

Rules:
- Each question MUST be answerable from the diagram structure alone.
- Do NOT state or hint at the answer inside the question (no answer leakage).
- Match the cognitive demand to "{{BLOOM}}": {{BLURB}}
- "targets" lists the entity ids the question is about (from the structure).
- Vary which parts of the diagram each question targets.

Return ONLY a valid JSON array (no markdown, no prose), each item exactly:
{{JSON_SHAPE}}

Use ids {{ID_EXAMPLES}}`,

  answering: `You are the Answering Agent. You answer questions using ONLY the diagram structure below. You do NOT see any other agent's answer — answer independently and ground every answer in the diagram.

Diagram structure:
{{STRUCTURE}}

Questions:
{{QUESTIONS}}
{{MCQ_INSTRUCTIONS}}

For each question, provide a concise, correct answer and brief reasoning that cites the relevant entities/relationships. Assign a confidence score (0.0–1.0) reflecting how directly the diagram supports your answer.

Return ONLY a valid JSON array (no markdown), each item exactly:
{ "questionId": "q1", "answer": "<answer>", "reasoning": "<1-2 sentences grounded in the diagram>", "confidence": 0.85{{MCQ_OPTION}} }

Answer every question. questionId must match the input ids.`,

  verification: `You are the Verification / Critic Agent. For each Q&A pair below, check it against the extracted diagram structure.

Diagram structure:
{{STRUCTURE}}

Q&A pairs:
{{PAIRS}}

For each pair, evaluate:
1. correctness — is the answer correct given the diagram? (correct | partial | incorrect)
2. ambiguity — is the question ambiguous or unanswerable from the diagram? (boolean)
3. difficultyAccurate — does the question genuinely demand the stated Bloom level "{{LEVEL}}"? (boolean)
4. leakRisk — does the question leak its own answer? (boolean)
5. issues — short list of any problems (empty array if none)
6. suggestion — optional one-line improvement
7. status — overall verdict: "pass" (all good), "flagged" (minor issues but usable), "reject" (incorrect or seriously ambiguous/leaky)

Return ONLY a valid JSON array (no markdown), one entry per question, each exactly:
{ "questionId": "q1", "status": "pass", "correctness": "correct", "ambiguity": false, "difficultyAccurate": true, "leakRisk": false, "issues": [], "suggestion": "optional" }`
}
