"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Loader2, Copy, CheckCircle, ExternalLink, ChevronDown, ChevronUp,
  Building2, Users, TrendingUp, Target, Mail, MessageSquare, FileText,
  Shield, BarChart2, AlertCircle, Zap, Globe, Briefcase,
} from "lucide-react";
import { api } from "@/lib/api";

// ── types ──────────────────────────────────────────────────────────────────
type Report = Record<string, unknown>;
type Obj = Record<string, unknown>;

function str(v: unknown): string { return typeof v === "string" ? v : ""; }
function arr(v: unknown): unknown[] { return Array.isArray(v) ? v : []; }
function obj(v: unknown): Obj { return (v && typeof v === "object" && !Array.isArray(v)) ? v as Obj : {}; }

// ── helpers ────────────────────────────────────────────────────────────────
const LIME = "#a3ff6e";
const CARD = "#17171d";
const SUB  = "#111116";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{ background: CARD }}>
      {children}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: LIME + "18" }}>
        <Icon className="w-4 h-4" style={{ color: LIME }} />
      </div>
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function Tag({ label, color = "#2a2a35", text = "#888" }: { label: string; color?: string; text?: string }) {
  return (
    <span className="inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium"
      style={{ background: color, color: text }}>
      {label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition flex-shrink-0"
      style={{ background: "#2a2a35", color: done ? LIME : "#888" }}>
      {done ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Expandable({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: SUB }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition">
        <span className="text-sm font-medium text-white">{label}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Section renderers ──────────────────────────────────────────────────────

function CompanyIntelSection({ data }: { data: Obj }) {
  const ci = obj(data.company_intelligence);
  const ts = obj(ci.tech_stack);
  const news = arr(ci.recent_news);
  const prios = arr(ci.strategic_priorities);
  const geo = arr(ci.geographic_presence);
  const ps = arr(ci.products_services);
  const hiring = arr(ci.hiring_trends);

  return (
    <div className="space-y-4">
      <SectionHeading icon={Building2} title="Company Intelligence" subtitle="Web-grounded research via Gemini 2.5 Flash" />

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Industry", value: str(ci.industry) },
          { label: "Segment", value: str(ci.market_segment) },
          { label: "Revenue Estimate", value: str(ci.revenue_estimate) },
          { label: "Employees", value: str(ci.employee_count) },
          { label: "Current CRM", value: str(ts.crm) || "Unknown" },
          { label: "Funding", value: str(ci.funding_history) || "Unknown" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl px-4 py-3" style={{ background: SUB }}>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {str(ci.overview) && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Overview</p>
          <p className="text-sm text-gray-300 leading-relaxed">{str(ci.overview)}</p>
        </Card>
      )}

      {str(ci.business_model) && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Business Model</p>
          <p className="text-sm text-gray-300 leading-relaxed">{str(ci.business_model)}</p>
        </Card>
      )}

      {ps.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Products & Services</p>
          <ul className="space-y-1.5">
            {ps.map((p, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span style={{ color: LIME }}>•</span>{str(p)}</li>)}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {geo.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-1.5"><Globe className="w-3 h-3" /> Geography</p>
            <div className="flex flex-wrap gap-1.5">
              {geo.map((g, i) => <Tag key={i} label={str(g)} />)}
            </div>
          </Card>
        )}

        {prios.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Strategic Priorities</p>
            <ul className="space-y-1.5">
              {prios.map((p, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span style={{ color: LIME }}>→</span>{str(p)}</li>)}
            </ul>
          </Card>
        )}
      </div>

      {news.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Recent News</p>
          <div className="space-y-3">
            {news.map((n, i) => {
              const no = obj(n);
              return (
                <div key={i} className="border-l-2 pl-3" style={{ borderColor: LIME + "60" }}>
                  <p className="text-sm font-medium text-white">{str(no.headline)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{str(no.date)}</p>
                  {str(no.relevance) && <p className="text-xs mt-1" style={{ color: LIME }}>{str(no.relevance)}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {hiring.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-1.5"><Briefcase className="w-3 h-3" /> Hiring Trends</p>
          <ul className="space-y-1.5">
            {hiring.map((h, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span style={{ color: "#f97316" }}>📌</span>{str(h)}</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StakeholderSection({ data }: { data: Obj }) {
  const people = arr(data.stakeholder_mapping);
  return (
    <div className="space-y-4">
      <SectionHeading icon={Users} title="Stakeholder Mapping" subtitle={`${people.length} decision-makers identified`} />
      {people.map((p, i) => {
        const po = obj(p);
        const pains = arr(po.pain_points);
        return (
          <Card key={i}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">{str(po.name)}</p>
                  {str(po.linkedin_url) && (
                    <a href={str(po.linkedin_url)} target="_blank" rel="noopener noreferrer"
                      className="text-gray-600 hover:text-blue-400 transition">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500">{str(po.role)}</p>
              </div>
              <Tag label="Key Contact" color={LIME + "22"} text={LIME} />
            </div>
            {str(po.relevance) && (
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">{str(po.relevance)}</p>
            )}
            {pains.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">Pain Points</p>
                <div className="flex flex-wrap gap-1.5">
                  {pains.map((pp, j) => <Tag key={j} label={str(pp)} color="#2a1a1a" text="#f87171" />)}
                </div>
              </div>
            )}
            {str(po.outreach_angle) && (
              <div className="rounded-xl px-3 py-2.5" style={{ background: SUB }}>
                <p className="text-xs font-medium mb-1" style={{ color: LIME }}>Outreach Angle</p>
                <p className="text-xs text-gray-300">{str(po.outreach_angle)}</p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function CompetitiveSection({ data }: { data: Obj }) {
  const cl = obj(data.competitive_landscape);
  const weaknesses = arr(cl.current_crm_weaknesses);
  const vendors = arr(cl.competing_crm_vendors_pitching);
  const gaps = arr(cl.competitor_positioning_gaps);
  const migrations = arr(cl.crm_migration_examples_in_industry);
  const biz = arr(cl.direct_business_competitors);

  return (
    <div className="space-y-4">
      <SectionHeading icon={Shield} title="Competitive Landscape" />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-gray-500 mb-1">Current CRM</p>
          <p className="text-xl font-bold" style={{ color: "#f97316" }}>{str(cl.current_crm) || "Unknown"}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-2">Competing Vendors Pitching Them</p>
          <div className="flex flex-wrap gap-1.5">
            {vendors.length ? vendors.map((v, i) => <Tag key={i} label={str(v)} color="#1a1a2e" text="#818cf8" />) : <span className="text-xs text-gray-600">Unknown</span>}
          </div>
        </Card>
      </div>

      {weaknesses.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Current CRM Weaknesses (Our Opening)</p>
          <ul className="space-y-2">
            {weaknesses.map((w, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-red-400">⚠</span>{str(w)}</li>)}
          </ul>
        </Card>
      )}

      {gaps.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Competitor Positioning Gaps We Can Exploit</p>
          <ul className="space-y-2">
            {gaps.map((g, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span style={{ color: LIME }}>✓</span>{str(g)}</li>)}
          </ul>
        </Card>
      )}

      {migrations.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">CRM Migrations in Similar Companies</p>
          <ul className="space-y-1.5">
            {migrations.map((m, i) => <li key={i} className="text-xs text-gray-400 flex gap-2"><span style={{ color: "#60a5fa" }}>↪</span>{str(m)}</li>)}
          </ul>
        </Card>
      )}

      {biz.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Their Business Competitors</p>
          <div className="flex flex-wrap gap-2">
            {biz.map((b, i) => <Tag key={i} label={str(b)} />)}
          </div>
        </Card>
      )}
    </div>
  );
}

function SalesOpportunitySection({ data }: { data: Obj }) {
  const so = obj(data.sales_opportunity);
  const signals = arr(so.buying_signals);
  const triggers = arr(so.trigger_events);
  const growth = arr(so.growth_indicators);
  const challenges = arr(so.sales_cycle_challenges);

  const probColor = (p: string) => p?.toLowerCase().startsWith("high") ? "#22c55e" : p?.toLowerCase().startsWith("med") ? "#f97316" : "#ef4444";

  return (
    <div className="space-y-4">
      <SectionHeading icon={TrendingUp} title="Sales Opportunity Analysis" />

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-gray-500 mb-1">Deal Size Estimate</p>
          <p className="text-lg font-bold" style={{ color: LIME }}>{str(so.deal_size_estimate) || "—"}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Conversion Probability</p>
          <p className="text-lg font-bold" style={{ color: probColor(str(so.conversion_probability)) }}>
            {str(so.conversion_probability).split(" ")[0] || "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Best Entry Point</p>
          <p className="text-xs font-semibold text-white leading-tight">{str(so.recommended_entry_point) || "—"}</p>
        </Card>
      </div>

      {str(so.why_now) && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Why Now</p>
          <p className="text-sm text-gray-300 leading-relaxed">{str(so.why_now)}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {signals.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Buying Signals</p>
            <ul className="space-y-2">
              {signals.map((s, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span style={{ color: LIME }}>●</span>{str(s)}</li>)}
            </ul>
          </Card>
        )}
        {triggers.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Trigger Events</p>
            <ul className="space-y-2">
              {triggers.map((t, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span style={{ color: "#f97316" }}>⚡</span>{str(t)}</li>)}
            </ul>
          </Card>
        )}
        {growth.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Growth Indicators</p>
            <ul className="space-y-2">
              {growth.map((g, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span style={{ color: "#34d399" }}>↑</span>{str(g)}</li>)}
            </ul>
          </Card>
        )}
        {challenges.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Sales Cycle Challenges</p>
            <ul className="space-y-2">
              {challenges.map((c, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-red-400">!</span>{str(c)}</li>)}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function ABMSection({ data }: { data: Obj }) {
  const abm = obj(data.abm_strategy);
  const personas = arr(abm.target_personas);
  const themes = arr(abm.messaging_themes);
  const campaigns = arr(abm.campaign_ideas);
  const content = arr(abm.content_recommendations);
  const events = arr(abm.event_opportunities);
  const partners = arr(abm.partnership_opportunities);

  return (
    <div className="space-y-4">
      <SectionHeading icon={Target} title="Account-Based Marketing Strategy" />

      {personas.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Target Personas</p>
          <div className="space-y-3">
            {personas.map((p, i) => {
              const po = obj(p);
              return (
                <div key={i} className="rounded-xl p-3" style={{ background: SUB }}>
                  <Tag label={str(po.role)} color={LIME + "22"} text={LIME} />
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">{str(po.messaging)}</p>
                  {str(po.hook) && <p className="text-xs mt-1.5 font-medium" style={{ color: "#818cf8" }}>Hook: {str(po.hook)}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {str(abm.pain_point_positioning) && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Pain-Point Positioning</p>
          <p className="text-sm text-gray-300 leading-relaxed">{str(abm.pain_point_positioning)}</p>
        </Card>
      )}

      {themes.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Messaging Themes</p>
          <div className="flex flex-wrap gap-2">
            {themes.map((t, i) => <Tag key={i} label={str(t)} color="#1a2535" text="#60a5fa" />)}
          </div>
        </Card>
      )}

      {campaigns.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Campaign Ideas</p>
          <div className="space-y-3">
            {campaigns.map((c, i) => {
              const co = obj(c);
              return (
                <div key={i} className="rounded-xl p-3" style={{ background: SUB }}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white">{str(co.name)}</p>
                    <Tag label={str(co.channel)} color="#1a2535" text="#60a5fa" />
                  </div>
                  <p className="text-xs text-gray-400">{str(co.description)}</p>
                  {str(co.kpi) && <p className="text-xs mt-1" style={{ color: LIME }}>KPI: {str(co.kpi)}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {events.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Event Opportunities</p>
            <ul className="space-y-1.5">
              {events.map((e, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span style={{ color: "#c084fc" }}>📅</span>{str(e)}</li>)}
            </ul>
          </Card>
        )}
        {partners.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Partnership Opportunities</p>
            <ul className="space-y-1.5">
              {partners.map((p, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span style={{ color: "#34d399" }}>🤝</span>{str(p)}</li>)}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function OutreachSection({ data }: { data: Obj }) {
  const os = obj(data.outreach_strategy);
  const emails = arr(os.email_sequence);
  const li = obj(os.linkedin_strategy);
  const call = obj(os.call_strategy);
  const liFollowUp = arr(li.follow_up_sequence);
  const liTopics = arr(li.content_topics_to_engage_on);
  const qualQs = arr(call.qualification_questions);
  const objections = arr(call.objection_handling);

  return (
    <div className="space-y-4">
      <SectionHeading icon={Mail} title="Multi-Channel Outreach Strategy" />

      {/* Email Sequence */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">5-Email Outbound Sequence</p>
        <div className="space-y-3">
          {emails.map((e, i) => {
            const eo = obj(e);
            return (
              <Expandable key={i} label={`Email ${eo.email_number ?? i + 1} — ${str(eo.timing)} — "${str(eo.subject)}"`}>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: LIME }}>Subject: {str(eo.subject)}</p>
                    <CopyButton text={`Subject: ${str(eo.subject)}\n\n${str(eo.body)}`} />
                  </div>
                  <div className="rounded-xl p-3 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap"
                    style={{ background: "#0d0d10" }}>
                    {str(eo.body)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {str(eo.personalization_note) && (
                      <div className="rounded-lg p-2.5" style={{ background: SUB }}>
                        <p className="text-gray-500 mb-1">Personalize</p>
                        <p className="text-gray-300">{str(eo.personalization_note)}</p>
                      </div>
                    )}
                    {str(eo.cta) && (
                      <div className="rounded-lg p-2.5" style={{ background: SUB }}>
                        <p className="text-gray-500 mb-1">CTA</p>
                        <p style={{ color: LIME }}>{str(eo.cta)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Expandable>
            );
          })}
        </div>
      </div>

      {/* LinkedIn */}
      {(str(li.connection_request) || str(li.first_message)) && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> LinkedIn Strategy
          </p>
          <div className="space-y-3">
            {[
              { label: "Connection Request", text: str(li.connection_request) },
              { label: "First Message", text: str(li.first_message) },
              { label: "Warm-Up Plan", text: str(li.warm_up_plan) },
            ].map(({ label, text }) => text ? (
              <div key={label} className="rounded-xl p-3" style={{ background: SUB }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-500">{label}</p>
                  <CopyButton text={text} />
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{text}</p>
              </div>
            ) : null)}
            {liFollowUp.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: SUB }}>
                <p className="text-xs font-medium text-gray-500 mb-2">Follow-Up Sequence</p>
                <ul className="space-y-2">
                  {liFollowUp.map((f, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span style={{ color: "#60a5fa" }}>{i + 1}.</span>{str(f)}</li>)}
                </ul>
              </div>
            )}
            {liTopics.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: SUB }}>
                <p className="text-xs font-medium text-gray-500 mb-2">Content Topics to Engage On</p>
                <div className="flex flex-wrap gap-1.5">
                  {liTopics.map((t, i) => <Tag key={i} label={str(t)} color="#1a2535" text="#60a5fa" />)}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Call */}
      {(str(call.opener) || qualQs.length > 0) && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">Call Strategy</p>
          <div className="space-y-3">
            {str(call.opener) && (
              <div className="rounded-xl p-3" style={{ background: SUB }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-500">Discovery Call Opener</p>
                  <CopyButton text={str(call.opener)} />
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{str(call.opener)}</p>
              </div>
            )}
            {qualQs.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: SUB }}>
                <p className="text-xs font-medium text-gray-500 mb-2">Qualification Questions</p>
                <ol className="space-y-1.5">
                  {qualQs.map((q, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span style={{ color: LIME }}>{i + 1}.</span>{str(q)}</li>)}
                </ol>
              </div>
            )}
            {objections.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: SUB }}>
                <p className="text-xs font-medium text-gray-500 mb-2">Objection Handling</p>
                <div className="space-y-2">
                  {objections.map((o, i) => {
                    const oo = obj(o);
                    return (
                      <div key={i}>
                        <p className="text-xs text-red-400 font-medium">"{str(oo.objection)}"</p>
                        <p className="text-xs text-gray-300 mt-0.5 pl-2">{str(oo.response)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {str(call.meeting_booking_script) && (
              <div className="rounded-xl p-3" style={{ background: SUB }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-500">Meeting Booking Script</p>
                  <CopyButton text={str(call.meeting_booking_script)} />
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{str(call.meeting_booking_script)}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function ContentSection({ data }: { data: Obj }) {
  const cr = obj(data.content_recommendations);
  const blogs = arr(cr.blog_topics);
  const whitepapers = arr(cr.whitepaper_ideas);
  const cases = arr(cr.case_study_recommendations);
  const insights = arr(cr.industry_insights_to_share);
  const tl = arr(cr.thought_leadership_angles);

  return (
    <div className="space-y-4">
      <SectionHeading icon={FileText} title="Content & Marketing Recommendations" />
      <div className="grid grid-cols-2 gap-4">
        {blogs.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Blog Topics</p>
            <ul className="space-y-3">
              {blogs.map((b, i) => {
                const bo = obj(b);
                return (
                  <li key={i}>
                    <p className="text-xs font-semibold text-white">{str(bo.title) || str(b)}</p>
                    {str(bo.rationale) && <p className="text-xs text-gray-500 mt-0.5">{str(bo.rationale)}</p>}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        {whitepapers.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Whitepaper Ideas</p>
            <ul className="space-y-3">
              {whitepapers.map((w, i) => {
                const wo = obj(w);
                return (
                  <li key={i}>
                    <p className="text-xs font-semibold text-white">{str(wo.title) || str(w)}</p>
                    {str(wo.angle) && <p className="text-xs text-gray-500 mt-0.5">{str(wo.angle)}</p>}
                    {str(wo.target_persona) && <Tag label={str(wo.target_persona)} />}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        {cases.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Case Studies</p>
            <ul className="space-y-3">
              {cases.map((c, i) => {
                const co = obj(c);
                return (
                  <li key={i}>
                    <p className="text-xs font-semibold text-white">{str(co.type) || str(c)}</p>
                    {str(co.outcome) && <p className="text-xs text-gray-500 mt-0.5">Outcome: {str(co.outcome)}</p>}
                    {str(co.relevance) && <p className="text-xs mt-0.5" style={{ color: LIME }}>{str(co.relevance)}</p>}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        {tl.length > 0 && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Thought Leadership</p>
            <ul className="space-y-3">
              {tl.map((t, i) => {
                const to = obj(t);
                return (
                  <li key={i}>
                    <p className="text-xs font-semibold text-white">{str(to.topic) || str(t)}</p>
                    {str(to.hook) && <p className="text-xs text-gray-500 mt-0.5">{str(to.hook)}</p>}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
      {insights.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Industry Insights to Share</p>
          <ul className="space-y-2">
            {insights.map((ins, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span style={{ color: "#60a5fa" }}>💡</span>{str(ins)}</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}

function BattlecardSection({ data }: { data: Obj }) {
  const cards = arr(data.competitive_battlecard);
  return (
    <div className="space-y-4">
      <SectionHeading icon={BarChart2} title="Competitive Battlecard" />
      {cards.map((c, i) => {
        const co = obj(c);
        const weaknesses = arr(co.weaknesses);
        const strengths = arr(co.strengths);
        const complaints = arr(co.common_customer_complaints);
        const counter = arr(co.counter_messaging);
        return (
          <Card key={i}>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-lg font-bold text-white">{str(co.competitor)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-xl p-3" style={{ background: SUB }}>
                <p className="text-xs font-semibold text-green-400 mb-2">Their Strengths</p>
                <ul className="space-y-1">
                  {strengths.map((s, j) => <li key={j} className="text-xs text-gray-300 flex gap-2"><span>+</span>{str(s)}</li>)}
                </ul>
              </div>
              <div className="rounded-xl p-3" style={{ background: SUB }}>
                <p className="text-xs font-semibold text-red-400 mb-2">Their Weaknesses</p>
                <ul className="space-y-1">
                  {weaknesses.map((w, j) => <li key={j} className="text-xs text-gray-300 flex gap-2"><span>−</span>{str(w)}</li>)}
                </ul>
              </div>
            </div>
            {complaints.length > 0 && (
              <div className="rounded-xl p-3 mb-3" style={{ background: SUB }}>
                <p className="text-xs font-semibold text-orange-400 mb-2">Customer Complaints (G2/Capterra)</p>
                <ul className="space-y-1">
                  {complaints.map((c, j) => <li key={j} className="text-xs text-gray-300 flex gap-2"><span>⚠</span>{str(c)}</li>)}
                </ul>
              </div>
            )}
            {str(co.our_positioning_against_them) && (
              <div className="rounded-xl p-3 mb-3" style={{ background: LIME + "12", border: `1px solid ${LIME}30` }}>
                <p className="text-xs font-semibold mb-1" style={{ color: LIME }}>Our Positioning</p>
                <p className="text-xs text-gray-300">{str(co.our_positioning_against_them)}</p>
              </div>
            )}
            {counter.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: SUB }}>
                <p className="text-xs font-semibold text-gray-500 mb-2">Counter-Messaging</p>
                <ul className="space-y-1.5">
                  {counter.map((cm, j) => <li key={j} className="text-xs text-gray-300 flex gap-2"><span style={{ color: LIME }}>→</span>{str(cm)}</li>)}
                </ul>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ExecSummarySection({ data }: { data: Obj }) {
  const es = obj(data.executive_summary);
  const insights = arr(es.top_5_insights);
  const plan = arr(es.thirty_day_plan);

  return (
    <div className="space-y-4">
      <SectionHeading icon={Zap} title="Executive Summary" subtitle="Top-line intelligence for decision-makers" />

      {insights.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">Top 5 Insights</p>
          <ol className="space-y-3">
            {insights.map((ins, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: LIME + "22", color: LIME }}>
                  {i + 1}
                </span>
                <p className="text-sm text-gray-300 leading-relaxed">{str(ins)}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {str(es.biggest_opportunity) && (
          <Card>
            <p className="text-xs font-semibold mb-2" style={{ color: LIME }}>🎯 Biggest Opportunity</p>
            <p className="text-sm text-gray-300 leading-relaxed">{str(es.biggest_opportunity)}</p>
          </Card>
        )}
        {str(es.biggest_risk) && (
          <Card>
            <p className="text-xs font-semibold text-red-400 mb-2">⚠ Biggest Risk</p>
            <p className="text-sm text-gray-300 leading-relaxed">{str(es.biggest_risk)}</p>
          </Card>
        )}
      </div>

      {str(es.recommended_next_action) && (
        <div className="rounded-2xl p-5" style={{ background: LIME + "15", border: `1px solid ${LIME}40` }}>
          <p className="text-xs font-semibold mb-2" style={{ color: LIME }}>Recommended Next Action (Next 48h)</p>
          <p className="text-sm text-white font-medium leading-relaxed">{str(es.recommended_next_action)}</p>
        </div>
      )}

      {plan.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">30-Day Engagement Plan</p>
          <div className="space-y-3">
            {plan.map((p, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-16 flex-shrink-0">
                  <span className="text-xs font-bold" style={{ color: LIME }}>Week {i + 1}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{str(p)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Tab config ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "company",      label: "Company Intel",   icon: Building2,     Component: CompanyIntelSection },
  { id: "stakeholders", label: "Stakeholders",    icon: Users,         Component: StakeholderSection },
  { id: "competitive",  label: "Competitive",     icon: Shield,        Component: CompetitiveSection },
  { id: "sales",        label: "Sales Opp",       icon: TrendingUp,    Component: SalesOpportunitySection },
  { id: "abm",          label: "ABM Strategy",    icon: Target,        Component: ABMSection },
  { id: "outreach",     label: "Outreach",        icon: Mail,          Component: OutreachSection },
  { id: "content",      label: "Content",         icon: FileText,      Component: ContentSection },
  { id: "battlecard",   label: "Battlecard",      icon: BarChart2,     Component: BattlecardSection },
  { id: "summary",      label: "Exec Summary",    icon: Zap,           Component: ExecSummarySection },
];

// ── Main view ──────────────────────────────────────────────────────────────
export default function ResearchView() {
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  async function handleStart() {
    if (!companyName.trim() || !companyUrl.trim()) return;
    setError(null); setReport(null); setProgress(0); setActiveTab("company");

    try {
      const res = await api.startResearch(companyName.trim(), companyUrl.trim());
      setJobId(res.job_id);
      setStatus("running");
      setMessage("Starting research…");

      pollRef.current = setInterval(async () => {
        try {
          const s = await api.getResearchStatus(res.job_id);
          setProgress(s.progress_pct);
          setMessage(s.message);
          setStatus(s.status);

          if (s.status === "completed") {
            stopPolling();
            const r = await api.getResearchReport(res.job_id);
            setReport(r as Report);
          } else if (s.status === "failed") {
            stopPolling();
            setError(s.error ?? "Research failed");
          }
        } catch { /* poll will retry */ }
      }, 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not reach backend");
    }
  }

  const meta = report ? obj(obj(report._meta as unknown)) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Input bar */}
      <div className="flex-shrink-0 px-7 pt-6 pb-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">Sales Intelligence Research</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Powered by Gemini 2.5 Flash (Google Search Grounding) + Claude Sonnet — 9-section B2B intelligence report
          </p>
        </div>

        <div className="flex gap-3">
          <input value={companyName} onChange={e => setCompanyName(e.target.value)}
            placeholder="Company name  (e.g. Freshworks)"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "#17171d", border: "1px solid #2a2a35" }} />
          <input value={companyUrl} onChange={e => setCompanyUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && status !== "running") handleStart(); }}
            placeholder="Website URL  (e.g. freshworks.com)"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "#17171d", border: "1px solid #2a2a35" }} />
          <button onClick={handleStart}
            disabled={status === "running" || !companyName.trim() || !companyUrl.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 flex items-center gap-2"
            style={{ background: LIME, color: "#111" }}>
            {status === "running" ? <><Loader2 className="w-4 h-4 animate-spin" /> Researching…</> : <><Search className="w-4 h-4" /> Research</>}
          </button>
        </div>

        {/* Progress */}
        {status === "running" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">{message}</span>
              <span className="text-xs font-mono" style={{ color: LIME }}>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#2a2a35" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: LIME }} />
            </div>
            <p className="text-xs text-gray-600 mt-1.5">This takes 2–4 minutes. Gemini is searching the web in real-time.</p>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 px-4 py-3 rounded-xl"
            style={{ background: "#2a0a0a", border: "1px solid #5a1010" }}>
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {meta && (
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
            <span>Research: {str(meta.research_model as unknown)}</span>
            <span>•</span>
            <span>Analysis: {str(meta.analysis_model as unknown)}</span>
          </div>
        )}
      </div>

      {/* Report */}
      {report && (
        <div className="flex-1 flex overflow-hidden">
          {/* Tab sidebar */}
          <div className="flex-shrink-0 w-44 overflow-y-auto py-2 px-3 space-y-1"
            style={{ borderRight: "1px solid #1e1e28" }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition text-xs font-medium"
                style={{
                  background: activeTab === id ? "#1e1e28" : "transparent",
                  color: activeTab === id ? "#fff" : "#666",
                }}>
                {activeTab === id && <span className="absolute left-3 w-0.5 h-4 rounded-r-full" style={{ background: LIME }} />}
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-7 py-5">
            {TABS.map(({ id, Component }) =>
              activeTab === id ? <Component key={id} data={report} /> : null
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!report && status !== "running" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: LIME + "15" }}>
            <Search className="w-7 h-7" style={{ color: LIME }} />
          </div>
          <h3 className="text-white font-semibold mb-2">Enter a company to research</h3>
          <p className="text-sm text-gray-600 max-w-sm">
            Get a 9-section intelligence report: company overview, stakeholder map, competitive landscape,
            ABM strategy, 5-email sequences, LinkedIn scripts, call playbooks, and more.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-gray-600 max-w-lg">
            {["Gemini Search Grounding (real-time web)", "Claude Sonnet structured analysis", "9 sections · ~3 min"].map(f => (
              <div key={f} className="rounded-xl px-3 py-2" style={{ background: "#17171d" }}>{f}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
