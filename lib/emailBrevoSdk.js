exports.sendBrevoEmailApi = async (data) => {
  try {
    console.log("📧 [Brevo Email] Sending email with data:", {
      to_email: data.to_email,
      cc_email: data.cc_email,
      subject: data.email_subject,
    });

    const message = {
      sender: {
        name: "DevOps",
        email: "devops@morelifelondon.net",
      },
      to: Array.isArray(data.to_email) ? data.to_email : [data.to_email],
      subject: data.email_subject,
      htmlContent: data.htmlContent,
    };

    if (data.cc_email && data.cc_email.length > 0 && data.cc_email[0].email) {
      message.cc = data.cc_email;
    }

    console.log("📤 [Brevo Email] Prepared message body:", JSON.stringify(message, null, 2));

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY || "YOUR_API_KEY_HERE",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    console.log("📡 [Brevo Email] Response Status:", response.status);

    const responseText = await response.text();
    console.log("📨 [Brevo Email] Raw Response Text:", responseText);

    if (!response.ok) {
      throw new Error(`Brevo API Error: ${response.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log("✅ [Brevo Email] Successfully sent:", result);

    return result;
  } catch (error) {
    console.error("❌ [Brevo Email] Failed to send email:", error.message);
    console.error("🧩 [Brevo Email] Full error stack:", error);
    throw error;
  }
};
