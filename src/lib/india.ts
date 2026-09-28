export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

export const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

export type DeliveryAddress = {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
};

export function addressLines(address: DeliveryAddress) {
  const locality = address.city ? `${address.city}, ${address.state} ${address.pincode}` : null;
  return [address.addressLine1, address.addressLine2, locality].filter(
    (line): line is string => Boolean(line),
  );
}

export function formatIndianMobile(phone: string) {
  return /^\d{10}$/.test(phone) ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}
