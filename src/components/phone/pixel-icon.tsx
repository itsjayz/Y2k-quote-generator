const ICONS = {
  signal: [
    "X.X.X.......X",
    ".XXX......X.X",
    "..X.....X.X.X",
    "..X...X.X.X.X",
    "..X.X.X.X.X.X",
  ],
  arrow: ["X..", "XX.", "XXX", "XX.", "X.."],
  battery: [
    "XXXXXXXXX.",
    "X.X.X.X.XX",
    "X.X.X.X.XX",
    "X.X.X.X.XX",
    "XXXXXXXXX.",
  ],
  envelope: [
    "XXXXXXXXXXXXX",
    "XX.........XX",
    "X.X.......X.X",
    "X..X.....X..X",
    "X...X...X...X",
    "X....X.X....X",
    "X.....X.....X",
    "X...........X",
    "XXXXXXXXXXXXX",
  ],
  check: [
    "......X",
    ".....XX",
    "X...XX.",
    "XX.XX..",
    ".XXX...",
    "..X....",
  ],
  cross: ["X...X", ".X.X.", "..X..", ".X.X.", "X...X"],
  copy: [
    "..XXXXX",
    "..X...X",
    "XXXXX.X",
    "X...X.X",
    "X...XXX",
    "X...X..",
    "XXXXX..",
  ],
  heart: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
} as const;

export type IconName = keyof typeof ICONS;

export function PixelIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const rows = ICONS[name];
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={{ aspectRatio: `${w} / ${h}` }}
      shapeRendering="crispEdges"
      aria-hidden="true"
      fill="currentColor"
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "X" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null
        )
      )}
    </svg>
  );
}
