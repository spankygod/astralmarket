import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { coinActionClassName } from "@/lib/coin-detail-mappers";

import { TopChrome } from "./top-chrome";

export function EmptyCoin({ identifier }: { identifier: string }) {
  return (
    <main className="min-h-screen bg-[#000000] text-slate-100">
      <TopChrome coin={null} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          className={`${coinActionClassName} border border-[#2a2a2a] bg-[#111111] text-zinc-100 hover:bg-[#181818]`}
          href="/"
        >
          <ArrowLeft className="size-4" />
          Markets
        </Link>
        <section className="mt-10 border border-[#1a1a1a] bg-[#050505] p-8">
          <p className="text-sm font-semibold uppercase text-zinc-500">
            Bags token lookup
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">
            No Bags token found for {decodeURIComponent(identifier)}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
            This page searches Bags launch-feed symbols, token mints, and token
            name slugs. Use a token from the market table or paste a Bags token
            mint directly into the URL.
          </p>
        </section>
      </div>
    </main>
  );
}
