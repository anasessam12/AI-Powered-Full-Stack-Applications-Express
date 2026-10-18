# 05 — قوالب التوثيق وprompts قابلة للاستخدام

انسخ القالب وقت الحاجة، واستبدل الحقول بين `<...>`. هذه قوالب، وليست نتائج أو موافقات أو ملفات تطبيق موجودة. وثّق السلوك والقرار والدليل؛ تجنّب حفظ أسرار أو chat كامل.

## 1. Feature spec

المكان: `docs/specs/<feature>/spec.md`.

```markdown
# <Feature> Specification
Status: Draft | Reviewed | Implemented | Verified
Version: <version>
Owner / reviewer / date: <values>
Source: <requirement/page/code reference>

## Problem and user
<من يحتاج ماذا، ولماذا؟>

## Scope
Must: <behaviors>
Out of scope: <explicit exclusions>

## Requirements and acceptance
REQ-<FEATURE>-01: <observable behavior and rationale>
AC-<FEATURE>-01:
Given <initial state>
When <action>
Then <observable result, exact values if applicable>

Failure / permissions / empty cases: <explicit expected behavior>
API contract: <link; requests, responses, errors, auth, stream lifecycle>
UX states: <link; loading, empty, error, success, keyboard>
Data and ownership: <fields, lifecycle, who may access them>
NFR: <target, environment, measurement method>
Assumptions / unresolved decisions: <owner, impact, resolution condition>

## Traceability
| Requirement | AC | Task | Test/evidence | Status |
| --- | --- | --- | --- | --- |
| <id> | <id> | <link> | <link> | <actual state> |

## Changes
<date / decision / affected ACs, contract and tests>
```

مثال سلوك مقترح، وليس claim عن التطبيق الحالي:

> REQ-CHAT-01: المستخدم يرى الرد تدريجيًا. AC-CHAT-01: Given session صالحة وstream fixture أحداثها token «أهلًا» ثم citations ثم done، When يُرسل سؤال، Then يظهر «أهلًا» ومصدره، ويخرج زر الإرسال من loading بعد اكتمال stream. اختبارات إضافية تغطي split events و401 وerror وEOF حسب العقد.

## 2. Task record

المكان: `docs/tasks/<task-id>.md`.

```markdown
# <TASK-ID>: <outcome>
Status / date / owner: <values>
Spec / AC IDs / plan: <links and IDs>
Allowed files: <exact paths>
Consumes / produces: <interfaces and types>

- [ ] فهم السلوك وقراءة الملفات اللازمة
- [ ] اختبار السلوك يفشل للسبب المقصود إن كانت task كود
- [ ] أقل تنفيذ صحيح داخل النطاق
- [ ] اختبارات وتحقيقات المهمة نجحت بدليل
- [ ] مراجعة diff والصلاحيات والعقد
- [ ] docs والـtraceability اتحدّثت

Changes and rationale: <what and why>
Validation: <evidence link>
Decisions / deviations: <ADR or spec change link>
Remaining risks / blocked checks: <actual limitations>
Learning: <one thing I can now explain or change myself>
```

## 3. Evidence record

المكان: `docs/evidence/<task-id>.md`.

```markdown
# Verification: <TASK-ID>
Date / commit or snapshot / environment: <values>
Requirement / AC: <IDs>

| Command/check | Working directory | Result | Evidence |
| --- | --- | --- | --- |
| <exact command> | <path> | <exit code and meaningful summary> | <log link> |
| <manual scenario> | <URL and fixture> | <observed behavior> | <safe screenshot> |

Not run / skipped / blocked: <check and why>
Known failures: <impact and next action>
Reviewer: <actual reviewer; do not invent>
```

## 4. Experiment manifest

المكان: `docs/workshop/runs/0N/manifest.md` في مساحة التسجيل المناسبة للبروتوكول.

```markdown
# Run <01..05> — <approach>
Status: Not started | Running | Evaluated | Repaired
Source commit / original HTML hash: <values>
Workspace / fresh session identifier: <values without secrets>
Agent/version / model / effort / settings: <exact values>
Active instructions / skills / MCP / hooks / memory: <inventory>
Runtime / target versions / dependency constraints: <values>
Input prompt / follow-ups: <link or exact text, secrets removed>
Start / first output / total time: <observed values>
Tokens / cost: <observed or unavailable>
Agent self-repair count / human interventions: <counts with notes>
First-output commit / repaired commit: <actual snapshots>
Evaluator/checklist version / fixture dataset: <values>
Results / rubric scores / rationale: <evidence links>
Known confounders / inherited gaps / new regressions: <separate notes>
```

## 5. Decision record

المكان: `docs/decisions/000N-<topic>.md`.

```markdown
# ADR-000N: <decision>
Status / date / decision owner: <values>
Context and constraints: <what triggered the decision>
Options: <two or more meaningful options if applicable>
Decision and reason: <chosen option and tradeoff>
Consequences: <benefits, costs, follow-up>
Affected spec / contract / tasks: <links>
Revisit when: <condition>
```

## 6. Prompt لكل طريقة في المقارنة

### Run 01 — Basic

```text
Convert this HTML application to Angular.
```

ارفق الأصل، وحدد workspace تقنيًا. لا تضف spec مفصلة بالخطأ. سجّل أسئلة الـagent وإجاباتك لو سأل، وأي تعليمات عالمية تؤثر عليه.

### Run 02 — Detailed

```text
Convert frontend/index.html into an Angular application using the fixed
Angular/runtime versions recorded for this experiment.
Preserve the existing UI behavior: login, session-expiry handling, health,
admin document upload, chat streaming, and source citations.
Keep the existing Express backend and API contract unchanged.
Separate focused components, state and API/stream services. Use strict typing
and conventions supported by the chosen Angular version.
Cover loading/error states and keyboard/mobile usability.
Verify against the running API or the shared deterministic fixtures.
Report changed files, commands actually run, their results and remaining gaps.
```

### Run 03 — Master / Structured Planning

```text
Migrate the supplied original HTML frontend to Angular, preserving its behavior
and the fixed Express API. Follow these phases in order:
1. Discover requirements from the original UI/API. Ask focused questions.
2. Write a concise BRD with scope and acceptance conditions.
3. Propose architecture, API boundaries and UX states, with tradeoffs.
4. Document the selected design and create a staged execution plan.
5. Derive coding instructions and implement incrementally.
6. Validate the requirements and maintain the artifacts as the code changes.
Use the experiment's fixed runtime and framework versions.
Record assumptions, follow-ups, checks actually run and deviations.
Include planning and discovery in the experiment's effort record.
```

### Run 04 — Spec Driven

```text
Read the supplied specification and original HTML/API sources.
First identify contradictions and decisions that block a correct implementation.
Link each requirement ID to acceptance scenarios, exact affected files,
interface contracts, implementation tasks and verification evidence.
Propose a plan and task list derived from the specification before coding.
Implement one task at a time, using behavior tests and checking the fixed API.
If behavior must change, update the spec/contract and affected tests/tasks first.
Do not add features outside scope. Do not claim checks passed unless run.
Produce a final traceability report showing satisfied and unmet AC IDs.
```

Spec هنا تُكتب وفق نفس نطاق التقييم وتُسجّل كمدخل لهذه الطريقة. وقت إعدادها ومناقشتها جزء من تكلفة workflow؛ لا تعتبره مجانيًا.

## 7. Prompt بدء النسخة المحسّنة

```text
هدفنا التعلم وبناء نسخة قابلة للصيانة من التطبيق المرجعي.
اقرأ docs/workshop/01-brief.md وdocs/workshop/03-workflow.md.
ابدأ بجرد السلوك الموجود والمتطلبات المتعارضة والقرارات الناقصة.
افصل Angular migration عن bonus NestJS + PostgreSQL.
استخدم Superpowers للاكتشاف والتخطيط والتنفيذ والتحقق حسب المرحلة.
استخدم Angular skills وAngular CLI MCP إن كانا متاحين فعلًا؛ سجّل قدراتهما.
استخدم Impeccable لتخطيط UX ومراجعتها ضمن النطاق المتفق عليه.
استخدم NestJS best practices عند العمل على backend.
اكتب spec قابلة للمراجعة وخطة مرتبطة بها قبل كود المنتج.
لكل قرار مؤثر اشرح البدائل والسبب، ولكل task حدّث docs والدليل.
المطلوب الآن discovery/spec؛ لا تبدأ scaffold أو dependencies قبل اعتماد التصميم.
```

## 8. Prompt تنفيذ task ومراجعتها

```text
نفّذ TASK-<ID> فقط طبقًا لـ<spec path> و<plan path> و<contract path>.
اقرأ الملفات المرتبطة وحدد المدخلات والمخرجات قبل التعديل.
اكتب واختبر السلوك المطلوب، ونفّذ أقل تغيير يحققه.
لا تضف dependency أو تغيّر API/DB schema خارج المهمة دون تسجيل القرار.
حدّث task record وtraceability وأدلة الأوامر الفعلية.
عند الانتهاء: وضّح ما تغير ولماذا، الاختبارات ونتائجها، والمتبقي.
ثم اطلب مني شرح تدفق البيانات وتعديلًا صغيرًا للتأكد إني فهمت الناتج.
```

```text
راجع الـdiff مقابل AC IDs والعقد، وابحث عن أخطاء صحة وصلاحيات وحالات فشل
وتسرب بيانات وكسر migration أو stream. لكل finding اذكر الملف والسلوك
والأثر وطريقة إعادة الإنتاج. ميّز bug مؤثرًا عن اقتراح أسلوب.
راجع أدلة التحقق وحدد ما لم يُختبر. لا تعدّل الكود أثناء جولة المراجعة.
```
