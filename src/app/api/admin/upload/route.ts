import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/admin";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import sharp from "sharp";
import { convertToWebP } from "@/lib/image-optimization";

export async function POST(request: NextRequest) {
  try {
    await requireModerator(); // Moderators can upload files

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "icon" or "header"

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!type || !["icon", "header", "screenshot"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'icon', 'header', or 'screenshot'" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed (JPEG, PNG, WebP, GIF, SVG)" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop() || "png";
    const filename = `${type}-${timestamp}-${randomString}.${fileExtension}`;
    let filepath = join(uploadsDir, filename);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(bytes));

    // Convert PNG/JPG to WebP automatically
    let finalBuffer: Buffer = buffer;
    let finalExtension = fileExtension;
    let finalFilename = filename;

    const isPngJpg = file.type === "image/png" || 
                     file.type === "image/jpeg" || 
                     file.type === "image/jpg" ||
                     fileExtension.toLowerCase() === "png" ||
                     fileExtension.toLowerCase() === "jpg" ||
                     fileExtension.toLowerCase() === "jpeg";

    if (isPngJpg) {
      try {
        // Convert to WebP with quality 75
        finalBuffer = await convertToWebP(buffer, 75);
        finalExtension = "webp";
        finalFilename = `${type}-${timestamp}-${randomString}.webp`;
        filepath = join(uploadsDir, finalFilename);
      } catch (conversionError) {
        console.error("Failed to convert image to WebP:", conversionError);
        // Fallback to original if conversion fails
      }
    }

    // Save the file (WebP if converted, original otherwise)
    await writeFile(filepath, finalBuffer);

    // Return the public URL
    const publicUrl = `/uploads/${finalFilename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filename,
    });
  } catch (error: any) {
    if (error.message === "Admin access required") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

