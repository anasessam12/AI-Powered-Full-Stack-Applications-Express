# Run 02 prompt record

Initial prompt from the experiment protocol, with the shared framework/runtime target made explicit:

```text
Convert frontend/index.html into an Angular application using Angular 21.2.25, Angular CLI/build 21.2.27, TypeScript 5.9.3, and Node 24.21.0.
Preserve the existing UI behavior: login, session-expiry handling, health,
admin document upload, chat streaming, and source citations.
Keep the existing Express backend and API contract unchanged.
Separate focused components, state and API/stream services. Use strict typing
and conventions supported by the chosen Angular version.
Cover loading/error states and keyboard/mobile usability.
Verify against the running API or the shared deterministic fixtures.
Report changed files, commands actually run, their results and remaining gaps.
```

No follow-ups were sent before first-output scoring. Version pins are shared setup context, not additional feature requirements.

## Design gate and continuation

The first fresh CLI session returned this proposed design and made no file changes: standalone components for login, health, upload, chat, and citations; typed API and SSE services; signal-based session/chat state; Express/API contract unchanged; verification of fragmented streams, failures, roles, keyboard use, and mobile layout. The user had already authorized this exact Run 02 scope by approving execution of the written workshop plan. The implementation continuation was explicitly limited to that proposal and the initial prompt; this additional orchestration message is a recorded follow-up.
