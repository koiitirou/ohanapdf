import { NextResponse } from "next/server";
import { getGCSClient } from "../../utils/gcsClient";

export async function POST(request) {
  try {
    const { action, otp, roomId } = await request.json();
    const storage = getGCSClient();
    const bucket = storage.bucket("ohpdf");

    if (action === "register") {
      if (!otp || !roomId) {
        return NextResponse.json({ error: "OTP and RoomID are required" }, { status: 400 });
      }
      
      const file = bucket.file(`otp/${otp}.json`);
      await file.save(JSON.stringify({ roomId, timestamp: Date.now() }), {
        contentType: "application/json",
      });

      return NextResponse.json({ message: "Registered" });
    } 
    
    else if (action === "verify") {
      if (!otp) {
        return NextResponse.json({ error: "OTP is required" }, { status: 400 });
      }

      const file = bucket.file(`otp/${otp}.json`);
      const [exists] = await file.exists();

      if (!exists) {
        return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 404 });
      }

      const [content] = await file.download();
      const data = JSON.parse(content.toString());

      // Check expiration (10 minutes)
      if (Date.now() - data.timestamp > 10 * 60 * 1000) {
        await file.delete();
        return NextResponse.json({ error: "OTP expired" }, { status: 410 });
      }

      // Delete OTP file (One-time use)
      await file.delete();

      return NextResponse.json({ roomId: data.roomId });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Pairing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
