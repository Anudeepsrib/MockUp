# Workspace guide

The interface is a generic workspace. Users choose their own task and can move between the pages in any order. A new browser draft is empty; existing saved drafts are preserved.

## Super Agent

Super Agent Insights opens on the **Super Agent** chat page. The teal sidebar keeps the four workspace layers available throughout the suite.

Type into **Message Super Agent** and send with Enter or the arrow button. Shift+Enter inserts a line break. The empty welcome becomes a scrolling conversation, with the composer kept below the replies. Each completed message retains its answer and source references in the current chat.

Use **Context** in the composer to set scope, timeframe, focus, and expected outcome. The current sample backend requires these fields, so an incomplete context opens this dialog before sending. Context is checked again on the server. **CAFE(S) context review** opens the detailed assessment.

The knowledge control opens records you can pin to the conversation. The memory control opens reusable knowledge; completed replies offer a review link for newly drafted memories. **New chat** clears the current visible conversation and question, while keeping sources, pins, context settings, and memories. It does not reset the backend workspace.

Draft questions persist in this browser. Reload restores the latest backend run; full durable chat history is not implemented by the sample API. Sample responses and execution remain explicitly labelled.

## Context Layer

Manage sources in one table. **Add source** opens the searchable catalog; **Manage** opens a source's configuration and disconnect control. MCP servers are listed under **Tools**.

**Try a question** returns an answer and its evaluation together. **Ask & evaluate** checks keyword matches against configured sample sources, explicit requested years, and whether answer grounding has been assessed. Expand the matching-record list to inspect references. Grounding remains **Not verified** because the backend returns prepared answers. Changing the question or source configuration clears old results. The fixed 25-case evaluation suite is separate and is not displayed as the question's score.

This checkout stores connection selections and file names only. It does not authenticate to external systems or upload file bytes. File registration is explicitly labelled accordingly.

## Knowledge Layer

Search records or sources, inspect a record, and pin it to the current task. Use **Pinned for review** to narrow the list. The graph offers a second view of the available records. Source references are visible, but original passages and document downloads are not supplied by the sample backend.

## Memory

Use **Memories**, **Graph**, or **Sources**. Filter and search records, inspect source evidence, edit their content, and approve or invalidate them. Editing returns a memory to draft. Invalidated or unapproved records are excluded from recall. Derived patterns also require valid, approved supporting facts.

Memory changes save through the API. Export is available from the page header. Advanced memory configuration and research tools are no longer exposed in the main workspace.

## Context quality

The secondary navigation item opens the CAFE(S) assessment for the current task. Expand a check to inspect its method and references. Inspect included or excluded context records, and refresh checks when needed. Assessment metadata and limitations are collapsed under **Assessment details**.

No scenario switcher appears in the user experience. Synthetic fault-injection cases remain in the local API and automated tests.

## Environment and scope

**Help & workspace info** explains the pages and the current environment. Reset is available there and asks for confirmation before restoring the sample workspace.

The top bar labels the current data as sample data. This repository still returns prepared sample answers and uses a local FastAPI/SQLite backend. The private Deep Agents, LangSmith, and Hindsight integrations, real retrieval, authentication, and production isolation are separate backend work. Production styling does not make those services connected.

Run instructions are in [README](../README.md#run-locally). The [backend integration guide](BACKEND_INTEGRATION.md) and [context implementation plan](CONTEXT_QUALITY_IMPLEMENTATION_PLAN.md) describe the handoff to the private backend. No hosting deployment was requested for this UI pass.
