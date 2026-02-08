import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loops } from "@/lib/loops";
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

    // Send email via Loops transactional email
    const transactionalId = process.env.LOOPS_PASSWORD_RESET_ID;

    if (transactionalId) {
      const emailResult = await loops.sendTransactionalEmail({
        transactionalId,
        email: userEmail,
        dataVariables: {
          firstName: user.firstName,
          resetUrl,
        },
      });

      console.log("Password reset email sent via Loops:", emailResult);

      if (!emailResult.success) {
        console.error("Loops error:", emailResult);
      }
    } else {
      console.error("LOOPS_PASSWORD_RESET_ID is not set, password reset email not sent");
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
