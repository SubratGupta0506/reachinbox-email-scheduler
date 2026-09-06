import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface SendEmailInput {
  recipient: string;
  subject: string;
  body: string;
}
export const verifyEmailConnection = async () => {
  await transporter.verify();
  console.log("Ethereal SMTP connection successful");
};

export const sendEmail = async ({
  recipient,
  subject,
  body,
}: SendEmailInput) => {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipient,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
};
