# 01 — فهم التكليف وحدود المصادر

الحالة: ملخص متحقق من صفحة الورشة والريبو، وليس spec نهائيًا لتطبيق جديد.

## التكليف المؤكد

المصدر: [AI & Agentic Development Workshop — Frontend Team](https://app.notion.com/p/AI-Agentic-Development-Workshop-Frontend-Team-3f9522d4d47f80678aebd5c5443818d2?pvs=11)، تمت قراءته من المتصفح يوم 18 أكتوبر 2026.

- الورشة يوم الاثنين 19 أكتوبر 2026 لفريق Frontend.
- التحضير: قراءة [الريبو المرجعي](https://github.com/SAMeh-ZAGhloul/AI-Powered-Full-Stack-Applications) وفهم agents وprompt engineering وSpec Driven ومراجعة الكود.
- التحدي الأساسي: تحويل تطبيق single-page HTML إلى Angular بأربع طرق: Basic، Detailed، Master Prompt / Structured Planning، وSpec Driven.
- كل تجربة تبدأ من نفس التطبيق الأصلي، وفي session مستقلة قدر الإمكان، وبنفس agent/model للمقارنة العادلة.
- اختبر الناتج قبل التصحيح اليدوي، وبعدها سجّل التحسينات والتدخلات منفصلة.
- قارن: الدقة، جودة الكود، المعمارية، قابلية الصيانة والتوسع، الافتراضات، والجهد.
- التحضير والتخطيط جزء من زمن الطرق المنظمة؛ لا تقارن أول prompt فقط.
- مسموح فكرة بديلة. الـFull Stack بونص اختياري والـstack مرن.
- المطلوب فهم الناتج ومشاركة النتائج؛ لا يوجد اشتراط لعرض رسمي.

## اختيارات المستخدم المؤكدة

- Stack مستهدف: Angular + NestJS + PostgreSQL.
- أدوات مستهدفة: Superpowers، Impeccable، Angular skills، Angular MCP، NestJS skills.
- مطلوب توثيق كل خطوة والتعلم من القرارات والناتج.

## ما وجدناه في هذا الريبو

| المصدر | ما يصفه | طريقة استخدامه |
| --- | --- | --- |
| `README.md` و`package.json` | Express + SQLite + OpenRouter وواجهة HTML | نقطة انطلاق التنفيذ الحالي |
| `frontend/index.html` | login وhealth ورفع مستند وسؤال وstreaming وcitations | جرد السلوك الفعلي للـmigration |
| `src/index.js` | API الحالي؛ chat عبر POST وSSE | مرجع عقد التوافق الحالي |
| `artifacts/BRD.md` وبقية artifacts | تصور سابق: FastAPI وChromaDB وSQLite وRedis وlocal LLM | مرجع تاريخي؛ لا تُنقل متطلباته تلقائيًا |
| `.clinerules` | تعليمات للتصور السابق بلغة Python | تحتاج adaptation موثقة قبل استخدام أدوات تقرأها |

Baseline المرصود: commit `998bc8662613904b3d50dcfacfe636447822291c`.
البيئة المرصودة: Node `v24.21.0` وnpm `11.19.0`. هذه ليست مصفوفة إصدارات معتمدة للـstack المستهدف.

يوجد endpoint للمحادثات في النسخة الحالية يعيد قائمة فارغة. وجود endpoint لا يثبت وجود persistence أو user flow مكتمل؛ يُسجّل كفجوة ولا يُختلق تاريخ محادثات أثناء تقييم migration.

## سلطة المتطلبات

لتحضير الورشة: التكليف يحدد التسليم، واختيار المستخدم يحدد الـstack الإضافي. للتنفيذ: سجل requirements معتمد يحدد السلوك، ثم API contract وتصميم معتمد وخطة مشتقة منه. الكود الحالي يصف الواقع، ولا يثبت وحده أن السلوك صحيح.

عند التعارض، اكتب source A / source B / أثر التعارض / القرار وصاحبه. لا تدمج FastAPI وExpress وNestJS في تعليمات متناقضة. القيود القديمة مثل «no Docker» لا تصبح قرارًا جديدًا بدون مراجعة نطاقها.

## قرارات قبل التنفيذ الفعلي

| القرار | التوصية الحالية | الحالة |
| --- | --- | --- |
| التطبيق | Customer Support الحالي | مقترح؛ مسموح فكرة أخرى |
| فصل المقارنة عن البونص | Angular أولًا مع API ثابت، ثم Nest/Postgres | مقترح |
| ORM | TypeORM مناسب لتعلم Nest entities/repositories؛ التزم بخيار الفريق إن وجد | غير محسوم |
| auth في البونص | جلسات أو JWT وفق متطلبات الاستخدام، مع صلاحيات server-side | يحتاج spec؛ username-only الحالي demo |
| retrieval | ادرس PostgreSQL full-text أولًا لمعادلة FTS الحالي؛ embeddings/pgvector إن تطلبها spec | يحتاج قرار جودة وبحث |
| UI | الحفاظ على الواجهة في المقارنة، ثم تحسينها بمرحلة مستقلة | مقترح |
| الإصدارات والوقت والميزانية | versions مثبتة وحد تجريبي موحد قبل runs | لم تُثبت بعد |

لا يُدّعى أن Angular skills أو Angular MCP متصلان في هذه الجلسة. لم تظهر أدوات Angular MCP ضمن الأدوات المتاحة عند إعداد الدليل. توجد مهارة NestJS وImpeccable وSuperpowers محليًا؛ التشغيل الفعلي لكل أداة يُسجّل عند التجربة.

## التعامل مع الاعتمادات

صفحة الورشة تعرض API credential. لا تنسخ قيمته في docs أو prompts أو screenshots أو Git. خزّن credentials محليًا في البيئة فقط، واطلب من المسؤول تدوير أي مفتاح اتضح أنه منشور خارج الجمهور المقصود. هذا الدليل لا يحتوي قيمته.

## معيار نجاح التحضير

تقدر تشرح الفرق بين prompt وagent وskill وMCP وspec، وتشغّل تجربة من مصدر ثابت، وتربط كل تقييم بدليل، وتحدد قرارًا اتخذه AI وتوافق عليه أو ترفضه بأسباب.
