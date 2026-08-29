# تفعيل إشعارات Masroofi عبر Firebase Cloud Messaging

## إعداد تطبيق Android في Firebase

1. افتح [Firebase Console](https://console.firebase.google.com/) وأنشئ مشروعًا جديدًا أو استخدم مشروعًا موجودًا.
2. أضف تطبيق Android جديدًا باستخدام اسم الحزمة:

```text
com.masroofi.app
```

3. نزّل الملف `google-services.json` وضعه في هذا المسار داخل المشروع:

```text
android/app/google-services.json
```

لا تضع هذا الملف داخل مجلد `src` أو داخل ملفات الويب.

## إعداد Vercel

أضف متغيرًا سريًا باسم:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
```

ضع داخله محتوى JSON الخاص بحساب خدمة Firebase Admin SDK. يمكن إنشاء مفتاح حساب الخدمة من:

**Firebase Console → Project settings → Service accounts → Generate new private key**

يجب أن يكون المتغير من نوع **Secret** ومفعّلًا في **Production**. لا تضعه في GitHub ولا داخل APK.

## البناء

بعد وضع `google-services.json` في المسار الصحيح، نفّذ:

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

سيظهر ملف APK في:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## سلوك الإشعارات

عند فتح التطبيق بعد تسجيل الدخول، يطلب Android إذن الإشعارات ويسجل رمز الجهاز في حساب المستخدم. عند إضافة الشريك مصروفًا أو طلبًا منزليًا، يرسل الخادم إشعارًا إلى أجهزة الأعضاء الآخرين في نفس البيت فقط.

في Android 13 أو أحدث يجب أن يوافق المستخدم على إذن الإشعارات حتى تظهر التنبيهات. يعتمد وصول الإشعارات أيضًا على وجود Google Play Services على الجهاز.
