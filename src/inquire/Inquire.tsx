import CheckCircle from "@iconify-react/solar/check-circle-linear";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/utility/theme-toggle";

import { FORM_INFO_URL, FORM_URL, publicPost } from "@/agency/data";

interface Info { ok: boolean; error?: string; name: string; business: string; market: string; disclosure: string; sop_url?: string; fair_housing_url?: string }

const params = () => {
  try {
    return new URLSearchParams(location.search);
  } catch {
    return new URLSearchParams();
  }
};

/** Public inquiry form for one agent. Shows only their public business details. */
export default function Inquire() {
  const q = params();
  const c = (q.get("c") || "").replace(/[^a-z0-9]/gi, "").slice(0, 24);
  const ref = (q.get("ref") || q.get("utm_source") || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 30);
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ name: "", contact: "", interest: "buy", message: "", heard_about: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    if (!c) {
      setErr("This form link is not complete.");
      return;
    }
    fetch(FORM_INFO_URL + "?c=" + encodeURIComponent(c), { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Info) => (j.ok ? setInfo(j) : setErr(j.error || "This form is not available.")))
      .catch(() => setErr("Could not load the form. Check your connection and refresh."));
  }, [c]);

  const submit = async () => {
    setFormErr("");
    if (!f.name.trim()) return setFormErr("Please add your name.");
    if (!f.contact.trim()) return setFormErr("Please add an email or phone number so they can reply.");
    setState("sending");
    try {
      await publicPost(FORM_URL, { c, ...f, ref });
      setState("sent");
    } catch (e) {
      setState("idle");
      setFormErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  };

  const who = info ? info.name.split(" ")[0] : "";
  return (
    <div className="bg-background flex min-h-svh flex-col">
      <header className="container flex items-center justify-end py-5">
        <ThemeToggle />
      </header>
      <main className="container flex flex-1 items-start justify-center pb-16">
        <div className="w-full max-w-lg">
          {err ? (
            <p className="py-24 text-center text-lg font-semibold">{err}</p>
          ) : !info ? (
            <div className="bg-muted h-96 animate-pulse rounded-2xl" />
          ) : state === "sent" ? (
            <div className="bg-card grid gap-3 rounded-2xl border p-8 text-center">
              <CheckCircle className="mx-auto size-10 text-emerald-600" />
              <h1 className="text-2xl font-semibold tracking-tight">Thanks, {f.name.split(" ")[0]}.</h1>
              <p className="text-muted-foreground">
                {who} has your message and will get back to you personally{f.contact.includes("@") ? " by email" : ""}.
              </p>
            </div>
          ) : (
            <form
              className="bg-card relative grid gap-5 rounded-2xl border p-6 sm:p-8"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div aria-hidden className="from-chart-1/40 via-chart-2/20 pointer-events-none absolute top-0 right-0 left-0 h-px bg-gradient-to-r to-transparent" />
              <div>
                <p className="text-chart-1 text-xs font-semibold tracking-[0.14em] uppercase">{info.business || "Real estate"}</p>
                <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight">Talk to {info.name}</h1>
                {info.market ? <p className="text-muted-foreground mt-2">{info.market}</p> : null}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="contact">Email or phone</Label>
                <Input id="contact" autoComplete="email" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">I'm interested in</legend>
                <div className="flex flex-wrap gap-2">
                  {[["buy", "Buying"], ["sell", "Selling"], ["rent", "Renting"], ["value", "My home's value"], ["other", "Something else"]].map(([v, l]) => (
                    <label key={v} className={"cursor-pointer rounded-full border px-3.5 py-1.5 text-sm " + (f.interest === v ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent")}>
                      <input type="radio" name="interest" value={v} checked={f.interest === v} onChange={() => setF({ ...f, interest: v })} className="sr-only" />
                      {l}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-1.5">
                <Label htmlFor="message">Anything you'd like {who} to know (optional)</Label>
                <Textarea id="message" rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="heard">How did you hear about {who}? (optional)</Label>
                <Input id="heard" value={f.heard_about} onChange={(e) => setF({ ...f, heard_about: e.target.value })} />
              </div>
              {/* honeypot: hidden from people, bots fill it */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
                </label>
              </div>
              {formErr ? <p className="text-destructive text-sm">{formErr}</p> : null}
              <Button type="submit" className="h-11 rounded-full" disabled={state === "sending"}>
                {state === "sending" ? "Sending…" : "Send"}
              </Button>
              <p className="text-muted-foreground text-xs">Your details go only to {info.name} and their marketing assistant, to reply to you. No mailing lists.</p>
              {info.disclosure ? <p className="text-muted-foreground border-t pt-3 text-xs">{info.disclosure}</p> : null}
              {info.sop_url || info.fair_housing_url ? (
                <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {info.sop_url ? (
                    <a href={info.sop_url} target="_blank" rel="noopener noreferrer" className="underline">
                      Standard Operating Procedures
                    </a>
                  ) : null}
                  {info.fair_housing_url ? (
                    <a href={info.fair_housing_url} target="_blank" rel="noopener noreferrer" className="underline">
                      New York State Fair Housing Notice
                    </a>
                  ) : null}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
