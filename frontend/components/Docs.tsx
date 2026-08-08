"use client"

import type { Health } from "@/lib/api"
import {
  AlertIcon,
  BookIcon,
  ChatIcon,
  FileIcon,
  FolderIcon,
  GridIcon,
  ScaleIcon,
  ShieldIcon,
} from "./Icons"

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] text-ink-2">
      <span className="text-ink-4">{label + ": "}</span>
      {value}
    </span>
  )
}

function Fact({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <p className="text-[13px] font-semibold">{title}</p>
      <p className="mt-1.5 text-[12px] leading-5 text-ink-3">{body}</p>
    </div>
  )
}

function Section({
  title,
  lead,
  children,
}: {
  title: string
  lead?: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
      {lead ? (
        <p className="mt-1.5 max-w-3xl text-[13px] leading-6 text-ink-3">{lead}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Step({
  index,
  title,
  body,
}: {
  index: number
  title: string
  body: string
}) {
  return (
    <div className="flex gap-4 border-b border-line px-5 py-4 last:border-0">
      <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
        {index}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{title}</span>
        <span className="mt-1 block max-w-3xl text-[12px] leading-5 text-ink-3">
          {body}
        </span>
      </span>
    </div>
  )
}

function Screen({
  icon,
  title,
  body,
}: {
  icon: (props: { className?: string }) => JSX.Element
  title: string
  body: string
}) {
  const Icon = icon
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-[13px] font-medium">{title}</p>
      <p className="mt-1 text-[12px] leading-5 text-ink-3">{body}</p>
    </div>
  )
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-4 border-b border-line px-5 py-3 last:border-0">
      <span className="text-[12px] font-medium text-ink-2">{left}</span>
      <span className="text-[12px] leading-5 text-ink-3">{right}</span>
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[13px] leading-6 text-ink-2">
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-4" />
          <span className="max-w-3xl">{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Docs({ health }: { health: Health | null }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-line bg-accent-soft px-8 py-12">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-accent">
          DOCUMENTATION
        </p>
        <h1 className="mt-3 text-[38px] font-semibold leading-[1.1] tracking-tight">
          Litigate
        </h1>
        <p className="mt-3 max-w-3xl text-[16px] leading-7 text-ink-2">
          A contract review copilot that measures an agreement against your own
          written policy, proves every problem it reports against the wording of
          the clause it came from, and then explains the consequence in language
          a non-lawyer can act on.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Chip label="API" value={health ? health.status : "offline"} />
          <Chip label="Version" value={health ? health.version : "unknown"} />
          <Chip label="Model provider" value={health ? health.provider : "unknown"} />
          <Chip
            label="Playbook"
            value={health?.playbook ? health.playbook : "not loaded"}
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Fact
            title="Rules decide, the model explains"
            body="Whether something is a breach is decided by a deterministic rule engine, so the same contract always produces the same findings. The model is never asked to judge."
          />
          <Fact
            title="Every finding quotes the contract"
            body="A finding is only shown if the sentence it quotes is found in that clause. On the demo agreement all sixteen findings pass that check."
          />
          <Fact
            title="The API keeps nothing"
            body="Analysis happens inside the request. No contract text is written to a server database, and your history lives in your own account."
          />
        </div>
      </div>

      <div className="px-8 py-9 pb-16">
        <Section
          title="What it is for"
          lead="Contract review is slow because the knowledge is in someone's head. A reviewer knows the company will not accept ninety day payment terms or a liability cap worth a fraction of the deal, but that knowledge is not written anywhere a machine can check."
        >
          <Bullets
            items={[
              "The company position is written down once, as a playbook of rules with real thresholds, and every contract is measured against it the same way.",
              "A reviewer sees the breaches in seconds instead of reading forty nine clauses looking for them.",
              "Because each finding names the rule and quotes the clause, a disagreement is about the policy, not about whether the tool is right.",
              "The owner of the contract is told automatically when an agreement lands in the high risk band, rather than finding out after signature.",
            ]}
          />
        </Section>

        <Section
          title="How a contract moves through it"
          lead="Seven steps, in order. Only the last two involve a language model, and both of them run after the findings already exist."
        >
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <Step
              index={1}
              title="The file is read in the browser and sent once"
              body="A PDF, Word file, text or markdown file up to eight megabytes. Files chosen from Google Drive are downloaded by the browser and handed to the same path, so the API never talks to Google."
            />
            <Step
              index={2}
              title="Text is extracted and normalised"
              body="PyMuPDF for PDFs and python-docx for Word, including table rows. Page numbers and words broken across a line are cleaned up. A scan with no selectable text is rejected with a clear message rather than analysed badly."
            />
            <Step
              index={3}
              title="The document is split into clauses"
              body="Numbering styles are detected, headings are separated from bodies, and very short fragments are merged into the clause above them. The demo agreement resolves to forty nine clauses."
            />
            <Step
              index={4}
              title="Each clause is classified"
              body="Fourteen types, from payment terms to audit rights, scored by keyword weight with a hit in the heading counting for more than one in the body. A clause matching nothing is left as other and no rule is applied to it."
            />
            <Step
              index={5}
              title="The rule engine runs"
              body="Each rule is tried against clauses of its own type that are long enough to carry an obligation. It measures days, months, amounts and phrases, and records both what it observed and the exact sentence it observed it in."
            />
            <Step
              index={6}
              title="Every finding is grounded"
              body="The quoted sentence is checked back against the clause text. Anything that cannot be located is marked rather than trusted, which is what stops a confident but invented citation reaching the screen."
            />
            <Step
              index={7}
              title="The model rewords what was proved"
              body="Findings are sent for a plain English pass in a second request, so the register is already usable if the model is slow or unavailable. The assistant answers questions from the same clauses and cites the ones it used."
            />
          </div>
        </Section>

        <Section
          title="What verified means here"
          lead="This is the part worth being precise about, because it is easy to assume more than the system claims."
        >
          <Bullets
            items={[
              "A finding is verified against your policy. The threshold it breached is a line in the playbook, written by whoever owns contracting standards.",
              "A finding is verified against the document. The sentence it quotes has to appear in the clause it is attributed to, or the finding does not count as grounded.",
              "A finding is not verified against legislation. There is no statute database and no case law lookup in this system, so it cannot tell you that a clause is unlawful, only that it breaks a rule you wrote.",
              "Mapping individual playbook rules to the regulations that motivated them is future work, and would be the honest place to add a legal source.",
            ]}
          />
        </Section>

        <Section
          title="The playbook"
          lead="One file holds the whole company position. It is readable in the Playbook view so nobody has to take the findings on trust."
        >
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <Row
              left="Rules"
              right="Seventeen, each naming the clause type it applies to, a severity, the check to run, and the policy sentence shown to the reader."
            />
            <Row
              left="Required clauses"
              right="Five types that must be present at all. A contract with no audit rights or no liability cap is flagged for the absence, which reading alone tends to miss."
            />
            <Row
              left="Checks available"
              right="A maximum number of days, a minimum number of months, a minimum cap as a share of contract value, a forbidden phrase, and a required phrase."
            />
            <Row
              left="Length gate"
              right="Clauses under twenty five words are skipped, because a heading or a cross reference cannot carry the obligation a rule is looking for."
            />
            <Row
              left="Conflicts"
              right="Deliberately not resolved. If two rules fire on one clause both findings stand, because severity belongs to the rule and merging them would hide one of the two problems."
            />
          </div>
        </Section>

        <Section
          title="How the risk score is built"
          lead="A single number has to survive comparison between a bad contract and a much worse one, so it is a weighted total put through a curve rather than a percentage."
        >
          <Bullets
            items={[
              "Each finding contributes by severity: eighteen points for high, nine for medium, four for low.",
              "Up to sixty the total is used directly. Above sixty it is compressed towards a ceiling of ninety nine, so a very bad contract still scores higher than a bad one instead of both reading as a hundred.",
              "Sixty and above is the high band, thirty and above is medium, below that is low.",
              "The demo agreement scores ninety five from nine high, six medium and one low finding.",
            ]}
          />
        </Section>

        <Section
          title="Where the model is used, and where it is not"
          lead="Two calls, both narrow, both after the facts exist."
        >
          <Bullets
            items={[
              "The briefing pass rewords proven findings into a plain summary, an impact line and something to ask for. It is told to treat each finding as established fact, so it cannot argue a breach away.",
              "The assistant answers questions using only the clauses of the open contract, with citations filtered against the clause identifiers that actually exist. It cannot cite a clause that is not there.",
              "Groq serves both, with a reasoning model for quality and a fast model for light work, and a chain of alternatives if a model is retired. Responses are cached by content hash so a repeated demo costs nothing.",
              "There is no vector database, no embeddings and no retrieval step. A contract is small enough to pass exactly, which is stronger than retrieving an approximation because the citation can then be checked by matching text.",
              "No model was trained or fine tuned. Findings have to be reproducible and explainable, and weights are neither.",
            ]}
          />
        </Section>

        <Section title="The screens">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Screen
              icon={GridIcon}
              title="Dashboard"
              body="Risk score, severity split, commercial exposure, and the highest severity findings with the clause each came from."
            />
            <Screen
              icon={FolderIcon}
              title="Documents"
              body="Everything saved to your account, filterable by risk band, plus clause category folders that open the register narrowed to that group."
            />
            <Screen
              icon={ScaleIcon}
              title="Contract Review"
              body="The clause list beside the findings, so you read the wording and the objection to it at the same time."
            />
            <Screen
              icon={AlertIcon}
              title="Risk Register"
              body="Every proven breach with its rule, what was measured, and whether the evidence was located in the clause."
            />
            <Screen
              icon={ChatIcon}
              title="Assistant"
              body="Questions answered from the open contract only, with the clauses it used shown as chips under the answer."
            />
            <Screen
              icon={BookIcon}
              title="Playbook"
              body="The rules themselves, so a finding can be traced to the policy line behind it without reading code."
            />
            <Screen
              icon={ShieldIcon}
              title="Notifications"
              body="Raised from analyses that actually ran. Each entry opens the clause or document it describes."
            />
            <Screen
              icon={FileIcon}
              title="Settings"
              body="Which integrations are live for this deployment, the signed in account, and where alerts are sent."
            />
          </div>
        </Section>

        <Section
          title="Architecture and stack"
          lead="A static frontend and a stateless API, chosen so the analysis path has as few moving parts as possible."
        >
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <Row
              left="Frontend"
              right="Next.js and React with TypeScript and Tailwind, exported as static files and served from Cloudflare. All data is fetched in the browser after hydration."
            />
            <Row
              left="Backend"
              right="FastAPI under Uvicorn, in a container on Render. Seven dependencies in total, including PyMuPDF and python-docx for reading files."
            />
            <Row
              left="Model"
              right="Groq, with a reasoning model, a fast model, a fallback chain and an on disk response cache."
            />
            <Row
              left="Authentication"
              right="Supabase, with email and password or Google sign in. The API verifies a token by asking Supabase about it, so a revoked session stops working immediately."
            />
            <Row
              left="Storage"
              right="Supabase Postgres, holding saved analyses per account with row level security. The API itself stores nothing."
            />
            <Row
              left="Email"
              right="Resend. A high risk contract triggers a report to the signed in account in a background task, so a mail failure can never fail an upload."
            />
            <Row
              left="Ingestion"
              right="Google Drive through the file picker, including importing a whole policy library from one file of links. The scope granted only covers files you pick."
            />
          </div>
        </Section>

        <Section
          title="Security and data handling"
          lead="What the system can reach, and what it deliberately cannot."
        >
          <Bullets
            items={[
              "The Drive scope is the narrow one, so the answer to whether it can read your whole Drive is no. It sees only the files chosen in the picker.",
              "Alert email goes to the address on the verified session. The address in the request body is ignored when authentication is switched on, which stops the send endpoint being used as a relay.",
              "Saved analyses are isolated per account by row level security in the database, not by a filter in the browser.",
              "Uploads are capped at eight megabytes and rejected with a reason rather than truncated.",
              "Isolation today is per user rather than per organisation, and there is no audit log. Both are named in the limits below rather than implied away.",
            ]}
          />
        </Section>

        <Section
          title="Limits"
          lead="Written down on purpose. A review tool that hides its edges is worse than one that names them."
        >
          <Bullets
            items={[
              "Scanned documents are not supported. There is no OCR, so a photographed contract is refused instead of half read.",
              "Classification is keyword driven, so an unusually worded clause can be typed wrongly and escape the rules meant for it.",
              "Amount and duration detection reads the largest or smallest figure in a clause, which can mislead where several unrelated numbers appear together.",
              "There is no scheduled monitoring yet. Documents are analysed when they are submitted, not watched for change.",
              "Isolation is per user, with no organisation model, no audit log and no retention policy.",
              "The free hosting tier sleeps after a period of inactivity, so the first request after a quiet spell can take up to a minute.",
            ]}
          />
        </Section>

        <Section
          title="The API"
          lead="Nine routes. Only the ones that can send mail require a session, on the principle that access is gated by consequence rather than by route."
        >
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <Row left="GET /api/health" right="Version, provider, playbook name and which integrations are live." />
            <Row left="GET /api/playbook" right="The rules being applied, which is what the Playbook view renders." />
            <Row left="GET /api/llm/ping" right="A single cheap call, used to prove the model path works before a demo." />
            <Row left="POST /api/contracts/upload" right="Extract, split, classify, evaluate and return clauses, findings and a summary. Sends the alert when the result is high risk." />
            <Row left="POST /api/contracts/explain" right="Reword proven findings for a non-lawyer reader." />
            <Row left="POST /api/chat" right="Answer a question from supplied clauses only, returning the citations used." />
            <Row left="POST /api/notify" right="Email the report. Requires a verified session and resolves the recipient from it." />
          </div>
        </Section>
      </div>
    </div>
  )
}
