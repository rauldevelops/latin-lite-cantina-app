import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    const successMessage = "If an account exists with this email, you will receive a password reset link.";

    if (!user || !user.email) {
      return NextResponse.json({ message: successMessage });
    }

    const userEmail = user.email;

    // Delete any existing password reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: userEmail },
    });

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");

    // Create token with 1-hour expiry
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        identifier: userEmail,
        token,
        expires,
      },
    });

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send email via Resend
    // Note: Use "onboarding@resend.dev" for testing, or your verified domain in production
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Latin Lite Cantina <onboarding@resend.dev>";

    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: "Reset your Latin Lite Cantina password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Latin Lite Cantina</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="margin-top: 0;">Hello,</p>
              <p>We received a request to reset your password for your Latin Lite Cantina account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
              <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">Latin Lite Cantina - Fresh Latin-inspired meals delivered to your door</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent result:", emailResult);

    if (emailResult.error) {
      console.error("Resend error:", emailResult.error);
    }

    return NextResponse.json({ message: successMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
