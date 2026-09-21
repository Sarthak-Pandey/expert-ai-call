import { NextRequest, NextResponse } from "next/server";
import { generateCrossCallThemes } from "@/lib/themes";

export async function POST(req: NextRequest) {
  try {
    let questionId: string | undefined;

    try {
      const body = await req.json();
      if (body && typeof body.questionId === "string" && body.questionId.trim()) {
        questionId = body.questionId.trim();
      }
    } catch {
      // Body may be empty for full cross-call analysis
    }

    const result = await generateCrossCallThemes(questionId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorObj = err as Error;
    console.error("API /api/themes POST Error:", errorObj.message);
    return NextResponse.json(
      { error: errorObj.message || "Failed to generate cross-call themes" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("questionId") || undefined;

    const result = await generateCrossCallThemes(questionId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorObj = err as Error;
    console.error("API /api/themes GET Error:", errorObj.message);
    return NextResponse.json(
      { error: errorObj.message || "Failed to generate cross-call themes" },
      { status: 500 }
    );
  }
}
