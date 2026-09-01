type ResetEmail = {
  to: string;
  url: string;
};

export async function sendPasswordResetEmail({ to, url }: ResetEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "Masroofi <onboarding@resend.dev>";
  if (!apiKey) {
    throw new Error("إعداد البريد غير مكتمل: أضف RESEND_API_KEY في Vercel");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "إعادة ضبط كلمة مرور Masroofi",
      text: `مرحبًا،\n\nاضغط على الرابط التالي لتعيين كلمة مرور جديدة لحساب Masroofi:\n${url}\n\nإذا لم تطلب ذلك، تجاهل هذه الرسالة. صلاحية الرابط محدودة.`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>إعادة ضبط كلمة المرور</h2><p>اضغط على الزر التالي لتعيين كلمة مرور جديدة لحساب Masroofi:</p><p><a href="${url}" style="background:#0f766e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">تعيين كلمة مرور جديدة</a></p><p>إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة. صلاحية الرابط محدودة.</p></div>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`تعذر إرسال رسالة الاستعادة (${response.status}) ${detail}`.trim());
  }
}
