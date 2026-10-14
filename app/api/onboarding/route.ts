import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { getCollection } from "@/server/db/mongodb";
import { OnboardingQuizInputSchema, PersonaType, UserDocument } from "@/server/models/user";
import { seedUserPersonaPresets } from "@/server/services/onboarding.service";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  return NextResponse.json({
    data: {
      onboardingCompleted: user.onboardingCompleted,
      persona: user.persona,
      profile: user.onboardingProfile || null,
    },
  });
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Support "Skip for now" option
    if (body.skip === true) {
      const usersCol = await getCollection<UserDocument>("users");
      const fallbackPersona: PersonaType = (user.persona as PersonaType) || "young_professional";

      await usersCol.updateOne(
        { _id: new ObjectId(user.userId) },
        {
          $set: {
            onboardingCompleted: true,
            persona: fallbackPersona,
            updatedAt: new Date(),
          },
        }
      );

      await seedUserPersonaPresets(user.userId, fallbackPersona);

      return NextResponse.json({
        data: {
          message: "Onboarding skipped. Default categories initialized.",
          onboardingCompleted: true,
        },
      });
    }

    const validated = OnboardingQuizInputSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid onboarding answers.",
          },
        },
        { status: 400 }
      );
    }

    const quizData = validated.data;
    const usersCol = await getCollection<UserDocument>("users");

    const onboardingProfile = {
      ...quizData,
      completedAt: new Date(),
    };

    await usersCol.updateOne(
      { _id: new ObjectId(user.userId) },
      {
        $set: {
          persona: quizData.persona,
          onboardingCompleted: true,
          onboardingProfile,
          updatedAt: new Date(),
        },
      }
    );

    // Auto-seed baseline categories and monthly budget based on persona
    await seedUserPersonaPresets(
      user.userId,
      quizData.persona,
      quizData.monthlyBudgetPaise
    );

    return NextResponse.json({
      data: {
        message: "Onboarding completed successfully.",
        persona: quizData.persona,
        onboardingCompleted: true,
      },
    });
  } catch (error: any) {
    console.error("Onboarding submission error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error?.message || "Failed to save onboarding responses.",
        },
      },
      { status: 500 }
    );
  }
}
