export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4500';

export type FulfillmentType = 'DELIVERY' | 'PICKUP';
export type OrderStatus = 'AWAITING_PAYMENT' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELED';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  position: number;
}

export interface Category {
  id: string;
  name: string;
  position: number;
  products: Product[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Payment {
  id: string;
  provider: string;
  status: PaymentStatus;
  qrCode: string;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  address: string | null;
  notes: string | null;
  status: OrderStatus;
  totalCents: number;
  items: OrderItem[];
  payment: Payment | null;
  createdAt: string;
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  address?: string;
  notes?: string;
  items: { productId: string; quantity: number }[];
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Erro ${response.status}`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const publicApi = {
  getCatalog: () => request<Category[]>('/public/catalog'),
  createOrder: (input: CreateOrderInput) =>
    request<{ order: Order; payment: Payment }>('/public/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getOrder: (id: string) => request<Order>(`/public/orders/${id}`),
};
