import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import type { Conversation, Message, Ticket, Trace, Evaluation } from "@workspace/api-zod";
import type { Request, Response } from "express";

export interface State {
  persona: "alex" | "jordan";
  conversations: Conversation[];
  messages: Message[];
  tickets: Ticket[];
  traces: Trace[];
  evaluation: Evaluation | null;
}
export const initialState = (): State => ({persona:"alex", conversations:[], messages:[], tickets:[], traces:[], evaluation:null});
export const now = () => new Date().toISOString();
export function sessionId(req: Request, res: Response): string {
  // Opaque browser partition for synthetic data; deliberately not an auth session.
  const candidate = (req.cookies as Record<string, string> | undefined)?.campus_demo;
  if (candidate && /^[0-9a-f-]{36}$/.test(candidate)) return candidate;
  const id = randomUUID();
  res.cookie("campus_demo", id, { httpOnly:true, sameSite:"lax", secure: process.env.NODE_ENV === "production", maxAge:604800000, path:"/" });
  return id;
}
export async function withState<T>(id: string, fn: (s: State) => Promise<T> | T): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO campus_sessions(id,state) VALUES($1,$2::jsonb) ON CONFLICT(id) DO NOTHING", [id, JSON.stringify(initialState())]);
    const result = await client.query<{state: State}>("SELECT state FROM campus_sessions WHERE id=$1 FOR UPDATE", [id]);
    const state = result.rows[0]!.state;
    const output = await fn(state);
    await client.query("UPDATE campus_sessions SET state=$2::jsonb,updated_at=now() WHERE id=$1", [id, JSON.stringify(state)]);
    await client.query("COMMIT");
    return output;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export function trace(s: State, action: string, detail: string, latencyMs = 0, tokens = 0) {
  s.traces.unshift({id: randomUUID(), action, detail, createdAt: now(), latencyMs, tokens});
  s.traces = s.traces.slice(0, 200);
}
export const people = {
  alex: {name:"Alex Morgan", initials:"AM", role:"Teaching Assistant", department:"Computer Science"},
  jordan: {name:"Jordan Lee", initials:"JL", role:"Teaching Assistant", department:"Biology"},
};
export function getPersona(persona: "alex" | "jordan") {
  return {
    ...people[persona], persona,
    aiAvailable: Boolean(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
    disclaimer:"Portfolio demo. All people, university policies, and enterprise integrations are fictional. This is not institutional authentication.",
    checklist: [
      {id:"appointment",title:"Active HR appointment",complete:true,description:"Synthetic HRIS confirms an active teaching appointment."},
      {id:"account",title:"University account activated",complete:true,description:"University digital identity is activated."},
      {id:"mfa",title:"Multi-factor authentication",complete:true,description:"Authenticator enrollment is verified."},
      {id:"ferpa",title:"FERPA privacy training",complete:persona === "jordan",description:persona === "alex" ? "Complete the 45-minute training module before accessing student records." : "Privacy training completion is recorded."},
      {id:"roster",title:"Course roster assignment",complete:false,description:"Your department course coordinator must add you to your course."},
    ],
  };
}
