export type Category = { id: string; slug: string; name: string; description: string | null };

export type Variant = {
  id: string;
  product_id: string;
  label: string; // e.g. "2.5mm x 200m roll"
  sku: string;
  price: number;
  stock: number;
  weight_kg: number;
  attributes: Record<string, string>; // gauge, roll_length, aperture
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  summary: string;
  description: string;
  specs: Record<string, string>; // zinc coating, gauge thickness, etc.
  images: string[]; // Cloudinary URLs
  is_active: boolean;
  variants: Variant[];
  category?: Category;
  rating_avg?: number;
  rating_count?: number;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  body: string;
  images: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
  replies?: ReviewReply[];
};

export type ReviewReply = {
  id: string;
  review_id: string;
  parent_id: string | null;
  user_id: string;
  author_name: string;
  is_owner: boolean;
  body: string;
  created_at: string;
};

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "FAILED"
  | "PROCESSING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export type Order = {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  subtotal: number;
  transport_fee: number;
  total: number;
  full_name: string;
  phone: string;
  whatsapp: string;
  county: string;
  sub_county: string;
  drop_off_point: string;
  drop_lat: number | null;
  drop_lng: number | null;
  transport_notes: string | null;
  mpesa_checkout_id: string | null;
  mpesa_receipt: string | null;
  driver_id: string | null;
  created_at: string;
};

export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string;
  price: number;
  weightKg: number;
  image: string | null;
  qty: number;
};
