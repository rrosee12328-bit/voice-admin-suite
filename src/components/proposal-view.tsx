import type { ProposalSection, ProposalTemplate } from "@/lib/proposals";

/** Shared renderer used by both the admin preview and the public proposal page. */
export function ProposalView({
  template,
  clientName,
}: {
  template: ProposalTemplate;
  clientName: string;
}) {
  const sections = template.build(clientName);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-foreground">
      <header className="mb-10 flex items-center justify-between border-b border-border/60 pb-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Vektiss · Custom Proposal
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Prepared for <span className="font-medium text-foreground">{clientName}</span>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {new Date().toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </header>

      <div className="space-y-5">
        {sections.map((s, i) => (
          <SectionBlock key={i} section={s} />
        ))}
      </div>
    </article>
  );
}

function SectionBlock({ section }: { section: ProposalSection }) {
  switch (section.type) {
    case "heading":
      return (
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {section.text}
        </h1>
      );
    case "subheading":
      return (
        <h2 className="mt-8 border-b border-border/40 pb-2 text-lg font-semibold text-foreground">
          {section.text}
        </h2>
      );
    case "paragraph":
      return (
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {section.text}
        </p>
      );
    case "bullets":
      return (
        <ul className="space-y-1.5 pl-1">
          {section.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[15px] leading-relaxed text-muted-foreground"
            >
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.label}
          </div>
          <div className="text-base font-semibold text-foreground">{section.text}</div>
        </div>
      );
  }
}
