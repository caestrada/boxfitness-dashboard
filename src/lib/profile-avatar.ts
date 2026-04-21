export const PROFILE_AVATAR_BUCKET = "profile-avatars";

export const PROFILE_AVATAR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const PROFILE_AVATAR_ACCEPT =
  PROFILE_AVATAR_ALLOWED_MIME_TYPES.join(",");

export const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_AVATAR_MAX_SIZE_LABEL = "2 MB";

const profileAvatarExtensionsByMimeType: Record<
  (typeof PROFILE_AVATAR_ALLOWED_MIME_TYPES)[number],
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function normalizeExtension(value: string) {
  return value === "jpeg" ? "jpg" : value;
}

export function getProfileAvatarFileExtension(
  fileName: string,
  mimeType: string,
) {
  if (mimeType in profileAvatarExtensionsByMimeType) {
    return profileAvatarExtensionsByMimeType[
      mimeType as keyof typeof profileAvatarExtensionsByMimeType
    ];
  }

  const fileNameParts = fileName.trim().toLowerCase().split(".");
  const lastPart = fileNameParts[fileNameParts.length - 1];

  if (!lastPart || fileNameParts.length < 2) {
    return null;
  }

  const extension = normalizeExtension(lastPart);
  return Object.values(profileAvatarExtensionsByMimeType).includes(extension)
    ? extension
    : null;
}

export function getProfileAvatarStoragePath(
  avatarUrl: string | null,
  supabaseUrl: string,
) {
  if (!avatarUrl) {
    return null;
  }

  const normalizedSupabaseUrl = supabaseUrl.replace(/\/$/, "");
  const publicUrlPrefix = `${normalizedSupabaseUrl}/storage/v1/object/public/${PROFILE_AVATAR_BUCKET}/`;

  if (!avatarUrl.startsWith(publicUrlPrefix)) {
    return null;
  }

  const storagePath = avatarUrl.slice(publicUrlPrefix.length);
  return storagePath.length > 0 ? decodeURIComponent(storagePath) : null;
}
