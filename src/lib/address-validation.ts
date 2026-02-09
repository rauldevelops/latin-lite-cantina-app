import { prisma } from "@/lib/prisma";

/**
 * Validate address fields
 */
export function validateAddressFormat(data: {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic field validation
  if (!data.street || data.street.trim().length < 5) {
    errors.push("Street address must be at least 5 characters");
  }

  if (!data.city || data.city.trim().length < 2) {
    errors.push("City is required");
  }

  if (!data.state || data.state.trim().length !== 2) {
    errors.push("State must be a 2-letter code (e.g., FL)");
  }

  // Zip code format validation (5 digits or 5+4 format)
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!data.zipCode || !zipRegex.test(data.zipCode.trim())) {
    errors.push("Zip code must be 5 digits (e.g., 33024) or 5+4 format (e.g., 33024-1234)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a zip code is in the delivery zone
 */
export async function isZipCodeInDeliveryZone(
  zipCode: string
): Promise<{ allowed: boolean; message?: string }> {
  // Normalize zip code (take first 5 digits)
  const normalizedZip = zipCode.trim().split("-")[0];

  // Check if there are any active delivery zones
  const zoneCount = await prisma.deliveryZone.count({
    where: { isActive: true },
  });

  // If no zones are configured, allow all (for initial setup)
  if (zoneCount === 0) {
    return { allowed: true };
  }

  // Check if this specific zip code is allowed
  const zone = await prisma.deliveryZone.findFirst({
    where: {
      zipCode: normalizedZip,
      isActive: true,
    },
  });

  if (!zone) {
    return {
      allowed: false,
      message: `Sorry, we don't currently deliver to zip code ${normalizedZip}. Please contact us if you'd like us to serve your area.`,
    };
  }

  return { allowed: true };
}

/**
 * Comprehensive address validation
 */
export async function validateAddress(data: {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}): Promise<{ valid: boolean; errors: string[] }> {
  const formatValidation = validateAddressFormat(data);

  if (!formatValidation.valid) {
    return formatValidation;
  }

  // Check delivery zone
  const zoneCheck = await isZipCodeInDeliveryZone(data.zipCode);

  if (!zoneCheck.allowed) {
    return {
      valid: false,
      errors: [zoneCheck.message || "Delivery not available in this zip code"],
    };
  }

  return { valid: true, errors: [] };
}
