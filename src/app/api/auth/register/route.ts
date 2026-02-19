import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { syncContactToLoops } from "@/lib/loops/contacts";
import { sendUserCreatedEvent } from "@/lib/loops/events";
import { waitUntil } from "@vercel/functions";

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName } = await request.json();

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with nested customer creation
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "CUSTOMER",
        customer: {
          create: {},
        },
      },
    });

    // Sync contact to Loops and send welcome event after response is sent
    waitUntil(
      Promise.all([
        syncContactToLoops(user.id).catch((err) =>
          console.error("Failed to sync contact to Loops:", err)
        ),
        sendUserCreatedEvent(email, firstName).catch((err) =>
          console.error("Failed to send user_created event:", err)
        ),
      ])
    );

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
