import { MapPin, Package, Zap } from "lucide-react";

/** Sign-in, register and password pages: form card + why-bother panel (wide screens). */
export function AuthShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-14">
      <div className="mx-auto w-full max-w-md lg:mx-0">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-muted-foreground">{intro}</p>
        <div className="mt-8">{children}</div>
      </div>

      <aside className="relative hidden overflow-hidden rounded-3xl bg-ink p-8 text-paper lg:block">
        <div aria-hidden className="absolute -right-24 -bottom-24 size-72 rounded-full bg-brand-500/20 blur-3xl" />
        <h2 className="relative text-2xl font-semibold">Your account keeps it all in one place</h2>
        <ul className="relative mt-6 space-y-5 text-sm">
          <Benefit icon={MapPin} title="Follow every order">
            See where each order is, from our suppliers to your door.
          </Benefit>
          <Benefit icon={Package} title="All your orders together">
            Including ones you placed as a guest, once you confirm your email.
          </Benefit>
          <Benefit icon={Zap} title="Faster checkout">
            Your name, phone and address filled in for you.
          </Benefit>
        </ul>
      </aside>
    </div>
  );
}

function Benefit({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-paper/10 text-brand-400">
        <Icon className="size-[18px]" />
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-paper/65">{children}</span>
      </span>
    </li>
  );
}
