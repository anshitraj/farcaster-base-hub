import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/admin";
import { put } from "@vercel/blob";
import { convertToWebP } from "@/lib/image-optimization";

export async function POST(request: NextRequest) {
  try {
    await requireModerator(); // Moderators can upload files

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "icon", "header", or "screenshot"

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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(bytes));

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop() || "png";
    
    // Convert PNG/JPG to WebP automatically
    let finalBuffer: Buffer = buffer;
    let finalExtension = fileExtension;
    let finalFilename = `${type}-${timestamp}-${randomString}.${fileExtension}`;

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
      } catch (conversionError) {
        console.error("Failed to convert image to WebP:", conversionError);
        // Fallback to original if conversion fails
      }
    }

    // Upload to Vercel Blob Storage
    // Store in organized folders: uploads/icons/, uploads/headers/, uploads/screenshots/
    const blobPath = `uploads/${type}s/${finalFilename}`;
    
    const blob = await put(blobPath, finalBuffer, {
      access: "public",
      contentType: finalExtension === "webp" 
        ? "image/webp" 
        : file.type || `image/${finalExtension}`,
    });

    // Return the Vercel Blob URL
    return NextResponse.json({
      success: true,
      url: blob.url, // Vercel Blob URL (e.g., https://xxx.public.blob.vercel-storage.com/...)
      filename: finalFilename,
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

