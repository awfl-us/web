/*
  Presentational overview for AWFL
  - Hero + Quick Start for the CLI
  - High-level overview of the Scala DSL and workflow-utils
  - Pure render component; no side effects
*/

export function InstructionsOverview() {
  return (
    <div style={{ display: 'grid', gap: 24, padding: '24px 0' }}>
      <Hero />
      <div style={{ display: 'grid', gap: 16 }}>
        <Section
          title="Quick start: AWFL CLI"
          subtitle="Install, launch, pick a workflow, chat — from your terminal."
        >
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <Card title="1) Install">
              <CodeBlock>
                pipx install awfl
                {'\n'}# or
                {'\n'}pip install --user awfl
              </CodeBlock>
              <p style={{ margin: '8px 0 0 0', color: '#4b5563' }}>Verify with: <code>awfl --version</code></p>
            </Card>
            <Card title="2) Launch + auth">
              <CodeBlock>
                cd your/project{`\n`}awfl
              </CodeBlock>
              <p style={{ margin: '8px 0 0 0', color: '#4b5563' }}>First run prompts Google device login; tokens are cached locally.</p>
            </Card>
            <Card title="3) Pick a workflow (agent)">
              <CodeBlock>
                awfl{`\n`}workflows   # or: ls
              </CodeBlock>
              <p style={{ margin: '8px 0 0 0', color: '#4b5563' }}>Use the tree selector. Codebase agents live under “codebase/”.</p>
            </Card>
            <Card title="4) Chat + apply changes">
              <CodeBlock>
                "Add a Demo section to README and a recording script"
              </CodeBlock>
              <p style={{ margin: '8px 0 0 0', color: '#4b5563' }}>The agent plans and issues tool calls (write files, run commands). One terminal holds a project lock to apply side effects; all terminals stream events.</p>
            </Card>
          </div>
        </Section>

        <Section
          title="Build custom agents with the AWFL DSL (Scala 3)"
          subtitle="Describe workflows as typed, composable data — readable, testable, and engine-agnostic."
        >
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1.2fr 1fr' }}>
            <div>
              <CodeBlock language="scala">
{`import us.awfl.dsl._
import us.awfl.dsl.CelOps._
import us.awfl.dsl.auto.given

case class User(name: Value[String])
val user   = init[User]("input")
val name   = user.flatMap(_.name)

// Build a tiny program
val greetings = ForRange[String]("greetings", from = 0, to = 3) { i =>
  val msg = str(("Hello, ": Cel) + name + " #" + i)
  List(Log("log_msg", msg)) -> msg
}.resultValue

val program = Block("example", List(Log("log_user", name)) -> greetings)
`}
              </CodeBlock>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 18px', color: '#374151', display: 'grid', gap: 8 }}>
              <li>Values are strongly typed: compose <code>Value[T]</code>, <code>ListValue[T]</code>, and CEL expressions.</li>
              <li>Steps are declarative: <code>Log</code>, <code>Call</code>, <code>For</code>, <code>Try</code>, <code>Switch</code>, <code>Block</code>.</li>
              <li>Pure description: render to JSON/YAML, send to an engine, or interpret locally.</li>
            </ul>
          </div>
        </Section>

        <Section
          title="Workflow utils: clients and helpers"
          subtitle="Compose LLM chat, read context, use distributed locks, and emit events — all with tiny, composable steps."
        >
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <Card title="LLM chat">
              <CodeBlock language="scala">
{`import us.awfl.services.Llm
import us.awfl.ista.ChatMessage

val msgs = buildList("msgs", List(ChatMessage("user", str("Hello!"))))
val chat = Llm.chat("demo_chat", msgs.resultValue)  // Step to llm/chat
`}
              </CodeBlock>
            </Card>
            <Card title="Context reads (yoj)">
              <CodeBlock language="scala">
{`import us.awfl.services.Context
import us.awfl.utils.Env

val kala = Context.segKala(Env.sessionId, obj(1720000000.0), obj(3600.0))
val read  = Context.yojRead[ChatMessage]("read_notes", str("messages"), kala)
`}
              </CodeBlock>
            </Card>
            <Card title="Distributed locks">
              <CodeBlock language="scala">
{`import us.awfl.utils.Locks
import us.awfl.utils.{SegKala, KalaVibhaga}
import us.awfl.utils.Env

given KalaVibhaga = SegKala(Env.sessionId, obj(1720000000.0), obj(300.0))
val acquired = Locks.acquireBool("reports_lock", Locks.key("reports"), str("worker-1"), 60)
`}
              </CodeBlock>
            </Card>
          </div>
        </Section>

        <Section title="Next steps" subtitle="Dive deeper or start building now.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <LinkButton href="https://github.com/awfl-us/cli">CLI</LinkButton>
            <LinkButton href="https://central.sonatype.com/artifact/us.awfl/dsl_3">DSL</LinkButton>
            <LinkButton href="https://github.com/awfl-us/workflow-utils">workflow-utils</LinkButton>
            <LinkButton href="https://github.com/awfl-us/workflows">Workflows</LinkButton>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '28px 24px',
        background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#6366f1' }}>AWFL</div>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>Build AI agents and workflows that work in your codebase</h1>
        <p style={{ margin: 0, color: '#4b5563' }}>
          Talk to codebase‑aware agents in your terminal, compose typed workflows in Scala, and use tiny utilities
          for LLM chat, context reads, and distributed locks.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
          <LinkButton href="https://github.com/awfl-us/cli#quick-start">Install the CLI</LinkButton>
          <LinkButton href="https://central.sonatype.com/artifact/us.awfl/dsl_3">Add the DSL</LinkButton>
          <LinkButton href="https://github.com/awfl-us/workflow-utils#quick-start">Use workflow-utils</LinkButton>
        </div>
      </div>
    </section>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: any }) {
  return (
    <section style={{ display: 'grid', gap: 10 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
        {subtitle ? <p style={{ margin: '6px 0 0 0', color: '#4b5563' }}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 16,
        background: 'white',
        boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div>{children}</div>
    </div>
  )
}

function CodeBlock({ children, language }: { children: any; language?: string }) {
  return (
    <pre
      style={{
        margin: 0,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        background: '#0b1020',
        color: '#e5e7eb',
        padding: 12,
        overflowX: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 12,
        lineHeight: 1.6,
      }}
      aria-label={language ? `Code snippet (${language})` : 'Code snippet'}
    >
      <code>{children}</code>
    </pre>
  )
}

function LinkButton({ href, children }: { href: string; children: any }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid #d1d5db',
        background: 'white',
        color: '#111827',
        textDecoration: 'none',
        fontWeight: 600,
      }}
    >
      {children}
      <span aria-hidden>→</span>
    </a>
  )
}
