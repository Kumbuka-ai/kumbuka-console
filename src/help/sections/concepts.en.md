---
updated: 2026-07-13
---

# Concepts

kumbuka does not watch your conversations. It does not read along, does not analyse, and
does not guess what might have mattered. What is in here was written or confirmed by a
person.

That is the whole difference, and everything else follows from it.

## Entry and memory type {#entries}

An **entry** is a statement: a rule, a decision, a definition, a state of affairs. Not a
conversation log, not a document, not a copy of your source code. Those keep living where
they belong.

Every entry carries a **memory type**, which says how binding it is, and optionally a
**key**, by which your assistant looks it up directly.

The six types and when to use which: [Memory types](/help/types).

## Scopes: where knowledge lives {#scopes}

A scope is not a folder. It is a **kind of access**:

- **global** — exactly one per team. The baseline your assistant reads first. What sits
  here applies everywhere.
- **project** — shared rooms you create yourselves, say one per product or repository.
  Members read and write, administrators manage.
- **private** — your personal working memory. Yours alone.

There is no nesting, no inheritance, no tree. Three kinds of access, flat. That is
deliberate: a hierarchy in which nobody can remember where things belong is worse than none
at all.

## Who wrote it {#authorship}

Authorship is derived by the server from the **write channel**, never from something the
client claims.

Write in the console and your name is on the entry. Write through your assistant and the
entry is marked as having come through the assistant, while the human behind the session is
still recorded.

An assistant cannot pass itself off as somebody else. There is no field for it to write an
author into.

## Your private memory {#private}

Your private entries are reachable by you alone, and only through your own authenticated
assistant session.

No administrator, no console view and no team-facing interface can read them. This is not a
setting somebody could flip: **the code paths of the team-facing surfaces have no route to
private rows.** They do not ask for them and then filter them out. They cannot reach them.

If your account is disabled, your private memory stays untouched and stays yours.

## What kumbuka does not claim {#limits}

Two promises we deliberately do not make, because we could not keep them:

**We do not claim that data could never be technically inspected by anyone.** Whoever runs
a database has access to a database. That is true of every piece of software, and we do not
pretend it is different here. What we do guarantee is narrower and, in exchange, checkable:
there is no route from a team or administration surface to private entries. kumbuka is open
source. You do not have to take our word for it; you can read it.

**We do not claim that your assistant will do what a `constraint` says.** kumbuka presents
the rule, in full, identically in every session. Whether a language model obeys it is up to
the model. What we guarantee is reliable delivery, not obedience.
