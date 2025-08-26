# Dashboard Docs API: Structured Model Outputs

This doc explains how to make models return reliably structured JSON you can trust, when to choose Structured Outputs vs JSON mode, and how to handle refusals and edge cases.

- Strongly recommended: Structured Outputs with a JSON Schema.
- Fallback: JSON mode (valid JSON, but no schema guarantees).

## When to use which

- __Function calling__: You are connecting the model to your app’s tools/functions (DB lookups, UI actions). The model fills required args for a tool call.
- __Structured Outputs via response format__: You want the model’s final answer to conform to a JSON Schema for UI rendering, storage, or further logic.

Put simply:
- __Use function calling__ to call your tools.
- __Use Structured Outputs__ to shape the assistant’s reply.

## Supported models (Structured Outputs)

Available on newer OpenAI models (e.g., GPT‑4o family snapshots noted in OpenAI docs). Older models may only support JSON mode.

Note: If a model doesn’t support `response_format: { type: "json_schema", ... }`, use JSON mode instead.

## Benefits of Structured Outputs

- __Reliable type-safety__: No retries for missing keys or invalid enums.
- __Explicit refusals__: Detectable via a dedicated field.
- __Simpler prompting__: No heavy prompt engineering to coerce JSON.

## Quick start examples

Below are illustrative examples showing how to parse into well-defined types. Adjust for the model/version you use.

### Python (Pydantic)

```python
from openai import OpenAI
from pydantic import BaseModel

client = OpenAI()

class CalendarEvent(BaseModel):
    name: str
    date: str
    participants: list[str]

response = client.responses.parse(
    model="gpt-4o-2024-08-06",
    input=[
        {"role": "system", "content": "Extract the event information and return JSON."},
        {"role": "user", "content": "Alice and Bob are going to a science fair on Friday."},
    ],
    text_format=CalendarEvent,
)

event: CalendarEvent = response.output_parsed
```

### JavaScript/TypeScript (Zod)

```ts
import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI();

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

// Example using a JSON schema response format
const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    date: { type: "string" },
    participants: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  required: ["name", "date", "participants"],
};

const resp = await client.responses.create({
  model: "gpt-4o-2024-08-06",
  input: [
    { role: "system", content: "Extract the event information and return only JSON." },
    { role: "user", content: "Alice and Bob are going to a science fair on Friday." },
  ],
  response_format: {
    type: "json_schema",
    json_schema: { name: "calendar_event", strict: true, schema },
  },
});

// Parse/validate with Zod if desired
const text = resp.output_text ?? JSON.stringify(resp.output?.[0] ?? {});
const event = CalendarEvent.parse(JSON.parse(text));
```

## JSON mode vs Structured Outputs

- __Structured Outputs__
  - Produces valid JSON that adheres to your schema.
  - Enable with `response_format: { type: "json_schema", json_schema: { strict: true, schema } }`.
- __JSON mode__
  - Produces valid JSON, but not necessarily matching your schema.
  - Enable with `text: { format: { type: "json_object" } }` or equivalent.

Recommendation: Prefer Structured Outputs when supported. Use JSON mode as a fallback and validate/repair client-side.

## Handling refusals (safety)

Models may refuse certain requests. With Structured Outputs, a refusal can be surfaced distinctly.

Example (Python):

```python
class Step(BaseModel):
    explanation: str
    output: str

class MathReasoning(BaseModel):
    steps: list[Step]
    final_answer: str

completion = client.chat.completions.parse(
    model="gpt-4o-2024-08-06",
    messages=[
        {"role": "system", "content": "Respond in JSON and guide step by step."},
        {"role": "user", "content": "how can I solve 8x + 7 = -23"},
    ],
    response_format=MathReasoning,
)

mr = completion.choices[0].message
if getattr(mr, "refusal", None):
    print(mr.refusal)
else:
    print(mr.parsed)
```

Server responses can include a `refusal` entry signaling the model declined to answer.

## Supported schema subset (high level)

- __Types__: string, number, boolean, integer, object, array, enum, anyOf
- __String props__: pattern, format (date-time, time, date, duration, email, hostname, ipv4, ipv6, uuid)
- __Number props__: multipleOf, maximum/exclusiveMaximum, minimum/exclusiveMinimum
- __Array props__: minItems, maxItems
- __Root object__: must be an object (no top-level anyOf)
- __All fields required__: emulate optional via union with null
- __additionalProperties__: must be false
- __Limits__: up to ~10 nesting levels; size limits apply to properties and enums

Example object schema:

```json
{
  "name": "user_data",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "username": { "type": "string", "pattern": "^@[a-zA-Z0-9_]+$" },
      "email": { "type": "string", "format": "email" }
    },
    "additionalProperties": false,
    "required": ["name", "username", "email"]
  }
}
```

## Streaming (concept)

You can stream responses and progressively parse structured chunks (e.g., to render fields as they arrive). Prefer SDK helpers for streaming with Structured Outputs.

## Best practices

- __Tell the model to output JSON__ explicitly in your system message.
- __Prefer Structured Outputs__; fall back to JSON mode + validation when unsupported.
- __Keep schemas tight__: set `additionalProperties: false`; make all fields required.
- __Refusal-aware UIs__: display refusal messages gracefully.
- __Avoid schema drift__: generate JSON Schema from your types (e.g., Zod/Pydantic) or vice versa.

## How this fits our app

- Use __Structured Outputs__ to render model replies into typed cards on the dashboard (e.g., `client/src/components/...`).
- For providers that don’t support JSON Schema, switch to __JSON mode__ and validate/repair client-side before display.
- Detect refusals to surface a clear message in the UI rather than a generic error.
