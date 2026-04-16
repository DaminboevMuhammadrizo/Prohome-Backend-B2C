export const APARTMENT_LISTING_TYPES = ['SOTISH', 'IJARA'] as const;
export type ApartmentListingTypeValue =
  (typeof APARTMENT_LISTING_TYPES)[number];

export const APARTMENT_LAYOUT_STATUSES = [
  'AVAILABLE',
  'SOLD_OUT',
  'COMING_SOON',
  'KELISHILADI',
] as const;
export type ApartmentLayoutStatusValue =
  (typeof APARTMENT_LAYOUT_STATUSES)[number];

export const MASTER_REQUEST_TYPES = ['MASTER', 'PARTNER'] as const;
export type MasterRequestTypeValue = (typeof MASTER_REQUEST_TYPES)[number];
