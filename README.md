# DFA / NFA String Processing Visualizer

A web application that shows how a **Deterministic** or **Nondeterministic Finite Automaton**
reads an input string one symbol at a time — with an animated state diagram, a live transition
table, a step-by-step log, and a final **ACCEPTED / REJECTED** verdict.

![DFA accepting 1101](screenshots/03-dfa-accepted.png)

## Run it (no installation)

1. Unzip the folder.
2. **Double-click `index.html`.** It opens in Chrome, Edge, Firefox or Safari.

There is no backend, no database, no build step and no internet needed.
Technologies: **HTML + CSS + JavaScript + SVG**.

## What it can do

| Feature | Where |
|---|---|
| Choose **DFA** or **NFA** | tabs at the top of the left panel |
| 8 ready-made examples (4 DFA, 4 NFA incl. ε-NFAs) | "Example" menu |
| **Create your own automaton** (text format) | "Create your own automaton" |
| Enter any string, or click a quick example (green = accepted, red = rejected) | "Input string" |
| **Step-by-step animation**: current state glows, the used arrow lights up, a token travels along it | diagram |
| **NFA**: shows *all* active states at once, follows ε-moves (dashed arrows) | diagram + log |
| Start / Pause / Next / Prev / Reset + speed slider | "Run" |
| Live **transition table** with the used cell highlighted | bottom left |
| **Execution log** of every step | bottom right |
| Input **tape** showing which symbol is being read | middle |
| Big **ACCEPTED / REJECTED** result with the reason | middle |
| Drag states to rearrange the diagram | diagram |
| Light + dark theme, phone-friendly layout | automatic |

**Keyboard:** `Space` start/pause · `←` `→` step back/forward · `R` reset.

## Custom automaton format

Open *"Create your own automaton"*, edit the text, press **Load automaton**.

```
type: NFA                 # DFA or NFA
states: q0, q1, q2        # optional (inferred if you leave it out)
alphabet: 0, 1            # optional (inferred)
start: q0
final: q2                 # several: final: q1, q2

q0, 0|1 -> q0             # '|' = several symbols
q0, 0   -> q1
q1, 1   -> q2
q1, eps -> q2             # eps / epsilon / ε = empty move (NFA only)
q0, 0   -> q0, q1         # several targets (NFA only)
```

A DFA must have at most one target per (state, symbol); the program explains the problem if not.
Missing DFA transitions are allowed — the string is simply rejected there ("dead state").

## Project structure

```
DFA-NFA-Visualizer/
├── index.html              page structure                         (Member 3)
├── css/style.css           design, themes, SVG styling            (Member 3 + 4)
├── js/
│   ├── dfa.js              DFA engine                             (Member 1)
│   ├── nfa.js              NFA engine + ε-closure                 (Member 2)
│   ├── presets.js          the 8 example automata                 (Members 1 + 2)
│   ├── parser.js           custom-automaton text format           (Member 5)
│   ├── visualization.js    SVG drawing, highlighting, tokens      (Member 4)
│   ├── animation.js        play / pause / next / prev / reset     (Member 4)
│   └── main.js             connects everything                    (Member 5)
├── tests/test.js           automatic logic tests                  (Member 5)
├── screenshots/            screenshots for the report
├── report/                 report draft, test results, viva Q&A
└── README.md
```

## How the pieces fit together

```
 presets.js / parser.js ──► automaton definition (states, alphabet, δ, start, finals)
                                   │
                  ┌────────────────┴────────────────┐
              dfa.js  (Member 1)              nfa.js  (Member 2)
                  └────────────────┬────────────────┘
                                   ▼
                    engine.run("1101")  ──►  TRACE = list of steps
                                   │          { active, edges, symbol, description }
                                   ▼
                       animation.js  Player  (Member 4)   walks through the trace
                                   │
                       main.js  handleStep()  (Member 5)
              ┌──────────┬─────────┼──────────┬───────────┐
        visualization.js   tape   table      log        result banner
          (Member 4)         (Member 3's UI elements)
```

The engines contain **no HTML or drawing code**, and the visualiser contains **no automata
logic**. They only talk through the *trace* — that is what made it possible for five people to
work in parallel.

## Team responsibilities

| Member | Module | Main files | Should be able to explain |
|---|---|---|---|
| 1 — *name* | DFA logic | `js/dfa.js`, DFA part of `presets.js` | 5-tuple, δ function, `run()`, dead state, acceptance rule |
| 2 — *name* | NFA logic | `js/nfa.js`, NFA part of `presets.js` | set of active states, ε-closure, why NFA accepts if *any* path accepts |
| 3 — *name* | UI / frontend | `index.html`, `css/style.css` | layout, controls, table, tape, themes |
| 4 — *name* | Visualization & animation | `js/visualization.js`, `js/animation.js` | SVG states/arrows, curves, highlighting, token animation, Player |
| 5 — *name* | Integration, testing, docs | `js/main.js`, `js/parser.js`, `tests/`, `report/` | data flow, trace format, test cases, GitHub |

Replace *name* with your names. **Everyone should read the whole README and try every feature** —
you may be asked about any part.

## Testing

Automatic logic tests (needs only Node.js):

```
node tests/test.js            # 100+ checks
node tests/test.js --report   # also rewrites report/test-results.md
```

The tests compare every example automaton against an independent reference
(regular expressions / arithmetic) on **all** strings up to length 7–10, and also check ε-closure,
dead states, validation errors and the custom-automaton parser.

Manual checklist for the demo: run an accepted and a rejected string on a DFA and on an NFA;
show the ε-NFA; show an NFA with two active states; try an invalid symbol; load a custom automaton;
use Prev/Next/Reset; change the speed.

## Working together on GitHub

```bash
git init
git add .
git commit -m "Initial simulator"
git branch -M main
git remote add origin https://github.com/<user>/DFA-NFA-Visualizer.git
git push -u origin main
```

Each member then works on a branch (`git checkout -b member1-dfa`), commits only their own files,
and opens a pull request. Because each person owns different files, merge conflicts are rare.
Commits with your name are also evidence of individual contribution for the report.

## Ideas to extend it

* NFA → DFA conversion (subset construction) with the equivalent DFA drawn next to the NFA
* DFA minimisation
* Regular expression → NFA (Thompson's construction)
* Export the diagram as PNG/SVG, save/load automata as JSON files
