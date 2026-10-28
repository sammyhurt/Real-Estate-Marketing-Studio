import { Wordmark } from "./wordmark";

export default function Footer({ note = "Private to Meredith · drafts only, nothing posts or sends on its own." }: { note?: string }) {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#2f4156] py-12 text-white lg:py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(600px 260px at 10% 0%, rgba(200,217,230,0.18), transparent 70%), radial-gradient(500px 240px at 100% 10%, rgba(86,124,141,0.35), transparent 70%)" }} />
      <div className="relative z-10 container flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <Wordmark light size="lg" />
          <p className="mt-5 max-w-md text-lg leading-snug font-medium">Real estate marketing that shows its work.</p>
        </div>
        <p className="text-xs text-white/60">{note}</p>
      </div>
    </footer>
  );
}
