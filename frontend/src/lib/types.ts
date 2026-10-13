// Hand-written mirrors of backend/models/schemas.py — keep in sync.
export type PaymentMethod = "cash" | "gcash" | "card";
export type OrderStatus = "unpaid" | "paid" | "cancelled"; // payment status
export type Fulfillment = "new" | "served"; // order status
export type Role = "admin" | "cashier";

export interface ProductIn {
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  available: boolean;
  sort_order: number;
}

export interface Product extends ProductIn {
  id: string;
  created_at: string;
}

export interface Settings {
  shop_name: string;
  tagline: string;
  logo_url: string;
  background_url: string;
  categories: string[];
  gcash_name: string;
  gcash_number: string;
  gcash_qr_url: string;
  receipt_footer: string;
  terms_text: string;
}

export interface TableIn {
  number: number;
  label: string;
}

export interface TableUpdate {
  label: string;
  active: boolean;
}

export interface TableBulkIn {
  start: number;
  end: number;
}

export interface DiningTable {
  id: string;
  number: number;
  label: string;
  active: boolean;
  created_at: string;
}

export interface PublicTable {
  number: number;
  label: string;
  active: boolean;
}

export interface BulkOut {
  created: number;
  skipped: number;
}

export interface OrderItemIn {
  product_id: string;
  qty: number;
}

export interface OrderCreate {
  table_number: number;
  nickname: string;
  payment_method: PaymentMethod;
  payment_reference: string;
  notes: string;
  client_token: string;
  items: OrderItemIn[];
}

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: number;
  table_number: number;
  table_label: string;
  nickname: string;
  notes: string;
  items: OrderItem[];
  item_count: number;
  total: number;
  payment_method: PaymentMethod;
  payment_reference: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  amount_tendered: number | null;
  change: number | null;
  processed_by: string | null;
  served_by: string | null;
  created_at: string;
  paid_at: string | null;
  served_at: string | null;
}

/** Customer-visible order info: no prices, no billing statement. */
export interface OrderTicket {
  id: string;
  order_number: number;
  table_number: number;
  nickname: string;
  item_count: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  fulfillment: Fulfillment;
  created_at: string;
}

export interface PayIn {
  payment_method: PaymentMethod;
  amount_tendered: number | null;
  payment_reference: string;
}

export interface LoginIn {
  username: string;
  password: string;
  portal: Role;
  accept_terms: boolean;
}

export interface Me {
  username: string;
  role: Role;
}

export interface StaffAccount {
  role: Role;
  username: string;
}

export interface CredentialsIn {
  username: string;
  password: string;
}

export interface UploadOut {
  url: string;
}

export interface TopItem {
  name: string;
  qty: number;
  sales: number;
}

export interface MethodBreakdown {
  method: string;
  count: number;
  sales: number;
}

export interface Stats {
  today: string;
  today_sales: number;
  today_orders: number;
  unpaid_orders: number;
  unserved_orders: number;
  total_sales: number;
  total_orders: number;
  product_count: number;
  table_count: number;
  top_items: TopItem[];
  by_method: MethodBreakdown[];
}

export interface RestoreOut {
  products: number;
  orders: number;
  images: number;
  tables: number;
}

export interface Message {
  message: string;
}
