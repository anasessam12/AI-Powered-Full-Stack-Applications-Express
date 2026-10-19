# Retrieval and evidence policy

## User and journey

An Agent asks a support question. The API searches indexed document chunks and only requests an answer when the evidence clears its configured threshold.

## Contract and data flow

Retrieval is internal to chat, not a standalone browser search endpoint. PostgreSQL `websearch_to_tsquery` plus a `simple` text-search vector rank candidate chunks. If a query produces no lexemes, an exact substring fallback handles text such as Arabic. Results exclude failed/deleted sources, order stably by rank and chunk UUID, and are capped at five chunks. Source, page, section, rank, and score are carried forward as citation evidence.

`AnswerPolicy` bounds serialized context, sets the relevance threshold, tells the provider that document text is untrusted input, and declines answers without evidence. The migration trigger refreshes `search_vector` on chunk insert/content update.

## Failure behavior and tests

No evidence produces an explicit abstention and skips the provider call. PostgreSQL integration tests cover ranking, deterministic ties, result caps, Arabic fallback, and exclusion behavior; policy tests cover threshold and context limits. See [retrieval service](../../../apps/api/src/app/retrieval/retrieval.service.ts), [policy](../../../apps/api/src/app/retrieval/answer-policy.ts), and [chunker](../../../apps/api/src/app/retrieval/chunking/document-chunker.ts).
