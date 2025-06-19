// lucen-backend/controllers/draftImageController.js
const supabaseAdmin = require("../config/supabaseClient");

exports.uploadDraftImage = async (req, res) => {
  const { caseId } = req.params; // We now get caseId directly
  const firmUserId = req.user.sub;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "An image file is required." });
  }

  try {
    // --- 1. Security Check ---
    // First, get the case_id from the draft to verify ownership.
    const { error: ownerError } = await supabaseAdmin
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("firm_user_id", firmUserId)
      .single();
    if (ownerError) {
      throw new Error("Permission denied.");
    }

    // --- 2. Upload the File to Supabase Storage ---
    // Create an organized and unique file path.
    const filePath = `${caseId}/draft_images/${Date.now()}-${
      file.originalname
    }`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("case-files") // Our main bucket
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      throw uploadError;
    }

    // get signed url
    const { data, error: urlError } = await supabaseAdmin.storage
      .from("case-files")
      .createSignedUrl(filePath, 60 * 60); // The link will be valid for 1 hour

    if (urlError) {
      throw urlError;
    }
    // --- 3. Get the Public URL for the Uploaded File ---
    // const { data: urlData } = supabaseAdmin.storage
    //   .from("case-files")
    //   .getPublicUrl(filePath);

    // if (!urlData || !urlData.publicUrl) {
    //   throw new Error("Could not retrieve public URL for the uploaded image.");
    // }

    console.log(`IMAGE URL: ${data.signedUrl}`);
    // 4. Send the URL back to the frontend
    res.status(200).json({ imageUrl: data.signedUrl });
  } catch (error) {
    console.error("Error uploading draft image:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to upload image." });
  }
};
