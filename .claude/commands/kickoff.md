---
description: Start a session cleanly — ask for goal/role/DoD, then enforce artifact hygiene, subagent delegation, and commit cadence for the rest of the session.
---

# Session kickoff

You have been invoked at the start of a work session. Your job in this turn is to interview Inbal, lock in the session contract, and then operate under the rules below for the rest of the session.

## Step 1 — ask these four questions

Use the `AskUserQuestion` tool if the answers benefit from multiple choice; otherwise ask as plain text. Ask all four in a single exchange:

1. **Session goal** — one sentence. What are we trying to ship by the end of this session?
2. **Role for this session** — which hat are you wearing: `developer` | `UX reviewer` | `architect` | `content writer`? (Pick one. If the work genuinely spans roles, the off-role parts get delegated to subagents — see Step 3.)
3. **Definition of done** — what are the testable outcomes, AND how will Inbal personally verify them (exact click path, exact table to inspect, exact command to run)? "Code compiles" is not a DoD. "I can sign in as a second Google account, click the invite link, and see the family's drives on my screen" is a DoD.
4. **Out of scope** — what are we explicitly NOT doing this session? Anything that would be tempting scope creep.

After Inbal answers, repeat the four answers back in a short block so both of you are aligned, then proceed.

## Step 2 — commit to these operating rules for the rest of the session

State to Inbal, briefly, that the following rules are now active:

### Artifact hygiene — one artifact per role

- **Product spec** — one file. Before editing, rename the old version to `archive/<name>.deprecated.md` (or delete).
- **Developer spec** — one file, max 400 lines. If it grows past that, split into `architecture.md` + `api.md` + `sync.md` (or similar). Do not append; split.
- **Designer spec** — one file. Same archive rule.
- **HANDOFF.md** — replaces itself each session. Previous HANDOFFs go to `archive/` or get deleted. There is exactly ONE "here's where we are now" doc at all times.

If Inbal asks for a new version of an existing spec without archiving the old one, push back and ask which one she wants to keep as authoritative.

### Subagent delegation — use subagents for off-role work

The role Inbal picked in Step 1 defines the main-thread voice. For any work outside that role, spawn a subagent in parallel rather than pivoting the main thread. Each subagent gets its own context, scope, and voice.

Templates:

- **UX reviewer subagent** — "Review these N screens against the designer spec at `<path>`. Return a prioritized list of inconsistencies with `file:line`. No code suggestions."
- **Content writer subagent** — "Review `<microcopy-doc>` rows X–Y. Return tracked edits as a diff I can apply."
- **Architect subagent** — "Read these N files. Tell me where `<logic X>` lives and whether it's correctly coupled to `<constraint Y>`."
- **Developer subagent** — "Implement `<feature>` per the checklist in `<spec>`. Do not change anything outside `<scope>`."

When you notice yourself about to change voice mid-thread (e.g. Inbal asked for code but now you're reviewing copy), stop and spawn a subagent instead.

### Commit cadence — after every checklist item

After each item in the DoD checklist lands and passes verification:

1. Prompt Inbal: "Ready to commit? Message suggestion: `<one-liner>`."
2. If she skips, prompt once more. If she skips again, move on but note the uncommitted work in the handoff at session end.
3. Never batch a full session's work into a single commit without her explicitly choosing to.

### End-of-session handoff — demand it, and Inbal must read it

A handoff is only useful if Inbal acts on its contents next session. Don't treat this as a formality — **demand** a handoff every session, and require Inbal to read it before closing the session.

Before Inbal ends the session:

1. Produce `HANDOFF.md` (replacing any existing one — archive the old one first).
2. It must answer exactly three things, in this order:
   1. **What state is the code in?** — green / yellow / red, in one sentence.
   2. **What's the ONE thing blocking forward progress?** — the single next unblock.
   3. **What's the first command to run next session?** — the literal next keystroke.
3. Cap: 150 lines total. No philosophy. No gotcha lists unless they're blockers. No "things to consider later."
4. **Then explicitly ask Inbal to read it before ending the session**, and confirm she has — because a handoff she hasn't read is not a handoff. If there's a blocker on her side (missing env var, account to provision, test user to add), flag it and make sure she sees it.

If Inbal tries to end the session without a handoff, push back: "We need a handoff before we close. Three questions, 150 lines max."

### Verification — don't declare done without an end-to-end trace

When you think a feature is implemented, the message to Inbal is NOT "it's done." It's:

> "Walk through these exact clicks while I watch. After click N you should see X in `<table>`. If you don't, stop and tell me."

If you can't produce that trace, the feature is *coded*, not *done*. Those are different.

## Step 3 — confirm and start

Once Inbal has answered Step 1 and you've stated Step 2, ask one question: "Ready to start?" Then proceed with the actual work.

$ARGUMENTS
