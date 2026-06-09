"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { DAILY_HITTING_REMINDER, HITTING_CHAIN_STEPS } from "@/lib/hitting-training";

export default function HittingChainPosterPage() {
  return (
    <main className="poster-page min-h-dvh bg-stone-100 px-4 py-4 text-stone-950">
      <div className="no-print mx-auto mb-4 flex w-full max-w-4xl items-center justify-between gap-3">
        <Link
          className="flex min-h-11 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 font-black text-stone-700 shadow-sm"
          href="/hitting"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </Link>
        <div className="flex gap-2">
          <a
            className="flex min-h-11 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 font-black text-stone-700 shadow-sm"
            download
            href="/hitting-chain-poster.pdf"
          >
            <Download className="h-5 w-5" />
            PDF
          </a>
          <button
            className="flex min-h-11 items-center gap-2 rounded-md border border-stone-950 bg-stone-950 px-3 font-black text-white shadow-sm"
            onClick={() => window.print()}
            type="button"
          >
            <Printer className="h-5 w-5" />
            Print
          </button>
        </div>
      </div>

      <article className="poster-sheet mx-auto grid w-full max-w-4xl gap-4 rounded-lg border border-supabase-border bg-white p-6 shadow-lg">
        <header className="border-b-4 border-supabase-border pb-4">
          <p className="text-sm font-black uppercase tracking-wide text-supabase-800">
            Softball Hitting Training
          </p>
          <h1 className="mt-1 text-4xl font-black leading-tight text-stone-950">
            The Hitting Chain 🥎
          </h1>
          <p className="mt-2 text-xl font-black text-sky-900">
            Roya & Rayna&apos;s Swing Poster
          </p>
          <p className="mt-3 text-base font-bold text-stone-700">
            Stay smooth, relaxed, and let each move prepare the next one.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          {HITTING_CHAIN_STEPS.map((step, index) => (
            <div
              className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-md border border-stone-200 bg-stone-50 p-3"
              key={step.id}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-supabase text-lg font-black text-stone-950">
                {index + 1}
              </span>
              <div>
                <h2 className="text-lg font-black text-stone-950">{step.title}</h2>
                <p className="mt-1 text-sm font-black text-sky-900">{step.cue}</p>
                <p className="mt-1 text-sm font-bold text-stone-700">{step.kidCheck}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-md border border-sky-200 bg-sky-50 p-4">
          <h2 className="text-xl font-black text-sky-950">Daily Reminder</h2>
          <p className="mt-2 text-lg font-black text-sky-900">{DAILY_HITTING_REMINDER}</p>
        </section>

        <footer className="grid gap-3 border-t border-stone-200 pt-4 sm:grid-cols-3">
          <p className="rounded-md bg-supabase-50 p-3 text-sm font-black text-supabase-900">
            Light grip = fast bat.
          </p>
          <p className="rounded-md bg-amber-50 p-3 text-sm font-black text-amber-900">
            Hips fire, hands follow.
          </p>
          <p className="rounded-md bg-sky-50 p-3 text-sm font-black text-sky-900">
            Praise effort first. Tweak one thing.
          </p>
        </footer>
      </article>
    </main>
  );
}
