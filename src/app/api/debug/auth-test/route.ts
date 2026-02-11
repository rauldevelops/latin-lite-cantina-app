import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// TEMPORARY: Remove this file after debugging
export async function GET() {
  try {
    // Check if admin user exists
    const admin = await prisma.user.findUnique({
      where: { email: "admin@latinlitecantina.com" },
      select: {
        id: true,
        email: true,
        firstName: true,
        role: true,
        password: true,
      },
    });

    if (!admin) {
      return NextResponse.json({
        status: "FAIL",
        reason: "No user found with email admin@latinlitecantina.com",
        totalUsers: await prisma.user.count(),
      });
    }

    if (!admin.password) {
      return NextResponse.json({
        status: "FAIL",
        reason: "User exists but has no password",
        user: { id: admin.id, email: admin.email, role: admin.role },
      });
    }

    // Test bcrypt comparison
    const testPassword = "admin123!";
    const passwordMatch = await bcrypt.compare(testPassword, admin.password);

    return NextResponse.json({
      status: passwordMatch ? "OK" : "FAIL",
      reason: passwordMatch ? "Password matches" : "Password does NOT match",
      user: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        role: admin.role,
        hasPassword: true,
        passwordHashPrefix: admin.password.substring(0, 7), // just the bcrypt version prefix
      },
      dbConnected: true,
    });
  } catch (error) {
    return NextResponse.json({
      status: "ERROR",
      reason: String(error),
    }, { status: 500 });
  }
}
