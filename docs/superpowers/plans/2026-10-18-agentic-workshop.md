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

- [x] شغّل `git rev-parse HEAD` و`Get-FileHash frontend/index.html -Algorithm SHA256` من workspace المصدر، وسجّل القيم.
- [x] افحص scripts وruntime، ثم شغّل `npm test` للـExpress baseline بعد التأكد من prerequisites. Expected: exit 0 أو failure موثق؛ لا تُصلح الأصل سرًا وتستمر بنفس الهوية.
- [x] سجّل agent/model وإعداداته والـskills وhooks وMCP المتاحة فعلًا، وحدود أي تعليمات لا يمكن عزلها عن Basic.
- [x] سجّل inventory السلوك مع history stubs والاعتماد على provider؛ اعتمد dataset اصطناعية وfixture strategy للمقارنة.
- [x] ثبّت target versions وحد الميزانية/الوقت لكل run في tooling. Gate: لا توجد run تبدأ بلا manifest؛ القرارات التقنية غير المحسومة تظل قرارات قبل التنفيذ.

### Task 2: تثبيت عقد التقييم وسيناريوهاته

**Files:** Create `docs/workshop/evaluation-checklist.md`; Read `src/index.js`, `frontend/index.html`, protocol.

**Interfaces:** Consumes baseline inventory؛ Produces checklist version ثابتة وfixture definitions: auth success/401، stream success/error/split، upload allowed/denied.

- [x] انسخ EVAL-01..08 من البروتوكول، وحدد خطوات إعادة الإنتاج وpass/fail لكل منها.
- [x] عرّف fixtures بأحداث `token`, `citations`, `done`, `error` حسب payloads الموجودة. Assertions: لا فقد أو تكرار مع split UTF-8/event، ولا إضافة افتراضية لتاريخ محادثات.
- [x] عرّف فحص POST/body/Authorization وعدم تسرب provider credential. حدّد error قبل headers وبعدها، وسياسة EOF طبقًا للعقد المعتمد.
- [x] سجّل درجات rubric وطريقة قياس effort قبل رؤية أول نتيجة. Gate: مراجع يقدر يعيد نفس التقييم بدون قراءة chat التنفيذ.
### Task 3: تنفيذ التجارب الأربع وتقييم الناتج الأول