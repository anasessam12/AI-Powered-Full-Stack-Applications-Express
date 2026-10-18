# 04 — الأدوات والـstack: إعداد وممارسات

توصيات للنسخة المحسّنة؛ ليست متطلبات شركة إضافية. روابط التوثيق راجعتها يوم 18 أكتوبر 2026. استخدم التوثيق الموافق للإصدار المثبت وقت التنفيذ.

## تجهيز الأدوات وإثبات أنها تعمل

| العنصر | ما يتسجّل في tooling.md | اختبار الإتاحة |
| --- | --- | --- |
| Agent/model | الاسم والإصدار وeffort والـhooks والسياسات | task صغيرة تقرأ ملفًا وتعرض النتيجة |
| Skills | المصدر والإصدار/commit والمكان والمهارات المحملة فعلًا | ظهور skill واتباعها في task محددة |
| Angular CLI MCP | command وcwd ونسخة CLI وأسماء الأدوات المعلنة | `list_projects` بعد وجود Angular workspace |
| Runtime | Node/package manager/Angular/Nest/Postgres/ORM | version outputs + install/build smoke |
| Tests | أسماء scripts والأوامر الفعلية | تشغيل check واحد وتسجيل exit code |

لا تعتبر «تم التثبيت» مساوية لـ«متاح للـagent». لا تنسخ config من editor لآخر دون معرفة schema الخاص به. هذه الحزمة لا تغيّر إعداداتك العامة ولا تثبّت skills أو MCP.

### Angular skills

المصدر الرسمي الحالي يعرض `angular-developer` و`angular-new-app`. اتبع طريقة تثبيت الأداة التي تستخدمها من [Angular Agent Skills](https://angular.dev/ai/agent-skills). الأمر الوارد هناك عند اختيار community skills installer:

```powershell
npx skills add https://github.com/angular/skills
```

الأمر للتنفيذ لاحقًا في البيئة المناسبة، ولم يُنفَّذ هنا. سجّل المصدر والـcommit، وراجع scope قبل تثبيت عالمي. لا تثبّت حزم skills متداخلة بلا حاجة؛ skill الخاصة بالـtask تكفي.

### Angular CLI MCP

[التوثيق الرسمي](https://angular.dev/ai/mcp) يذكر تشغيل السيرفر عبر:

```powershell
npx @angular/cli mcp
```

بعد إنشاء Angular workspace وتثبيت CLI محليًا، فضّل تشغيل نسخته المحلية مع working directory لذلك الـworkspace وتوثيق الإصدار. راجع `mcp --help` للنسخة المثبتة بدل افتراض أدوات موجودة في كل إصدار.

مثال JSON للأدوات التي تستخدم `mcpServers` و`cwd`؛ صيغة التسجيل ومكان الملف يعتمدان على الـhost:

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["ng", "mcp"],
      "cwd": "ABSOLUTE_PATH_TO_ANGULAR_WORKSPACE"
    }
  }
}
```

استبدل المسار، وشغّل من بيئة قادرة على استدعاء npm على Windows. المثال ليس config لـCodex ولا ملفًا جاهزًا للتشغيل. وصفة host الفعلية تُحدد عند اختيار الأداة.

بعد الاتصال: اطلب `list_projects`، ثم `get_best_practices`، و`search_documentation` عند سؤال API. استخدم build/test targets المعلنة إن كانت نسخة السيرفر تتيحها، أو CLI scripts موثقة كبديل. أدوات التشغيل قد تنفذ targets قوية؛ حدد build/test المطلوبة بدل إعطاء target غير محدد. أثناء القراءة يمكن استخدام `--read-only` إذا كانت نسختك تدعمه.

### Superpowers

Workflow موصى به للنسخة المنظمة: brainstorming → spec review → writing-plans → plan review/execution choice → تنفيذ task-by-task → verification → review.

ابدأ native في جلسة واحدة للتعلم وفهم الديف. استخدم subagents بعد ذلك فقط للمهام المستقلة وبطلب/قرار صريح، مع مراجعة التكامل. لا تجعل زيادة عدد agents بديلًا عن عقد واضح أو اختبار.

المهارة المطلوبة للمهمة تُحمّل عند الحاجة: systematic-debugging عند فشل غير مفهوم، وverification-before-completion قبل claim النجاح. لا تجمع skills UI متعارضة تجعل كل مهمة redesign.

### Impeccable

لـworkflow questions يكفي الرجوع للمراجع؛ لا تنفذ تحسينات تلقائية أثناء مقارنة الحفاظ على الأصل. في مرحلة التحسين: `init` لتسجيل المنتج عند غيابه، `shape` لتخطيط UX، `document` لاستخراج نظام موجود، ثم `audit` و`critique` و`polish` حسب الحاجة. الأمر الدقيق وسير العمل يتبعان النسخة المثبتة؛ راجع [الدليل](https://impeccable.style/docs/).

اعمل تصميمًا قابلًا للاستخدام: hierarchy وتباين وspacing وtokens ورسائل واضحة. أظهر loading/empty/error، واختبر keyboard وfocus وmobile. خلي motion له هدف ويحترم reduced motion؛ لا تطلب «شكل premium» بدون أمثلة وقيود ومستخدم واضح.

## Angular

- ثبّت نسخة معتمدة من الفريق ومتوافقة مع Node وTypeScript وRxJS طبقًا [لجدول التوافق](https://angular.dev/reference/versions). لا تستخدم latest المتحرك داخل مقارنة.
- تنظيم حسب feature: `auth/` و`chat/` و`documents/`، مع UI components مركزة وservices لعقد الـAPI وstream parsing. `shared/` للحاجات المشتركة فعلًا.
- TypeScript strict؛ تجنّب `any` وnon-null assertions التي تخفي نقص العقد.
- Standalone وlazy feature routes؛ signals للـUI/local state وcomputed للقيم المشتقة، وRxJS للـasync flows حيث يخدم الحل. لا تبدأ بـglobal store معقد دون احتياج.
- استخدم forms typed والمدعومة في الإصدار المختار. لا تخلط API حديثة من docs الحالية مع إصدار أقدم.
- اختَر change detection وفق نسخة Angular؛ بعض defaults تغيرت. نفس القاعدة لتفاصيل decorators وforms. المرجع: [Angular AI instructions](https://angular.dev/ai/develop-with-ai).
- لا تضع provider keys في Angular environments؛ ملفات frontend تصل للمتصفح. كل provider integration على السيرفر.
- عرض النص والمصادر بطريقة آمنة؛ لا تثق بـHTML/Markdown قادم من LLM، ولا تستخدم bypass للـsanitization كحل سريع.
- اختبارات تتعامل مع المستخدم وAPI fixtures، مع سيناريوهات stream وerror و401. guards في الواجهة لتنظيم UX، والصلاحيات تُفرض في السيرفر.

## NestJS

- Modular monolith حسب domain؛ Controller للـHTTP، Service لقواعد الاستخدام، وORM/repository للوصول للبيانات. DI عبر constructor وproviders واضحة.
- DTO classes للـruntime validation؛ TypeScript types وحدها لا تتحقق من request. اضبط ValidationPipe وسياسة الحقول الإضافية والتحويل بوعي، واختبر القيم غير الصالحة. [Validation](https://docs.nestjs.com/techniques/validation).
- auth وauthorization وملكية الموارد على السيرفر؛ اختبر 401 و403 ومحاولة مستخدم قراءة محادثة غيره إن كانت history ضمن النطاق.
- errors مفهومة دون stack traces أو بيانات provider حساسة. config validated عند startup، وCORS وupload limits وrate limits حسب threat model.
- طبقة واحدة للتعامل مع provider، مع timeout وإلغاء stream وفشل متوقع. JSON logs مع correlation ID بدون مفاتيح أو محتوى محادثات حساس.
- وثق HTTP contract باستخدام [OpenAPI](https://docs.nestjs.com/openapi/introduction)، وأضف أمثلة أحداث streaming لأن schemas المعتادة وحدها لا توضح دورة stream.
- unit tests لقواعد الأعمال، API integration tests للـvalidation والصلاحيات، وprovider fake للاختبارات الحتمية.

## PostgreSQL والـORM

- ORM واحد؛ وثّق لماذا اخترته. Nest يدعم خيارات متعددة؛ راجع [دليل databases](https://docs.nestjs.com/techniques/database).
- كل schema change عبر migration قابلة للتشغيل على DB جديدة. لا تستخدم auto schema sync بدل migrations في بيئة مشتركة/إنتاج.
- constraints على البيانات: FK وunique وnot-null وcheck حسب القاعدة؛ validation في UI وحدها غير كافية. [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).
- queries parameterized، وtransactions عندما تتغير عدة سجلات كوحدة واحدة، وindexes بناءً على query patterns وقياس فعلي.
- عند نقل SQLite FTS إلى Postgres اكتب اختبارات جودة retrieval على نفس عينة الأسئلة؛ تغيير DB قد يغير ranking والنتائج.
- PostgreSQL للـmetadata لا يحدد وحده استراتيجية RAG. full-text مقابل embeddings قرار منفصل؛ لا تضف pgvector وRedis وqueues لمجرد وجودها في المرجع القديم.
- storage للملفات والـDB ليسا transaction واحدة تلقائيًا؛ وثّق التعويض عند فشل upload/indexing، cleanup، ومن يستطيع قراءة الملف.

## نقطة حساسة: عقد streaming الحالي

الموجود في `src/index.js` و`frontend/index.html`:

```text
POST /api/v1/chat
Authorization: Bearer <session token>
Content-Type: application/json
body: { query, session_id, conversation_id }

response: text/event-stream
event token:     { token }
event citations: { citations: [{ source_name, page_number, chunk_index }] }
event done:      { message_id, provider }
event error:     { message }
```

دي نقطة بدء لاستخراج contract، وليست spec كاملة لكل status أو field optionality. الـbackend الحالي يقيّد query بعد trim إلى 1–2000 حرف ويعيد 422 عند مخالفة ذلك. تثبيت السلوك أو تغييره يتسجّل في spec.

Native EventSource لا يمثل POST body وAuthorization مخصصًا لهذا العقد. الحل المقترح للـmigration: fetch streaming داخل Angular service مع parser معزول وAbortController؛ الـHTTP interceptors لا تُطبّق تلقائيًا على native fetch، فتأكد من headers/session handling صراحةً. لو استخدمت transport مختلفًا اختبره ضد نفس العقد.

اختبر UTF-8 المجزأ بين chunks، event مفصولة على أكثر من chunk، events متعددة في chunk، done، error قبل وبعد headers، disconnect، وتحرير loading/resources. قرر سياسة EOF بدون done في العقد؛ لا تسمّه نجاحًا تلقائيًا. لا تفترض أن كل network chunk يساوي SSE event.

## لو الـAI جزء من المنتج نفسه

افصل تقييم coding agent عن تقييم إجابات التطبيق. استخدم مستندات اصطناعية وأسئلة ثابتة مع المصادر المتوقعة وسيناريو «المعلومة غير موجودة». مصادر مسترجعة ليست ضمان صحة للإجابة؛ قيّم grounding يدويًا على عينة. تعامل مع uploaded docs كنص غير موثوق، وحدّد صلاحية استرجاعه، ولا تعتمد على regex وحده كدفاع prompt injection.
