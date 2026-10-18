# Agentic Workshop Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** إعداد مقارنة موثقة للطرق الأربع في ورشة الشركة، ثم تحديد نسخة Angular محسّنة ومسار مستقل لبونص NestJS + PostgreSQL.

**Architecture:** مقارنة Angular migration ضد Express API ثابت في workspaces وsessions مستقلة، ثم تجربة toolchain محسّنة منفصلة. نقل backend وDB مرحلة لاحقة بعقود وspec وخطة خاصة بها، للحفاظ على قابلية التقييم وفهم الأخطاء.

**Tech Stack:** للـbaseline: HTML + Express + SQLite. للمقارنة: Angular مع API ثابت. للبونص المستهدف: Angular + NestJS + PostgreSQL؛ ORM والإصدارات يُحسمان في التصميم.

**Spec:** [ملخص التكليف والقرارات](../../workshop/01-brief.md) + [بروتوكول التجارب](../../workshop/02-experiments.md).

**Status:** Draft for review. هذه خطة إعداد وتقييم للورشة، وليست خطة كود منتج نهائية. لم تُنفّذ التجارب أو يُنشأ Angular/Nest workspace بعد.

## Global Constraints

- كل تجربة تبدأ من نفس التطبيق الأصلي، وفي session مستقلة قدر الإمكان، وبنفس agent/model للمقارنة العادلة.
- اختبر الناتج قبل التصحيح اليدوي، وبعدها سجّل التحسينات والتدخلات منفصلة.
- قارن: الدقة، جودة الكود، المعمارية، قابلية الصيانة والتوسع، الافتراضات، والجهد.
- التحضير والتخطيط جزء من زمن الطرق المنظمة؛ لا تقارن أول prompt فقط.
- User target stack: NestJS + PostgreSQL + Angular، وتوثيق كل مرحلة.
- لا توجد dependency versions أو أزمنة أو scores معتمدة بعد؛ تُسجّل قبل التجارب ولا تُخترع نتائج.

أول أربع قيود من ملخص التكليف في brief، بصياغة عربية للمعنى.

## Review Focus

1. تعليمات عالمية أو skills تفرض planning داخل Basic؛ نحتاج manifest يوضحها وحدود المقارنة — Task 1.
2. query/headers أو POST stream تغيرت في migration؛ نحتاج اختبار contract وsplit chunks — Tasks 2–3.
3. فشل provider أو 401 يترك الواجهة loading؛ نحتاج fixture failure وإثبات استعادة UI — Tasks 2–3.
4. API موجود في الأصل لكنه stub؛ لا نعتبر غيابه feature جديدة مكسورة — Tasks 1 و4.
5. دمج full-stack/redesign في مقارنة Angular يغيّر المتغيرات؛ نفصل enhanced والـbonus بنتائج مستقلة — Task 5.

## File map

- موجود: `frontend/index.html`، `src/index.js`، `tests/http.test.js`، `tests/app.test.js` — مصدر baseline والسلوك.
- موجود في هذه الحزمة: `docs/workshop/01-brief.md` إلى `05-templates-and-prompts.md` — السياق والبروتوكول والقوالب.
- يُنشأ عند التنفيذ: `docs/project/baseline.md` و`docs/project/tooling.md` — inventory وإعدادات مثبتة.
- يُنشأ عند التنفيذ: `docs/workshop/evaluation-checklist.md` — معيار موحد لا يُكشف كـspec مخفية لـBasic.
- يُنشأ عند التنفيذ: `docs/workshop/runs/01/` إلى `04/` وكل منها `manifest.md` و`prompts.md` و`evidence.md` — النتائج الخام والإصلاحات منفصلة.
- يُنشأ لاحقًا: `docs/workshop/comparison.md` و`retrospective.md` — استنتاجات مدعومة.
- للنسخة المحسّنة: `docs/specs/angular-migration/spec.md` و`docs/api/contract.md` و`DESIGN.md` ثم خطة تنفيذ خاصة.
- للبونص: `docs/specs/full-stack/spec.md` وADR للـORM/retrieval/auth ثم خطة تنفيذ خاصة.

مساحات التطبيق المعزولة لا تُنشأ أثناء إعداد المستندات. أسماء ملفات Angular وNest التفصيلية تُقفل في خططهما بعد اختيار الإصدارات والموافقة على spec، ولا تُخمن في هذه الخطة.

### Task 1: تثبيت baseline والبيئة

**Files:** Read المصادر أعلاه؛ Create `docs/project/baseline.md`, `docs/project/tooling.md`.

**Interfaces:** Consumes source commit وHTML/API الحاليين؛ Produces source SHA وHTML hash وinventory وversion manifest تستخدمها كل runs.

- [ ] شغّل `git rev-parse HEAD` و`Get-FileHash frontend/index.html -Algorithm SHA256` من workspace المصدر، وسجّل القيم.
- [ ] افحص scripts وruntime، ثم شغّل `npm test` للـExpress baseline بعد التأكد من prerequisites. Expected: exit 0 أو failure موثق؛ لا تُصلح الأصل سرًا وتستمر بنفس الهوية.
- [ ] سجّل agent/model وإعداداته والـskills وhooks وMCP المتاحة فعلًا، وحدود أي تعليمات لا يمكن عزلها عن Basic.
- [ ] سجّل inventory السلوك مع history stubs والاعتماد على provider؛ اعتمد dataset اصطناعية وfixture strategy للمقارنة.
- [ ] ثبّت target versions وحد الميزانية/الوقت لكل run في tooling. Gate: لا توجد run تبدأ بلا manifest؛ القرارات التقنية غير المحسومة تظل قرارات قبل التنفيذ.

### Task 2: تثبيت عقد التقييم وسيناريوهاته

**Files:** Create `docs/workshop/evaluation-checklist.md`; Read `src/index.js`, `frontend/index.html`, protocol.

**Interfaces:** Consumes baseline inventory؛ Produces checklist version ثابتة وfixture definitions: auth success/401، stream success/error/split، upload allowed/denied.

- [ ] انسخ EVAL-01..08 من البروتوكول، وحدد خطوات إعادة الإنتاج وpass/fail لكل منها.
- [ ] عرّف fixtures بأحداث `token`, `citations`, `done`, `error` حسب payloads الموجودة. Assertions: لا فقد أو تكرار مع split UTF-8/event، ولا إضافة افتراضية لتاريخ محادثات.
- [ ] عرّف فحص POST/body/Authorization وعدم تسرب provider credential. حدّد error قبل headers وبعدها، وسياسة EOF طبقًا للعقد المعتمد.
- [ ] سجّل درجات rubric وطريقة قياس effort قبل رؤية أول نتيجة. Gate: مراجع يقدر يعيد نفس التقييم بدون قراءة chat التنفيذ.

### Task 3: تنفيذ التجارب الأربع وتقييم الناتج الأول

**Files:** Create `docs/workshop/runs/01..04/{manifest,prompts,evidence}.md` كأربع مجموعات ملفات فعلية.

**Interfaces:** Consumes baseline/manifest/checklist والـprompts الأربعة؛ Produces first-output snapshot، evidence، scores وconfounders لكل طريقة.

- [ ] أنشئ workspaces معزولة من نفس baseline عبر workflow العزل المعتمد، وsessions مستقلة دون توريث outputs. Verify source SHA وHTML hash متساويان.
- [ ] شغّل كل طريقة بالـprompt المحدد، ودوّن التفاعلات وكل context إضافي. للـSpec Driven جهّز spec مراجَعة مرتبطة بمعيار التقييم، واحسب وقت إعدادها.
- [ ] قبل تدخل بشري، احفظ ناتج كل طريقة ونتائج checks. في كل Angular workspace راجع scripts الفعلية، وسجّل أمر install/build/test ومكانه بدل افتراض أن scripts كلها موجودة.
- [ ] نفّذ checklist بنفس fixtures؛ سجّل pass/fail وexit codes. إذا compilation فشلت سجّل السيناريوهات المعتمدة عليها «تعذر تقييمها» بدل اختراع نتائج.
- [ ] أثبت سيناريوهات stream fragmentation و401/provider error المذكورة في Task 2، واحسب أثرها في rubric. Gate: لكل score دليل وللناتج الأول snapshot محفوظ.

### Task 4: إصلاح موثق وتحليل وتعلم

**Files:** Modify run evidence؛ Create `docs/workshop/comparison.md`, `docs/workshop/retrospective.md`.

**Interfaces:** Consumes النتائج الخام والـscores؛ Produces مقارنة first-output/after-repair واستنتاجات محدودة بالأدلة.

- [ ] سجل العيوب كموروثة أو regressions أو إضافات خارج النطاق؛ أصلح بعد حفظ التقييم الأول وسجّل الزمن والتدخل.
- [ ] أعد فقط الفحوص المتأثرة والإلزامية بعد الإصلاح، واحتفظ بالنتائج القديمة منفصلة.
- [ ] نفذ change challenge موحدة؛ سجّل من فهم وعدّل الكود وكم احتاج وقتًا ومساعدة.
- [ ] اكتب مقارنة بالمعايير السبعة، و3 ملاحظات وروابط لأمثلة كود وحدود الدراسة. Gate: لا يوجد استنتاج يقول إن prompt أفضل إذا اختلف model/toolchain ولم يُذكر ذلك.

### Task 5: تحضير أفضل نسخة ومسار الـFull Stack

**Files:** Create migration spec وfull-stack spec والعقد وADRs وخطتين مشتقتين كما في file map، ثم run 05 منفصلة إذا نُفّذت.

**Interfaces:** Consumes gaps المثبتة واختيارات المستخدم؛ Produces specs مراجَعة وخطط بملفات/interfaces/tests دقيقة قبل scaffolding.

- [ ] راجع scope: حافظ على Angular/API في migration؛ سجل redesign أو features الجديدة كمتطلبات منفصلة.
- [ ] استخدم Superpowers وImpeccable والمهارات المتاحة لاستخراج spec وUX وعقد، وأثبت اتصال Angular MCP قبل الادعاء باستخدامه.
- [ ] للبونص احسم ORM/auth/retrieval/local deployment وحدود cloud data؛ لا تورث قيود FastAPI القديمة تلقائيًا.
- [ ] اكتب خطتي تنفيذ مستقلتين؛ كل task تربط AC وملفات واختبارات وأوامر فعلية متوافقة مع scaffold المعتمد. راجع specs والخطط قبل كود المنتج.
- [ ] عند التنفيذ لاحقًا اختبر happy path/failure/permissions/migrations، وسجّل enhanced نتائج منفصلة عن الأربع الأساسية. Gate: demo قابل للإعادة وrunbook، مع فهم المطور لتدفق البيانات وحدود النظام.

## Self-review of this plan

- يغطي التحضير، الأربع طرق، ثبات المصدر/model، المقارنة قبل الإصلاح، التوثيق، والتعلم والبونص.
- اختيار المستخدم للـstack محفوظ في مرحلة مستقلة؛ لا ننفذ code migration على spec غير موجودة.
- Review Focus موزّع على مهام لها تحقق محدد، والـstubs والـtooling confounders واضحان.
- لا توجد results مختلقة أو commands لبناء Angular/Nest غير موجودين. أوامر التنفيذ التفصيلية تُقفل بعد تثبيت workspace وإصداراته.

## Execution handoff

الخطة جاهزة للمراجعة، وكل checkboxes تخص العمل المستقبلي. التوصية: Native في جلسة واحدة، task-by-task، لأنه أوضح للتعلم ولتتبع المقارنة، مع مراجعة منفصلة عند اكتمال النسخة. البديل Subagent-driven مناسب بعد وضوح الحدود والميزانية؛ اختيار التنفيذ ومراجعة الخطة يسبقان كود المنتج.
