// Cloudinary Configuration
const CLOUD_NAME = "dxbcu7tzx";
const UPLOAD_PRESET = "kreochat_unsigned"; // User must create this in Cloudinary Dashboard
const API_KEY = "279256272158555";

export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
  original_filename: string;
}

export const uploadToCloudinary = async (file: File): Promise<CloudinaryResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('cloud_name', CLOUD_NAME);
  formData.append('api_key', API_KEY);

  // Attempt to auto-detect resource type (image, video, raw/auto)
  // For audio, Cloudinary often treats it as 'video' or 'raw' depending on config, but 'auto' is safest.
  let resourceType = 'auto';
  if (file.type.startsWith('audio/')) {
    resourceType = 'video';
  }

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    return data as CloudinaryResponse;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};