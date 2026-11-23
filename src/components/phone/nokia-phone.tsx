"use client";

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";

import { Alert, AlertTitle } from "@/components/ui/8bit/alert";
import { Badge } from "@/components/ui/8bit/badge";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent } from "@/components/ui/8bit/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/8bit/empty";
import { Progress } from "@/components/ui/8bit/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/8bit/radio-group";
import { ScrollArea } from "@/components/ui/8bit/scroll-area";
import { Separator } from "@/components/ui/8bit/separator";
import {
  GENRES,
  QUOTE_BY_ID,
  genreLabel,
  pickQuote,
  type GenreId,
  type Quote,
} from "@/lib/quotes";
import { cn } from "@/lib/utils";

import { PixelIcon, type IconName } from "./pixel-icon";
import { sfx } from "./sounds";
import { createStore, useClock, useStore } from "./use-store";
import "./phone.css";

/* ------------------------------------------------------------------
   Handset photo + where things sit on it.
   To swap the image: drop a new file in /public/phone, update `src`,
   `width`/`height`, then re-measure the LCD in the photo's own pixels.
   Current photo: references/mockup.jpg, background cut out
   (public/phone/phone-mockup.png).
------------------------------------------------------------------- */
const HANDSET = {
  src: "/phone/phone-mockup.png",
  width: 736,
  height: 920,
  // bounding box of the LCD glass; the glass is a slight trapezoid
  lcd: { x: 142, y: 368, w: 459, h: 446 },
  // top edge of the glass runs x 157 -> 593 (bottom edge is the full box width)
  lcdTop: { left: 157, right: 593 },
};

const lcdClip = (() => {
  const { x, w } = HANDSET.lcd;
  const l = ((HANDSET.lcdTop.left - x) / w) * 100;
  const r = ((HANDSET.lcdTop.right - x) / w) * 100;
  return `polygon(${l}% 0, ${r}% 0, 100% 100%, 0 100%)`;
})();

type Rect = { x: number; y: number; w: number; h: number };
const pct = ({ x, y, w, h }: Rect) => ({
  left: `${(x / HANDSET.width) * 100}%`,
  top: `${(y / HANDSET.height) * 100}%`,
  width: `${(w / HANDSET.width) * 100}%`,
  height: `${(h / HANDSET.height) * 100}%`,
});

const savedStore = createStore<string[]>("thought-phone:saved", []);
const genreStore = createStore<GenreId | null>("thought-phone:genre", null);

type ScreenId = "idle" | "notify" | "quote" | "share" | "genres" | "saved";
type SoftKey = { label: ReactNode; action: () => void };
type Keys = {
  left?: SoftKey;
  center?: SoftKey;
  right?: SoftKey;
  up?: () => void;
  down?: () => void;
};
type Note = { text: string; icon: IconName };

const formatQuote = (q: Quote) =>
  `"${q.text}"${q.author ? ` - ${q.author}` : ""}`;

export function NokiaPhone() {
  const saved = useStore(savedStore);
  const genre = useStore(genreStore);
  const clock = useClock();

  const [screen, setScreen] = useState<ScreenId>("idle");
  const [focus, setFocus] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteFrom, setQuoteFrom] = useState<"new" | "saved">("new");
  const [note, setNote] = useState<Note | null>(null);

  const uid = useId();
  const bodyId = `lcd-body-${uid}`;

  const savedQuotes = saved
    .map((id) => QUOTE_BY_ID.get(id))
    .filter((q): q is Quote => Boolean(q));
  const isSaved = quote ? saved.includes(quote.id) : false;

  /* ---------- helpers ---------- */

  const go = (next: ScreenId, f = 0) => {
    setScreen(next);
    setFocus(f);
  };

  // handset and screen stay still; devices that can, vibrate
  const buzz = () => {
    navigator.vibrate?.([180, 90, 180]);
  };

  const cycle = (n: number, dir: 1 | -1) => () =>
    setFocus((f) => (n ? (f + dir + n) % n : 0));

  const scrollBody = (dir: 1 | -1) => {
    const vp = document
      .getElementById(bodyId)
      ?.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]");
    vp?.scrollBy({ top: dir * vp.clientHeight * 0.4 });
  };

  /* ---------- actions ---------- */

  const tellMe = () => {
    setQuote(pickQuote(genre, quote?.id));
    setQuoteFrom("new");
    go("notify");
    sfx.message();
    buzz();
  };

  const exitQuote = () => {
    if (quoteFrom === "saved") {
      const i = quote ? saved.indexOf(quote.id) : -1;
      go("saved", Math.max(0, i));
    } else {
      go("idle");
    }
  };

  const toggleSave = () => {
    if (!quote) return;
    if (saved.includes(quote.id)) {
      savedStore.set(saved.filter((id) => id !== quote.id));
      setNote({ text: "Removed", icon: "cross" });
      sfx.remove();
    } else {
      savedStore.set([quote.id, ...saved]);
      setNote({ text: "Saved", icon: "check" });
      sfx.confirm();
    }
  };

  const copyQuote = async () => {
    if (!quote) return;
    const text = formatQuote(quote);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    go("quote");
    setNote({ text: "Copied", icon: "copy" });
    sfx.done();
  };

  const sendQuote = async () => {
    if (!quote) return;
    if (!navigator.share) return copyQuote();
    try {
      await navigator.share({ text: formatQuote(quote) });
      go("quote");
      setNote({ text: "Sent", icon: "check" });
      sfx.done();
    } catch (err) {
      if ((err as Error)?.name === "AbortError") go("quote");
      else copyQuote();
    }
  };

  const shareItems = [
    { label: "Copy text", run: copyQuote },
    { label: "Send via...", run: sendQuote },
  ];

  // "Choose genre": Any + five genres, then the Saved folder
  const genreRows: { value: GenreId | "any"; label: string }[] = [
    { value: "any", label: "Any genre" },
    ...GENRES.map((g) => ({ value: g.id, label: g.label })),
  ];
  const savedRow = genreRows.length;

  const pickGenreRow = (row: number) => {
    if (row === savedRow) return go("saved", 0);
    const value = genreRows[row].value;
    genreStore.set(value === "any" ? null : value);
    go("idle");
    setNote({ text: "Genre set", icon: "check" });
    sfx.confirm();
  };

  const openSaved = (i: number) => {
    const q = savedQuotes[i];
    if (!q) return;
    setQuote(q);
    setQuoteFrom("saved");
    go("quote");
  };

  /* ---------- per-screen layout ---------- */

  let keys: Keys = {};
  let heading: ReactNode = null; // centred "- Title -" row
  let rule = false; // thin line under the status bar
  let body: ReactNode = null;

  switch (screen) {
    case "idle": {
      keys = {
        center: { label: "Tell me", action: tellMe },
        right: { label: "Options", action: () => go("genres", currentGenreRow()) },
      };
      body = (
        <div className="lcd-idle">
          <p className="lcd-headline">
            A thought
            <br />
            for you
          </p>
          <Badge font="normal" className="lcd-badge">
            {genre ? genreLabel(genre) : "Any genre"}
          </Badge>
        </div>
      );
      break;
    }

    case "notify": {
      keys = {
        left: { label: "Exit", action: () => go("idle") },
        center: { label: "Open", action: () => go("quote") },
      };
      body = (
        <div className="lcd-center">
          <Card font="normal" className="lcd-card">
            <CardContent font="normal" className="lcd-card-content">
              <PixelIcon name="envelope" className="lcd-envelope" />
              <p className="lcd-popup-text">
                You have a<br />
                message
              </p>
            </CardContent>
          </Card>
        </div>
      );
      break;
    }

    case "quote": {
      rule = true;
      keys = {
        left: { label: "Exit", action: exitQuote },
        center: {
          label: isSaved ? (
            <span className="inline-flex items-center gap-[0.6cqw]">
              <PixelIcon name="heart" className="h-[1.9cqw]" />
              Saved
            </span>
          ) : (
            "Save"
          ),
          action: toggleSave,
        },
        right: { label: "Share", action: () => go("share") },
        up: () => scrollBody(-1),
        down: () => scrollBody(1),
      };
      body = quote && (
        <ScrollArea type="always" className="h-full">
          <div className="lcd-scroll">
            <p className="lcd-text">{quote.text}</p>
            {quote.author && <p className="lcd-author">- {quote.author}</p>}
          </div>
        </ScrollArea>
      );
      break;
    }

    case "share": {
      heading = "Share";
      keys = {
        center: { label: "Select", action: () => shareItems[focus].run() },
        right: { label: "Back", action: () => go("quote") },
        up: cycle(shareItems.length, -1),
        down: cycle(shareItems.length, 1),
      };
      body = (
        <MenuList
          items={shareItems.map((s) => ({ key: s.label, label: s.label }))}
          focus={focus}
          onPick={(i) => shareItems[i].run()}
        />
      );
      break;
    }

    case "genres": {
      heading = "Choose genre";
      const n = genreRows.length + 1;
      keys = {
        center: { label: "Select", action: () => pickGenreRow(focus) },
        right: { label: "Back", action: () => go("idle") },
        up: cycle(n, -1),
        down: cycle(n, 1),
      };
      body = (
        <RadioGroup value={genre ?? "any"} className="contents" tabIndex={-1}>
          <MenuList
            items={[
              ...genreRows.map((r) => ({
                key: r.value,
                label: r.label,
                lead: (
                  <RadioGroupItem
                    value={r.value}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="lcd-radio pointer-events-none"
                  />
                ),
              })),
              {
                key: "saved",
                label: "Saved",
                lead: <PixelIcon name="envelope" className="lcd-row-icon" />,
                trail: (
                  <>
                    <Badge font="normal" className="lcd-badge lcd-badge-count">
                      {savedQuotes.length}
                    </Badge>
                    <PixelIcon name="arrow" className="lcd-row-arrow" />
                  </>
                ),
              },
            ]}
            focus={focus}
            onPick={pickGenreRow}
          />
        </RadioGroup>
      );
      break;
    }

    case "saved": {
      heading = "Saved";
      const n = savedQuotes.length;
      keys = {
        center: n ? { label: "Open", action: () => openSaved(focus) } : undefined,
        right: { label: "Back", action: () => go("genres", savedRow) },
        up: cycle(n, -1),
        down: cycle(n, 1),
      };
      body = n ? (
        <MenuList
          items={savedQuotes.map((q) => ({
            key: q.id,
            label: <span className="lcd-ellipsis">{q.text}</span>,
            lead: <PixelIcon name="envelope" className="lcd-row-icon" />,
          }))}
          focus={focus}
          onPick={openSaved}
        />
      ) : (
        <Empty font="normal" className="lcd-empty">
          <EmptyHeader className="lcd-empty-header">
            <EmptyMedia variant="icon" className="lcd-empty-media">
              <PixelIcon name="envelope" className="lcd-empty-icon" />
            </EmptyMedia>
            <EmptyTitle className="lcd-popup-text">No saved messages</EmptyTitle>
          </EmptyHeader>
        </Empty>
      );
      break;
    }
  }

  function currentGenreRow() {
    return Math.max(0, genreRows.findIndex((r) => r.value === (genre ?? "any")));
  }

  /* ---------- key handling ---------- */

  // Every physical/soft key press beeps, like the real thing.
  const press = (fn?: () => void) => () => {
    sfx.key();
    if (note) {
      setNote(null);
      return;
    }
    if (fn) fn();
    else sfx.error();
  };

  const centerAction = keys.center?.action;

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 1300);
    return () => window.clearTimeout(t);
  }, [note]);

  // "C" key: Exit where there is one, otherwise Back
  const backAction =
    keys.left?.label === "Exit"
      ? keys.left.action
      : keys.right?.label === "Back"
        ? keys.right.action
        : undefined;

  // keep focused row visible
  useEffect(() => {
    document
      .getElementById(bodyId)
      ?.querySelector<HTMLElement>("[data-focused=true]")
      ?.scrollIntoView({ block: "nearest" });
  }, [focus, screen, bodyId]);

  useEffect(() => {
    const map: Record<string, (() => void) | undefined> = {
      ArrowLeft: keys.left?.action,
      ArrowRight: keys.right?.action,
      ArrowUp: keys.up,
      ArrowDown: keys.down,
      Enter: centerAction,
      " ": centerAction,
      Backspace: backAction,
      Escape: backAction,
    };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.key in map) || e.repeat) return;
      const t = e.target;
      if (
        (e.key === "Enter" || e.key === " ") &&
        t instanceof Element &&
        t.closest("button")
      )
        return;
      e.preventDefault();
      press(map[e.key])();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- render ---------- */

  const hasMessage = screen === "notify" || screen === "quote";

  return (
    <div className="stage">
      <div
        className="handset"
        style={{ "--img-ratio": `${HANDSET.width} / ${HANDSET.height}` } as CSSProperties}
      >
        <Image
          src={HANDSET.src}
          width={HANDSET.width}
          height={HANDSET.height}
          alt="Vintage Nokia mobile phone"
          className="handset-img"
          sizes="80vmin"
          priority
          draggable={false}
        />

        <div
          className="lcd"
          style={{ ...pct(HANDSET.lcd), clipPath: lcdClip }}
          role="application"
          aria-label="Phone screen"
        >
          <div className="lcd-status">
            <span className="lcd-status-left">
              <PixelIcon name="signal" className="lcd-status-icon" />
              {hasMessage && <PixelIcon name="envelope" className="lcd-status-icon" />}
            </span>
            <span className="lcd-status-right">
              <span className="lcd-clock">{clock}</span>
              {/* battery: 8bitcn segmented progress bar */}
              <Progress
                variant="retro"
                font="normal"
                value={75}
                aria-label="Battery 75%"
                className="lcd-battery"
              />
            </span>
          </div>
          {rule && <Separator className="lcd-sep" />}

          {heading && (
            <div className="lcd-title">
              <Separator className="lcd-title-dash" />
              <span className="lcd-title-text">{heading}</span>
              <Separator className="lcd-title-dash" />
            </div>
          )}

          <div id={bodyId} className="lcd-body" aria-live="polite">
            <div key={screen} className="lcd-screen">
              {body}
            </div>

            {note && (
              <div className="lcd-note" role="status">
                <Alert font="normal" className="lcd-alert">
                  <PixelIcon name={note.icon} className="lcd-note-icon" />
                  <AlertTitle className="lcd-alert-title">{note.text}</AlertTitle>
                </Alert>
              </div>
            )}
          </div>

          <div className="lcd-softkeys">
            <SoftLabel align="left" k={keys.left} press={press} />
            <SoftLabel align="center" k={keys.center} press={press} />
            <SoftLabel align="right" k={keys.right} press={press} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SoftLabel({
  align,
  k,
  press,
}: {
  align: "left" | "center" | "right";
  k?: SoftKey;
  press: (fn?: () => void) => () => void;
}) {
  if (!k) return <span />;
  return (
    <Button
      type="button"
      variant="ghost"
      font="normal"
      className={cn("lcd-softkey", `lcd-softkey-${align}`)}
      onClick={press(k.action)}
    >
      {k.label}
    </Button>
  );
}

function MenuList({
  items,
  focus,
  onPick,
}: {
  items: { key: string; label: ReactNode; lead?: ReactNode; trail?: ReactNode }[];
  focus: number;
  onPick: (i: number) => void;
}) {
  return (
    <ScrollArea type="always" className="h-full">
      <ul className="lcd-list" role="menu">
        {items.map((item, i) => (
          <li key={item.key} role="none">
            {/* div, not button: rows may hold 8bitcn controls that render buttons */}
            <div
              role="menuitem"
              tabIndex={-1}
              aria-current={i === focus || undefined}
              data-focused={i === focus}
              className="lcd-row"
              onClick={() => {
                sfx.key();
                onPick(i);
              }}
            >
              {item.lead}
              <span className="lcd-row-label">{item.label}</span>
              {item.trail}
            </div>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
