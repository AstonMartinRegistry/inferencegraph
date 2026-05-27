"use client";

import { usePathname, useRouter } from "next/navigation";
import { ToggleGroup } from "@/components/ToggleGroup";

const ROUTES = [
  { href: "/", label: "text" },
  { href: "/embeddings", label: "embeddings" },
] as const;

type RouteHref = (typeof ROUTES)[number]["href"];

export function PageNav() {
  const pathname = usePathname();
  const router = useRouter();

  const active =
    ROUTES.find((route) => pathname === route.href)?.href ?? ("/" as RouteHref);

  return (
    <ToggleGroup<RouteHref>
      value={active}
      onChange={(href) => router.push(href)}
      ariaLabel="Pages"
      className="page-nav-toggle"
      options={ROUTES.map((route) => ({
        value: route.href,
        label: route.label,
      }))}
    />
  );
}
