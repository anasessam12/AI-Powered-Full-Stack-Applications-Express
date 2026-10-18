# 03 — دورة العمل للنسخة المحسّنة والـFull Stack

دي playbook تنفيذ، وليست تصريحًا بأن التطبيق اتنفّذ. مخرجات المراحل التالية تُنشأ أثناء العمل؛ الملفات المسماة فيها مقترحة ما لم يذكر غير ذلك.

## 0. جرد الواقع وتجهيز السياق

اقرأ الـHTML والـAPI والاختبارات الموجودة. سجّل ما يعمل فعليًا، ما لا يعمل، وما هو مجرد endpoint أو claim في docs. افصل reference قديم عن target جديد. ثبّت baseline، وversions وrun commands وcapabilities المتاحة.

**المستند:** `docs/project/baseline.md` + `docs/project/tooling.md`.
**معيار الخروج:** تقدر تعيد نفس الحالة من commit وlockfile، وكل نقص معروف متسجّل. لا تسجّل screenshots أو tests باعتبارها ناجحة إلا بعد تنفيذها.

## 1. Discovery وتحديد النطاق

استخدم Superpowers brainstorming للنسخة المحسّنة. حدد المستخدم، المشكلة، أهم رحلة، must/should/out-of-scope، حدود البيانات، الوقت والميزانية. اقترح بديلين عند وجود قرار مؤثر فقط، مع tradeoffs. افصل migration عن ميزات جديدة.

**المستند:** `PRODUCT.md` + `docs/project/questions.md`.
**معيار الخروج:** نطاق مفهوم، والقرارات التي تمنع تصميمًا صحيحًا حُسمت؛ الافتراضات الباقية ظاهرة وليها أثر وصاحب قرار.

## 2. كتابة spec قابلة للتحقق

حوّل كل requirement إلى ID وسبب وGiven/When/Then. غطّ النجاح والفشل والصلاحيات. اربط الـNFR بظروف قياس، لا تكتب «fast/secure/scalable» وحدها. أي أرقام جديدة تكون أهدافًا مقترحة لحد اعتمادها، لا أرقام أداء مُحققة.

**المستند:** `docs/specs/<feature>/spec.md` باستخدام القالب.
**معيار الخروج:** مراجعة النطاق والسلوك؛ كل AC يمكن إثباتها باختبار أو فحص محدد. الـspec المعتمدة هي مرجع التنفيذ.

## 3. العقود والقرارات المعمارية وUX

حدد request/response/errors/auth والـstream lifecycle قبل ربط UI وbackend. اختر ORM واحدًا، ونموذج البيانات، وحدود modules، وطريقة إعداد وتشغيل محلي. سجّل قرارًا جوهريًا في ADR صغير: السياق، البدائل، القرار، الأثر.

للواجهة: استخدم Impeccable لتخطيط الرحلة والـstates وكتابة `DESIGN.md`؛ وثق tokens ومكونات أساسية ورسائل الخطأ وfocus. migration تحفظ السلوك والهوية أولًا، وredesign لها scope وقياس مستقلان.

**المستند:** `docs/architecture/overview.md` + `docs/decisions/0001-<decision>.md` + `docs/api/contract.md` + `DESIGN.md`.
**معيار الخروج:** العقد له أمثلة success/error/stream؛ UI فيها loading/empty/error/disabled/success، والقرارات لا تتعارض مع spec.

## 4. خطة التنفيذ

استخدم writing-plans بعد استقرار spec. لكل task: المتطلبات التي يغطيها، الملفات الدقيقة، interfaces المستخدمة والمنتجة، اختبار سلوك وأمره ونتيجته المتوقعة، التنفيذ، التحقق، التوثيق، ثم commit عند التصريح بذلك.

قسّم إلى vertical slices صغيرة. مثال ترتيب للـFull Stack بعد نجاح Angular migration:

1. Nest foundation + PostgreSQL connection/migration + health، مع تشغيل محلي قابل للإعادة.
2. auth/session والصلاحيات وربط أول مسار بالواجهة.
3. document metadata وupload/retrieval بعقد واضح وعينات اصطناعية.
4. chat من Angular إلى Nest إلى provider، مع stream وcitations.
5. اختبارات المسارات الحرجة، hardening، runbook وdemo.

دي خريطة milestones وليست implementation plan جاهزة؛ الخطة التفصيلية بأسماء ملفات وinterfaces تُشتق من spec المعتمدة لكل milestone.

**المستند:** `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`.
**معيار الخروج:** مفيش requirement بلا task، ومفيش task بلا طريقة تحقق، والتبعيات متسلسلة بوضوح. راجع الخطة واختار طريقة التنفيذ قبل بدء كود المنتج.

## 5. تنفيذ task واحدة

ابدأ من context محدود: spec + task + عقد + ملفات مرتبطة + ADRs اللازمة. افهم السلوك واكتب اختبارًا ذا قيمة؛ شغّله وشاهد فشله للسبب المقصود، نفّذ أقل تغيير صحيح، شغّله مجددًا، ثم refactor مع بقاء الاختبارات ناجحة.

في UI اختبر تجربة المستخدم، لا أسماء private methods. في Nest اختبر business rules وAPI boundaries، وفي DB استخدم PostgreSQL حقيقية معزولة لا بديل SQLite يخبّي اختلافات SQL. الـLLM يكون fake/deterministic في الاختبارات العادية؛ smoke حي منفصل عند توفر الإعدادات.

تحديث docs أو تنسيق بسيط لا يحتاج test مصطنع. اختَر تحققًا متناسبًا، وتحقق من الرابط/العقد/البناء عند الحاجة.

**المستند:** `docs/tasks/<task-id>.md` مع روابط spec والدليل والقرار الجديد.
**معيار الخروج:** AC المطلوبة مثبتة، نطاق الـdiff واضح، ولا توجد اختبارات skipped تُعرض كأنها passed.

## 6. المراجعة والتحقق

راجع correctness والصلاحيات وتسرب البيانات والعقد وDB migrations وحالات stream والفهم. استخدم Impeccable audit/critique في مراجعة UI ثم polish لإصلاح نقاط محددة، وفق نسخة المهارة المثبتة. افحص desktop/mobile والـkeyboard والـfocus ورسائل الخطأ.

مع bug: reproduce → hypothesize → اختبار يثبت السبب → fix محدود → regression test. استخدم systematic-debugging؛ لا تكدّس تغييرات تخمينية.

**المستند:** `docs/evidence/<task-id>.md` + findings في task.
**معيار الخروج:** أوامر فعلية وexit codes ونتائج AC وعيوب متبقية. «راجعنا» بدون أثر أو «كل حاجة شغالة» بدون دليل لا يكفيان.

## 7. تسليم وتعلّم

حدّث README وrunbook والمتطلبات المتأثرة والعقد. اعمل traceability review، ثم demo ومراجعة نهائية. اطلب من زميل شرح flow أو تنفيذه من docs، وسجّل أي فجوة. لخّص ماذا علّمك الـAI وأين احتاج تصحيحًا.

**المستند:** `README.md` + `docs/runbook.md` + `docs/workshop/retrospective.md`.
**معيار الخروج:** مطور آخر يشغّل المشروع ويثبت السيناريو الأساسي ويعرف الحدود المتبقية.

## قاعدة التوثيق اليومية

لكل task سجّل: الهدف → المدخلات → ما تغير → السبب → الدليل → المتبقي. حدّثه في نفس تغيير الكود. لا تنشئ مستندًا جديدًا لكل رسالة؛ دوّن القرار مرة واحدة واربطه. كل مستند يوضح حالته: Draft / Reviewed / Implemented / Verified مع تاريخ ودليل للحالة الأخيرة.
