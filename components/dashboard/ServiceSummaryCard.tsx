import Link from "next/link";

type ServiceSummaryCardProps = {
  title: string;
  description: string;
  href: string;
};

export function ServiceSummaryCard({ title, description, href }: ServiceSummaryCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-600"
    >
      <h2 className="text-base font-semibold text-neutral-50">{title}</h2>
      <p className="mt-2 text-sm text-neutral-400">{description}</p>
    </Link>
  );
}
