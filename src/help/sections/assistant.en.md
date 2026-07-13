---
updated: 2026-07-13
---

# Working with your assistant

Connecting is the smaller half. The larger half is teaching your assistant that it should
actually use the connection.

## Your assistant has to know kumbuka exists {#instructions}

An assistant that is offered kumbuka as a tool will **not use it on its own**. It sees a
tool in a list. It has to be told to look things up at the start of a session, and to
propose an entry after a decision has been made.

That is what the ready-made instruction block in the [Connect](/overview) area is for.
Paste it once into your assistant's project instructions, and the rest runs by itself.

> This is by far the most common reason kumbuka appears not to work: the connection is
> live, the tools are there, and the assistant never looks. It does not know that it
> should.

## Propose and confirm {#ask}

By default your assistant does not simply start writing. It **proposes**, you **confirm**.

That is not a brake, it is the point. A memory that gets written to unasked is a landfill
within two weeks, and nobody trusts it. The moment of confirmation is the moment an
observation turns into shared knowledge.

Where writes land when nobody names a scope is up to you, in [Settings](/settings): ask, a
fixed project scope, or global. Your private memory stays available to you regardless.

## Keys: the address of an entry {#keys}

A **key** is the address under which your assistant looks an entry up directly, instead of
searching for it.

Format: lowercase letters and digits, separated by dots or hyphens. No underscores, no
capitals, no slashes.

Workable keys: `db.system-of-record`, `naming.services`, `status.search-migration`.

The key is optional. But an entry without one is an entry you only find if you go looking
for it, and to go looking you already have to know it is there.

Writing again under the same key **replaces** the entry. No duplicate appears.

## What makes a good entry {#good-entries}

A good entry stands on its own. You understand it without the conversation it came from and
without the person who wrote it.

- Workable: "Service names are kebab-case. This applies to repositories, containers and DNS
  labels alike."
- Useless: "We'll do it the way we discussed." — Who? What? When?

What does not belong in here:

- **Conversation logs and summaries.** kumbuka is not a transcript.
- **Guesses.** That is what `open_question` is for.
- **Credentials, tokens, other people's personal data.** Never.
- **Anything that is already in the code.** The code is the truth about the code. An entry
  that copies it will quietly go wrong.

## Revising and removing {#revising}

In the console: open the entry, edit it, save. Done.

Through your assistant: writing again under the same key replaces the previous content. To
remove an entry, say so explicitly and the assistant clears it away.

## Limits {#limits}

Two worth knowing before you run into them:

- **An entry holds at most 1,500 characters.** That is deliberate, not thrift: anything
  longer is a document rather than a rule, and an assistant loading documents into its
  context does not have a memory, it has a space problem.
- **Your assistant's free-text search matches the wording.** It finds what is written, not
  what was meant. Leaning on keys and memory types finds things more reliably than fishing
  with search terms.
