import { NextResponse } from "next/server"

export async function POST(request: Request) {
  void request
  return NextResponse.json(
    { error: "This upload endpoint has been retired. Use the smart upload pipeline so every PDF is analyzed before it is created." },
    { status: 410 },
  )
}
