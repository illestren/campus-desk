import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import * as V from "@workspace/api-zod";
import { policies } from "../lib/campus/policies";
import { getPersona, initialState, now, sessionId, trace, withState, type State } from "../lib/campus/store";
import { answer } from "../lib/campus/agent";
import { approve, makeTicket, ticketHash } from "../lib/campus/tickets";
import { emptyEvaluation, evaluate } from "../lib/campus/evaluation";

const router: IRouter = Router();
type Handler = (req: Request, res: Response) => Promise<void>;
const route = (fn: Handler): Handler => async (req,res) => {
  try { await fn(req,res); }
  catch(error) {
    const status = error instanceof HttpError ? error.status : 500;
    if(status === 500) req.log.error({errorType:error instanceof Error ? error.name : "UnknownError"},"CampusDesk operation failed");
    res.status(status).json({error:status === 500 ? "The service could not complete this request. Nothing was submitted. Please retry." : (error as Error).message});
  }
};
class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
function parse<T>(schema: {safeParse:(x:unknown)=>{success:boolean;data?:T}}, input:unknown): T {
  const result = schema.safeParse(input);
  if(!result.success) throw new HttpError(400,"Invalid request. Check the required fields and try again.");
  return result.data as T;
}
function conversation(s: State,id:string) {
  const c = s.conversations.find(c=>c.id===id);
  if(!c) throw new HttpError(404,"Conversation not found in this demo workspace.");
  return c;
}
function ticketFor(s:State,id:string) {
  const ticket=s.tickets.find(t=>t.id===id);
  if(!ticket) throw new HttpError(404,"Ticket not found in this demo workspace.");
  return ticket;
}

router.get("/session",route(async(req,res)=>{
  const data=await withState(sessionId(req,res),s=>getPersona(s.persona));
  res.json(V.GetSessionResponse.parse(data));
}));
router.post("/session",route(async(req,res)=>{
  const input=parse(V.SwitchPersonaBody,req.body);
  const data=await withState(sessionId(req,res),s=>{
    // Keep separate, persistent synthetic workspaces for each persona.
    const current=s as State & {personas?: Partial<Record<"alex"|"jordan",State>>};
    const saved=current.personas ?? {};
    const {personas:_,...snapshot}=current;
    saved[s.persona]=snapshot;
    const next=saved[input.persona] ?? {...initialState(),persona:input.persona};
    Object.assign(s,next,{personas:saved});
    return getPersona(s.persona);
  });
  res.json(V.SwitchPersonaResponse.parse(data));
}));
router.get("/policies",route(async(req,res)=>{
  const q=parse(V.ListPoliciesQueryParams,req.query);
  const search=(q.search??"").toLowerCase();
  res.json(V.ListPoliciesResponse.parse(policies.filter(p=>(!q.category || q.category==="All" || p.category===q.category) && `${p.title} ${p.content} ${p.category}`.toLowerCase().includes(search))));
}));
router.get("/conversations",route(async(req,res)=>{
  res.json(V.ListConversationsResponse.parse(await withState(sessionId(req,res),s=>s.conversations)));
}));
router.post("/conversations",route(async(req,res)=>{
  const data=await withState(sessionId(req,res),s=>{
    if(s.conversations.length>=50) throw new HttpError(429,"This demo workspace has reached its 50-conversation limit.");
    const c={id:randomUUID(),title:"New conversation",createdAt:now()};
    s.conversations.unshift(c); return c;
  });
  res.status(201).json(V.CreateConversationResponse.parse(data));
}));
router.get("/conversations/:id/messages",route(async(req,res)=>{
  const {id}=parse(V.ListMessagesParams,req.params);
  res.json(V.ListMessagesResponse.parse(await withState(sessionId(req,res),s=>{conversation(s,id);return s.messages.filter(m=>m.conversationId===id);})));
}));
router.post("/conversations/:id/messages",route(async(req,res)=>{
  const {id}=parse(V.SendMessageParams,req.params);
  const input=parse(V.SendMessageBody,req.body);
  const question=input.content.trim();
  if(!question) throw new HttpError(400,"Please enter a question.");
  const data=await withState(sessionId(req,res),async s=>{
    const c=conversation(s,id);
    if(s.messages.length>=200) throw new HttpError(429,"This demo workspace has reached its message limit.");
    const recent=s.messages.filter(m=>m.role==="user" && Date.parse(m.createdAt)>Date.now()-60000);
    if(recent.length>=10) throw new HttpError(429,"Please wait a minute before sending more questions.");
    const response=await answer(s,id,question,input.retrievalMode??"hybrid");
    const storedQuestion=/\b(my|the)\s+(password|recovery code|mfa code)\s*(is|:|=)/i.test(question) ? "[Credential-like input removed. Do not share secrets.]" : question;
    s.messages.push({id:randomUUID(),conversationId:id,role:"user",content:storedQuestion,createdAt:now(),citations:[],steps:[],latencyMs:0,model:"",abstained:false,ticketId:null,feedback:null},response);
    if(c.title==="New conversation") c.title=storedQuestion.slice(0,65);
    return response;
  });
  res.json(V.SendMessageResponse.parse(data));
}));
router.get("/tickets",route(async(req,res)=>{
  res.json(V.ListTicketsResponse.parse(await withState(sessionId(req,res),s=>s.tickets)));
}));
router.post("/tickets",route(async(req,res)=>{
  const input=parse(V.DraftTicketBody,req.body);
  const data=await withState(sessionId(req,res),s=>{
    if(s.tickets.length>=100) throw new HttpError(429,"Demo ticket limit reached.");
    const ticket=makeTicket(input,getPersona(s.persona).name);
    s.tickets.unshift(ticket);
    trace(s,"Ticket drafted",`${ticket.number} · Awaiting human approval`);
    return ticket;
  });
  res.status(201).json(V.DraftTicketResponse.parse(data));
}));
router.patch("/tickets/:id",route(async(req,res)=>{
  const {id}=parse(V.EditTicketParams,req.params);
  const input=parse(V.EditTicketBody,req.body);
  const data=await withState(sessionId(req,res),s=>{
    const ticket=ticketFor(s,id);
    if(ticket.status!=="draft") throw new HttpError(409,"Submitted tickets cannot be edited.");
    Object.assign(ticket,input);
    ticket.approvalHash=ticketHash(ticket);
    ticket.events.push(`${now()} · Draft edited; previous approval hash invalidated.`);
    trace(s,"Draft updated",`${ticket.number} · Review required again`);
    return ticket;
  });
  res.json(V.EditTicketResponse.parse(data));
}));
router.post("/tickets/:id/approve",route(async(req,res)=>{
  const {id}=parse(V.ApproveTicketParams,req.params);
  const input=parse(V.ApproveTicketBody,req.body);
  const result=await withState(sessionId(req,res),s=>{
    const ticket=ticketFor(s,id);
    const wasSubmitted=ticket.status==="submitted";
    const result=approve(ticket,input.approvalHash,input.simulateFailure);
    if(result.status!==200) trace(s,"Submission blocked",`${ticket.number} · ${result.status===409 ? "Stale approval" : "Simulated connector unavailable"}`);
    else if(!wasSubmitted) trace(s,"Ticket submitted",`${ticket.number} · Human-approved mock connector`);
    return {...result,ticket};
  });
  if(result.error){res.status(result.status).json({error:result.error});return;}
  res.json(V.ApproveTicketResponse.parse(result.ticket));
}));
router.post("/feedback",route(async(req,res)=>{
  const input=parse(V.SubmitFeedbackBody,req.body);
  await withState(sessionId(req,res),s=>{
    const message=s.messages.find(m=>m.id===input.messageId && m.role==="assistant");
    if(!message) throw new HttpError(404,"Answer not found in this workspace.");
    message.feedback=input.rating;
  });
  res.json(V.SubmitFeedbackResponse.parse({status:"recorded"}));
}));
router.get("/analytics",route(async(req,res)=>{
  const data=await withState(sessionId(req,res),s=>{
    const answers=s.messages.filter(m=>m.role==="assistant");
    return {conversations:s.conversations.length,answers:answers.length,
      submittedTickets:s.tickets.filter(t=>t.status==="submitted").length,
      pendingTickets:s.tickets.filter(t=>t.status==="draft").length,
      averageLatencyMs:answers.length?answers.reduce((sum,m)=>sum+m.latencyMs,0)/answers.length:0,
      totalTokens:s.traces.reduce((sum,t)=>sum+t.tokens,0),
      helpfulCount:answers.filter(m=>m.feedback==="helpful").length,
      unhelpfulCount:answers.filter(m=>m.feedback==="unhelpful").length,
      abstentions:answers.filter(m=>m.abstained).length,traces:s.traces};
  });
  res.json(V.GetAnalyticsResponse.parse(data));
}));
router.get("/evaluations",route(async(req,res)=>{
  res.json(V.GetEvaluationsResponse.parse(await withState(sessionId(req,res),s=>s.evaluation??emptyEvaluation())));
}));
router.post("/evaluations",route(async(req,res)=>{
  const data=await withState(sessionId(req,res),s=>{
    s.evaluation=evaluate();
    trace(s,"Evaluation completed",`${s.evaluation.totalCases} measured retrieval and deterministic-control cases`);
    return s.evaluation;
  });
  res.json(V.RunEvaluationResponse.parse(data));
}));
export default router;
