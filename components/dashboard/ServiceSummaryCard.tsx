type ServiceSummaryCardProps = {
  title: string;
  description: string;
};

export function ServiceSummaryCard({ title, description }: ServiceSummaryCardProps) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-base font-semibold text-neutral-50">{title}</h2>
      <p className="mt-2 text-sm text-neutral-400">{description}</p>
    </section>
  );
}
