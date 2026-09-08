import Link from "next/link";
import { BreadcrumbJsonLd, type BreadcrumbItem } from "@/components/seo/JsonLd";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  includeJsonLd?: boolean;
}

export function Breadcrumbs({ items, includeJsonLd = true }: BreadcrumbsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <>
      {includeJsonLd && <BreadcrumbJsonLd items={items} />}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-2 text-xs font-mono text-[#62635D]">
          <li>
            <Link
              href="/"
              className="transition-colors hover:text-[#A85D48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
            >
              Root
            </Link>
          </li>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={item.item} className="flex items-center gap-2">
                <span className="text-slate-600" aria-hidden="true">
                  /
                </span>
                {isLast ? (
                  <span className="text-[#A85D48] font-semibold" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.item}
                    className="transition-colors hover:text-[#A85D48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
