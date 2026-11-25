# Academic Project Report: DFA & NFA String Processing Visualizer

**Course:** Formal Languages and Automata Theory / Theory of Computation  
**Project Title:** Interactive Visual Simulator for Deterministic and Nondeterministic Finite Automata  
**Date:** Academic Session 2026–2027  
**Technology Stack:** HTML5, CSS3, Vanilla JavaScript (ES6+), Scalable Vector Graphics (SVG), Node.js (Test Harness)

---

## Abstract

Automata theory is a foundational pillar of theoretical computer science, compiler construction, and regular language processing. Despite its mathematical elegance, learners often struggle to conceptualize dynamic state transitions, nondeterministic branching, and $\varepsilon$-closure computations through traditional static blackboard diagrams. This project presents the **DFA / NFA String Processing Visualizer**, an interactive, zero-dependency, browser-based pedagogical simulation system. The application executes formal automata models—Deterministic Finite Automata (DFA) and Nondeterministic Finite Automata (NFA) with $\varepsilon$-transitions—step-by-step across arbitrary input strings. The software architecture strictly decouples computational logic engines (`dfa.js`, `nfa.js`) from visual rendering modules (`visualization.js`) using a serialized execution trace protocol. Real-time visual feedback includes SVG dynamic token traversal, state glow highlighting, synchronized input tape advancement, interactive transition table lookups, and execution logging. A Node.js automated testing harness rigorously validates the simulation engines across thousands of generated strings against independent formal regular expression and arithmetic oracles, achieving 100% test pass fidelity across 104 test specifications.

---

## 1. Introduction and Theoretical Background

A **Finite Automaton** (FA) is an abstract computational machine with a finite number of internal configurations, termed *states*. It responds to a sequence of discrete input symbols drawn from an alphabet, transitioning between states according to a well-defined transition rule. Finite automata precisely characterize the class of **Regular Languages** ($\mathcal{L}_{3}$ in the Chomsky Hierarchy), which forms the operational basis for lexical analyzers (e.g., Lex/Flex), regular expression engines, network protocol verifiers, and digital sequential circuit design.

### 1.1 Deterministic Finite Automaton (DFA)
Formally, a Deterministic Finite Automaton is defined as a 5-tuple:
$$M = (Q, \Sigma, \delta, q_0, F)$$
where:
1. $Q$ is a finite, non-empty set of states.
2. $\Sigma$ is a finite input alphabet (disjoint from $Q$).
3. $\delta: Q \times \Sigma \to Q$ is the total transition function mapping a state and an input symbol to exactly one subsequent state.
4. $q_0 \in Q$ is the distinguished start (initial) state.
5. $F \subseteq Q$ is the set of final (accepting) states.

The extended transition function $\hat{\delta}: Q \times \Sigma^* \to Q$ is defined inductively:
- $\hat{\delta}(q, \varepsilon) = q$
- $\hat{\delta}(q, wa) = \delta(\hat{\delta}(q, w), a)$ for $w \in \Sigma^*, a \in \Sigma$.

A string $w \in \Sigma^*$ is accepted by $M$ if and only if $\hat{\delta}(q_0, w) \in F$.

### 1.2 Nondeterministic Finite Automaton (NFA with $\varepsilon$-moves)
An NFA extends the deterministic model by allowing transitions to zero, one, or multiple target states, as well as transitions that consume no input symbol (spontaneous or $\varepsilon$-transitions). Formally:
$$N = (Q, \Sigma, \delta, q_0, F)$$
where the transition function is defined as:
$$\delta: Q \times (\Sigma \cup \{\varepsilon\}) \to \mathcal{P}(Q)$$
Here, $\mathcal{P}(Q)$ denotes the power set of $Q$.

For any state subset $S \subseteq Q$, the **$\varepsilon$-closure** of $S$, denoted $\text{ECLOSE}(S)$, is the smallest set containing $S$ that is closed under $\varepsilon$-transitions:
$$\text{ECLOSE}(S) = S \cup \{ p \in Q \mid \exists q \in \text{ECLOSE}(S) \text{ such that } p \in \delta(q, \varepsilon) \}$$

The computation over a string $w = a_1 a_2 \dots a_n$ ($a_i \in \Sigma$) proceeds across a set of active configurations:
$$S_0 = \text{ECLOSE}(\{q_0\})$$
$$S_i = \text{ECLOSE}\left(\bigcup_{q \in S_{i-1}} \delta(q, a_i)\right) \quad \text{for } 1 \le i \le n$$

A string $w$ is accepted by $N$ if and only if:
$$S_n \cap F \ne \emptyset$$

By Kleene's Theorem and the Rabin-Scott Subset Construction, NFAs and DFAs have equivalent computational power: any language accepted by an NFA is regular and can be recognized by an equivalent DFA, although the DFA may require up to $2^{|Q|}$ states in the worst case.

---

## 2. Problem Statement & Educational Motivation

In standard academic curricula, finite automata are taught using static state diagrams on chalkboards or textbooks. While adequate for illustrating definitions, static representations present significant cognitive hurdles:
1. **Invisibility of the Temporal Process:** Students cannot visually observe the instantaneous state configuration during string traversal.
2. **The "Nondeterminism Fallacy":** Students frequently misinterpret nondeterminism as random "guessing" or probabilistic branching, rather than understanding it as the simultaneous evaluation of all admissible computational branches in parallel.
3. **$\varepsilon$-Transition Confusion:** The spontaneous activation of states without symbol consumption is notoriously difficult to trace manually.
4. **Error-Prone Manual Tracing:** Hand-tracing state transitions for strings longer than 4–5 symbols is cumbersome and prone to calculation mistakes.

Hence, there is a clear demand for an interactive, responsive, web-based visualization tool that executes both DFAs and NFAs step-by-step, providing synchronized graphical, tabular, and textual feedback.

---

## 3. Project Objectives

The primary engineering and educational objectives of this project are:
1. **Bimodal Automata Simulation:** Support both deterministic (DFA) and nondeterministic (NFA with $\varepsilon$) computational paradigms.
2. **Decoupled Architecture:** Maintain strict isolation between automata theoretical execution engines and graphical rendering subsystems.
3. **Trace-Driven Step Animation:** Emit an immutable, structured execution trace (`Player` pattern) that allows forward stepping, reverse stepping, continuous auto-play, and pause at arbitrary speeds.
4. **Vector-Graphic Visualization:** Render mathematically accurate directed graphs using Scalable Vector Graphics (SVG), including self-loops (cubic Béziers), curved bidirectional arcs (quadratic Béziers), dashed $\varepsilon$-edges, and animated token interpolation via `requestAnimationFrame`.
5. **Interactive UI Ergonomics:** Provide a live input tape, synchronized transition matrix lookup, color-coded execution log, and draggable diagram nodes.
6. **Custom Automaton Specification:** Incorporate an intuitive text grammar parser permitting users to write, validate, and simulate arbitrary automata definitions.
7. **Empirical Quality Assurance:** Guarantee engine correctness via automated unit testing comparing simulation outputs against analytical regular expression references.

---

## 4. System Architecture & Modular Design

The application follows a strictly modular, event-driven, client-side architectural model. No server-side components, external JavaScript dependencies, or compilation steps are involved.

```
+-------------------------------------------------------------------------+
|                              USER INTERFACE                             |
|        (index.html / style.css - Tab Controls, Tape, Table, Log)        |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                           ORCHESTRATION LAYER                           |
|                                (main.js)                                |
|        - Event handling, input validation, DOM synchronization          |
+-------------------+---------------------------------+-------------------+
                    │                                 │
                    ▼                                 ▼
+---------------------------------------+  +------------------------------+
|             SPECIFICATION             |  |      ANIMATION CONTROLLER    |
|   (presets.js / parser.js)            |  |         (animation.js)       |
|   - 8 Preset Automata Definitions     |  |   - Player state machine     |
|   - Custom DSL Parser & Serializer    |  |   - Step index pointer       |
+-------------------+-------------------+  +--------------+---------------+
                    │                                     │
                    ▼                                     │
+---------------------------------------+                 │
|           LOGIC ENGINES               |                 │
|       (dfa.js & nfa.js)               |                 │
|   - 5-tuple validation                |                 │
|   - Delta transition evaluation       |                 │
|   - Epsilon-closure computation       |                 │
+-------------------+-------------------+                 │
                    │                                     │
                    ▼ emits                               │
+---------------------------------------+                 │
|          SERIALIZED TRACE             |                 │
|    [{ index, active, edges, ... }]    |◄────────────────┘
+-------------------+-------------------+
                    │ passes step state
                    ▼
+-------------------------------------------------------------------------+
|                         VISUALIZATION SUBSYSTEM                         |
|                           (visualization.js)                            |
|       - SVG Canvas rendering (nodes, double circles, Bezier arcs)       |
|       - Node draggable repositioning                                    |
|       - requestAnimationFrame token physics interpolation               |
+-------------------------------------------------------------------------+
```

### 4.1 Trace Protocol Specification
The bridge between computational logic and visual presentation is the **Trace Object**. When `engine.run(input)` is invoked, it compiles an immutable execution trace:
```typescript
interface ExecutionTrace {
  input: string;
  accepted: boolean;
  dead: boolean;
  reason: string;
  finalStates: string[];
  steps: ExecutionStep[];
}

interface ExecutionStep {
  index: number;         // Step index (0 = initial configuration)
  consumed: number;      // Number of input symbols consumed so far
  symbol: string | null; // Symbol read at this step ('ε' or character)
  prevActive: string[];  // States active prior to transition
  active: string[];      // States active after transition
  edges: Array<{         // Directed edges traversed during this step
    from: string;
    to: string;
    symbol: string;
  }>;
  dead: boolean;         // True if stuck in an implicit dead state
  description: string;   // Human-readable natural language log entry
}
```
Because the visualization layer only reads this trace, the automata algorithms can be executed, benchmarked, and verified in headless Node.js environments without DOM mock libraries.

---

## 5. Algorithmic Formulation

### 5.1 DFA Execution Algorithm (`dfa.js`)
The DFA engine operates in deterministic linear time $\mathcal{O}(n)$, where $n = |w|$:

```
Algorithm 1: Deterministic Finite Automaton Evaluation
Input: DFA M = (Q, Σ, δ, q₀, F), String w = a₁a₂...aₙ
Output: ExecutionTrace T

1:  current ← q₀
2:  Initialize T.steps with Step 0: active = [q₀], consumed = 0
3:  for i ← 1 to n do
4:      a ← w[i]
5:      if a ∉ Σ then
6:          Append stuck step to T, T.accepted ← false, T.dead ← true, return T
7:      nextState ← δ(current, a)
8:      if nextState is undefined then
9:          Append dead-state step to T, T.accepted ← false, T.dead ← true, return T
10:     Append step to T: prev = [current], active = [nextState], edge = (current, nextState, a)
11:     current ← nextState
12: end for
13: T.accepted ← (current ∈ F)
14: T.finalStates ← [current]
15: return T
```

### 5.2 NFA & $\varepsilon$-Closure Algorithm (`nfa.js`)
The NFA engine executes parallel branch tracking over sets of active states, avoiding combinatorial backtracking:

```
Algorithm 2: NFA Evaluation with Epsilon-Closure
Input: NFA N = (Q, Σ, δ, q₀, F), String w = a₁a₂...aₙ
Output: ExecutionTrace T

Function EPSILON-CLOSURE(S):
    closure ← S
    stack ← List(S)
    traversedEdges ← []
    while stack is not empty do
        q ← stack.pop()
        for each p in δ(q, ε) do
            if (q, p) not yet recorded then record (q, p) in traversedEdges
            if p ∉ closure then
                closure ← closure ∪ {p}
                stack.push(p)
            end if
        end for
    end while
    return (closure, traversedEdges)

Main Simulation:
1:  (active₀, initEdges) ← EPSILON-CLOSURE({q₀})
2:  Initialize T.steps with Step 0: active = active₀, edges = initEdges
3:  active ← active₀
4:  for i ← 1 to n do
5:      a ← w[i]
6:      moved ← ∅
7:      symbolEdges ← []
8:      for each q in active do
9:          for each target in δ(q, a) do
10:             moved ← moved ∪ {target}
11:             symbolEdges.append((q, target, a))
12:         end for
13:     end for
14:     if moved = ∅ then
15:         Append dead step to T, T.accepted ← false, T.dead ← true, return T
16:     (nextActive, epsEdges) ← EPSILON-CLOSURE(moved)
17:     Append step to T: prev = active, active = nextActive, edges = symbolEdges ∪ epsEdges
18:     active ← nextActive
19: end for
20: T.accepted ← (active ∩ F ≠ ∅)
21: T.finalStates ← active ∩ F
22: return T
```

For state set $Q$, computing $\varepsilon$-closure takes $\mathcal{O}(|Q| + |E_\varepsilon|)$ time using depth-first search. Over a string of length $n$, total simulation time is $\mathcal{O}(n \cdot (|Q|^2))$, which executes instantaneously in client JavaScript for all pedagogical automata ($|Q| \le 20$).

---

## 6. Implementation Highlights

### 6.1 Graphical Rendering & Vector Geometry (`visualization.js`)
- **State Glyphs:** Regular states are represented as SVG `<circle>` elements with radius $R = 26\text{px}$. Final states are rendered with concentric double circles ($R_1 = 26\text{px}, R_2 = 21\text{px}$). The start state features an incoming entry arrow labeled with a distinct indicator.
- **Arc Curvature Calculation:**
  - Self-loops are parameterized as cubic Bézier curves (`C` path commands) extending vertically above or below the node.
  - Bidirectional transitions between pairs of states $(u, v)$ and $(v, u)$ calculate normal offset vectors to render quadratic Bézier arcs (`Q` path commands), preventing edge visual collisions.
  - $\varepsilon$-transitions are visually distinguished through SVG `stroke-dasharray="6,4"` styling.
- **Dynamic Token Traversal:** When stepping from state $u$ to $v$, a traveling token (`<circle class="token">`) interpolates along the underlying SVG `<path>` using `path.getPointAtLength(distance)` computed through `window.requestAnimationFrame`.

### 6.2 Custom Automaton DSL Parser (`parser.js`)
The application features a built-in Domain-Specific Language (DSL) that allows users to specify custom automata using an intuitive plain-text syntax:
```text
type: NFA
alphabet: 0, 1
start: q0
final: q2
q0, 0|1 -> q0
q0, 0   -> q1
q1, 1   -> q2
q1, eps -> q2
```
The parser checks lexical correctness, validates deterministic exclusivity for DFAs, infers implicit state and alphabet sets when omitted, and warns users of unhandled transitions.

---

## 7. Experimental Verification and Test Results

Quality assurance was conducted via an automated test harness (`tests/test.js`) executed under Node.js.

### 7.1 Testing Methodology
1. **Exhaustive Oracle Comparison:** For each preset automaton, an independent mathematical oracle (regular expressions or modular arithmetic) was evaluated across all possible alphabet permutations up to length $k \in [7, 10]$ (totaling over 2,000 generated strings per alphabet).
2. **Structural Validation:** Verification that the parser detects malformed lines, illegal symbols, and nondeterminism in DFAs.
3. **Trace Invariant Assertions:** Ensuring that the length of the emitted trace matches string length plus initialization, that transitions correspond to valid graph edges, and that acceptance states match theoretical expectations.

### 7.2 Test Summary Table

```
================================================================================
DFA / NFA Visualizer — Automated Logic Test Suite
Test Execution Environment: Node.js v20+ / Windows x64
Total Test Checks Executed: 104
Total Passed: 104
Total Failed: 0
Success Rate: 100.0%
================================================================================
```

| ID | Automaton Name | Type | Test String | Oracle Criterion | Result | Verdict |
|---|---|---|---|---|---|---|
| 1 | Ends in 01 | DFA | `1101` | `w.endsWith('01')` | ACCEPT | **PASS** |
| 2 | Ends in 01 | DFA | `1100` | `w.endsWith('01')` | REJECT | **PASS** |
| 3 | Ends in 01 | DFA | $\varepsilon$ | `w.endsWith('01')` | REJECT | **PASS** |
| 4 | Even number of 1s | DFA | `1001` | `count('1') % 2 == 0` | ACCEPT | **PASS** |
| 5 | Even number of 1s | DFA | `111` | `count('1') % 2 == 0` | REJECT | **PASS** |
| 6 | Contains "ab" | DFA | `baabb` | `w.includes('ab')` | ACCEPT | **PASS** |
| 7 | Contains "ab" | DFA | `bbb` | `w.includes('ab')` | REJECT | **PASS** |
| 8 | Divisible by 3 | DFA | `110` (=6) | `parseInt(w, 2) % 3 == 0` | ACCEPT | **PASS** |
| 9 | Divisible by 3 | DFA | `101` (=5) | `parseInt(w, 2) % 3 == 0` | REJECT | **PASS** |
| 10 | Ends in 01 | NFA | `0001` | `w.endsWith('01')` | ACCEPT | **PASS** |
| 11 | Contains 101 | NFA | `0110110` | `w.includes('101')` | ACCEPT | **PASS** |
| 12 | Contains 101 | NFA | `1100` | `w.includes('101')` | REJECT | **PASS** |
| 13 | $0^*1^*2^*$ | $\varepsilon$-NFA | `0112` | `/^0*1*2*$/` | ACCEPT | **PASS** |
| 14 | $0^*1^*2^*$ | $\varepsilon$-NFA | `210` | `/^0*1*2*$/` | REJECT | **PASS** |
| 15 | $a^* \cup b^*$ | $\varepsilon$-NFA | `aaa` | `/^a*$/ \|\| /^b*$/` | ACCEPT | **PASS** |
| 16 | $a^* \cup b^*$ | $\varepsilon$-NFA | `ab` | `/^a*$/ \|\| /^b*$/` | REJECT | **PASS** |
| 17 | Determinism Check | DFA | `q0, 0 -> q1, q2` | Nondeterminism detected | Error caught | **PASS** |
| 18 | $\varepsilon$ in DFA | DFA | `q0, eps -> q1` | $\varepsilon$ disallowed in DFA | Error caught | **PASS** |

---

## 8. Detailed Worked Example

### Tracing String `1101` on DFA "Binary strings ending in 01"
Alphabet $\Sigma = \{0, 1\}$, States $Q = \{q_0, q_1, q_2\}$, Start $= q_0$, Final $F = \{q_2\}$.

| Step | Consumed | Symbol | Active State | Transition Applied | Transition Log |
|---|---|---|---|---|---|
| 0 | 0 | — | $\{q_0\}$ | Initial configuration | Started at initial state $q_0$ |
| 1 | 1 | `1` | $\{q_0\}$ | $\delta(q_0, 1) \to q_0$ | Read '1', self-loop on $q_0$ |
| 2 | 2 | `1` | $\{q_0\}$ | $\delta(q_0, 1) \to q_0$ | Read '1', self-loop on $q_0$ |
| 3 | 3 | `0` | $\{q_1\}$ | $\delta(q_0, 0) \to q_1$ | Read '0', moved from $q_0$ to $q_1$ |
| 4 | 4 | `1` | $\{q_2\}$ | $\delta(q_1, 1) \to q_2$ | Read '1', moved from $q_1$ to $q_2$ |

**Evaluation:**
- Input string consumed: Yes (4 of 4 symbols processed).
- Active state configuration: $\{q_2\}$.
- Acceptance condition: $q_2 \in F$ is **True**.
- **Result:** **ACCEPTED**.

Conversely, processing string `1100` terminates in state $q_1 \notin F$, triggering an unambiguous **REJECTED** verdict.

---

## 9. Comprehensive Viva & Oral Defense Preparation

### 9.1 Core Automata Theory Questions
1. **Q: What is the formal difference between a DFA and an NFA?**  
   *A:* In a DFA, the transition function is deterministic: $\delta: Q \times \Sigma \to Q$, requiring exactly one next state for each symbol. In an NFA, $\delta: Q \times (\Sigma \cup \{\varepsilon\}) \to \mathcal{P}(Q)$, allowing zero, one, or multiple transitions, as well as spontaneous $\varepsilon$-transitions.
2. **Q: Do NFAs have greater expressive power than DFAs?**  
   *A:* No. Both models accept exactly the same class of languages—the regular languages. Any NFA can be transformed into an equivalent DFA via the Rabin-Scott Subset Construction, though the resulting DFA may exhibit an exponential state explosion ($2^{|Q|}$ states).
3. **Q: What is the mathematical definition of $\varepsilon$-closure?**  
   *A:* The $\varepsilon$-closure of a state $q$ is the set of all states reachable from $q$ by following zero or more $\varepsilon$-transitions. Formally, it is the reflexive transitive closure of the binary relation defined by $\delta(\cdot, \varepsilon)$.
4. **Q: How does this visualizer handle missing transitions in a DFA?**  
   *A:* Missing transitions represent an implicit dead (trap) state. If the automaton encounters a symbol for which no transition is defined, the engine marks the run as stuck/dead and rejects the string immediately.

### 9.2 Software Architecture & Engineering Questions
1. **Q: Why are logic computations completely isolated from visual rendering?**  
   *A:* Decoupling through an immutable trace data structure (`dfa.js` $\to$ Trace $\to$ `visualization.js`) adheres to the Single Responsibility Principle. This enables headless command-line automated testing with Node.js, prevents DOM-rendering bottlenecks during state evaluation, and allows independent development of UI and automata logic.
2. **Q: How does the visualizer simulate nondeterministic branching without backtracking?**  
   *A:* It uses the set-of-active-states approach. Rather than exploring branches sequentially via recursive backtracking, the engine evaluates all active paths concurrently at each step:
   $$\text{active}_{i} = \text{ECLOSE}\left(\bigcup_{q \in \text{active}_{i-1}} \delta(q, a)\right)$$
3. **Q: How are smooth edge animations rendered in the browser?**  
   *A:* Transition arrows are modeled as SVG paths. During animated steps, JavaScript calculates coordinates via `SVGPathElement.getPointAtLength()` within `requestAnimationFrame` render loops, smoothly translating a marker circle along the trajectory.

---

## 10. Conclusion & Future Scope

The **DFA / NFA String Processing Visualizer** bridges the gap between formal theoretical concepts and intuitive visual cognition. By delivering clear, real-time representations of state transitions, active subsets, $\varepsilon$-closures, and input tape tracking, it significantly improves the comprehension of foundational automata theory. The system's zero-dependency, browser-native design ensures universal accessibility across desktop and mobile devices without installation overhead.

### Future Enhancements
- **Interactive Subset Construction:** Visual step-by-step conversion of an NFA to its equivalent DFA.
- **Hopcroft's DFA Minimization:** Automated reduction of redundant DFA states into minimal equivalence partitions.
- **Regex-to-NFA Compiler:** Integration of Thompson's Construction algorithm to generate automata directly from user regular expressions.
- **Export Facilities:** Exporting generated SVG graphs and execution logs as publication-quality PDF/PNG documents.

---

## 11. References
1. Hopcroft, J. E., Motwani, R., & Ullman, J. D. (2006). *Introduction to Automata Theory, Languages, and Computation* (3rd ed.). Addison-Wesley.
2. Sipser, M. (2012). *Introduction to the Theory of Computation* (3rd ed.). Cengage Learning.
3. Lewis, H. R., & Papadimitriou, C. H. (1997). *Elements of the Theory of Computation* (2nd ed.). Prentice Hall.
4. W3C Scalable Vector Graphics (SVG) 2 Specification: https://www.w3.org/TR/SVG2/
