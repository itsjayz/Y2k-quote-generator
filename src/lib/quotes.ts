export const GENRES = [
  { id: "meme", label: "Meme" },
  { id: "gym", label: "Hit the gym" },
  { id: "exams", label: "Exams are coming" },
  { id: "peaceful", label: "Peaceful" },
  { id: "heartbreak", label: "Broke my heart" },
] as const;

export type GenreId = (typeof GENRES)[number]["id"];

export type Quote = {
  id: string;
  text: string;
  author?: string;
  genre: GenreId;
};

type Raw = [text: string, author?: string];

const RAW: Record<GenreId, Raw[]> = {
  meme: [
    ["Me: I'll sleep early tonight. Also me at 3am: reading about octopuses."],
    ["Brain: 0 thoughts. Head: empty. Vibes: immaculate."],
    ["I'm not lazy. I'm in energy-saving mode."],
    ["Error 404: motivation not found. Try again after snacks."],
    ["Today's forecast: 100% chance of overthinking."],
    ["Running late? Call it a dramatic entrance."],
    ["Plot twist: you were the main character all along."],
    ["Low battery. Same, bestie."],
    ["I can resist everything except temptation.", "Oscar Wilde"],
    ["I love deadlines. I love the whooshing noise they make as they go by.", "Douglas Adams"],
    ["Time is an illusion. Lunchtime doubly so.", "Douglas Adams"],
  ],
  gym: [
    ["The only bad workout is the one that didn't happen."],
    ["Sore today, strong tomorrow."],
    ["Nobody is watching. Lift anyway."],
    ["Put your shoes on. That's the hardest rep."],
    ["Skip the excuse, not leg day."],
    ["Motivation calls in sick. Discipline shows up anyway."],
    ["Progress, not perfection. Add 2.5kg and move on."],
    ["Your body hears everything your mind says. Say: one more rep."],
    ["We are what we repeatedly do. Excellence, then, is not an act, but a habit.", "Will Durant"],
    ["What stands in the way becomes the way.", "Marcus Aurelius"],
  ],
  exams: [
    ["One page at a time. One chapter at a time. You've got this."],
    ["Future you is begging: open the book now."],
    ["Phone down. Notes up. See you on the other side."],
    ["Highlighting is not studying. Close the pretty notes and test yourself."],
    ["Five more minutes is how whole syllabuses go missing."],
    ["You don't have to be brilliant. Just be prepared."],
    ["Breathe. You know more than you think you do."],
    ["First say to yourself what you would be; and then do what you have to do.", "Epictetus"],
    ["Nothing in life is to be feared, it is only to be understood.", "Marie Curie"],
    ["We suffer more often in imagination than in reality.", "Seneca"],
  ],
  peaceful: [
    ["breathe ... you're going to figure it out like you always do"],
    ["Slow down. You're allowed to take up time."],
    ["Nothing is on fire. Unclench your jaw."],
    ["Rest is productive too."],
    ["Not everything needs an answer tonight."],
    ["Drink some water. Open a window. Start again."],
    ["This too shall pass.", "Persian adage"],
    ["Hope is the thing with feathers that perches in the soul.", "Emily Dickinson"],
    ["All shall be well, and all shall be well, and all manner of thing shall be well.", "Julian of Norwich"],
    ["The best way out is always through.", "Robert Frost"],
  ],
  heartbreak: [
    ["Take a deep breath and remember who the f*ck you are"],
    ["You lost someone who didn't see you. You didn't lose yourself."],
    ["Don't text them. Text yourself: I'm proud of you."],
    ["Stop shrinking to fit places you've outgrown."],
    ["Healing isn't linear. Some days you just get through."],
    ["The right ones don't make you wonder."],
    ["You don't owe anyone a smaller version of yourself."],
    ["Fall seven times, stand up eight.", "Japanese proverb"],
    ["And still, like dust, I'll rise.", "Maya Angelou"],
    ["To love oneself is the beginning of a lifelong romance.", "Oscar Wilde"],
  ],
};

export const QUOTES: Quote[] = (Object.keys(RAW) as GenreId[]).flatMap((genre) =>
  RAW[genre].map(([text, author], i) => ({
    id: `${genre}-${i}`,
    text,
    author,
    genre,
  }))
);

export const QUOTE_BY_ID = new Map(QUOTES.map((q) => [q.id, q]));

export const genreLabel = (id: GenreId) =>
  GENRES.find((g) => g.id === id)?.label ?? "";

/* Shuffle-bag: every quote in the pool appears once, in random order,
   before any quote repeats. A new bag never starts with the last quote. */
const bags = new Map<string, string[]>();

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickQuote(genre: GenreId | null, lastId?: string): Quote {
  const key = genre ?? "all";
  let bag = bags.get(key);
  if (!bag?.length) {
    const pool = QUOTES.filter((q) => !genre || q.genre === genre).map((q) => q.id);
    bag = shuffle(pool);
    const end = bag.length - 1;
    if (end > 0 && bag[end] === lastId) [bag[0], bag[end]] = [bag[end], bag[0]];
    bags.set(key, bag);
  }
  return QUOTE_BY_ID.get(bag.pop()!)!;
}
