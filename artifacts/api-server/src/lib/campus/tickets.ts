import { createHash, randomUUID } from "node:crypto";
import type { Ticket, TicketInput } from "@workspace/api-zod";
const now = () => new Date().toISOString();

export function ticketHash(ticket: Pick<Ticket, "id" | "title" | "description" | "category" | "priority" | "requester">): string {
  return createHash("sha256").update(JSON.stringify([ticket.id,ticket.title,ticket.description,ticket.category,ticket.priority,ticket.requester])).digest("hex");
}
export function makeTicket(input: TicketInput, requester: string): Ticket {
  const id = randomUUID();
  const ticket: Ticket = {...input,id,number:`CD-${id.slice(0,8).toUpperCase()}`,status:"draft",requester,approvalHash:"",createdAt:now(),events:[`${now()} · Draft prepared. No action taken.`]};
  ticket.approvalHash = ticketHash(ticket);
  return ticket;
}
export function approve(ticket: Ticket, hash: string, fail = false): {status:number;error?:string} {
  if (hash !== ticketHash(ticket)) return {status:409,error:"The draft changed. Review the latest ticket before approving."};
  if (ticket.status === "submitted") return {status:200}; // Same payload retry cannot duplicate.
  if (fail) {
    ticket.events.push(`${now()} · Simulated connector failure. No ticket submitted; safe to retry.`);
    return {status:503,error:"Simulated connector unavailable. No ticket was submitted. Retry with the same draft."};
  }
  ticket.status = "submitted";
  ticket.events.push(`${now()} · Human approved exact payload and submitted to the mock service desk.`);
  return {status:200};
}
