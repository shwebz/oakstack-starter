/**
 * A stand-in for your database: orders kept in memory, so the example has no setup.
 * Replace with your own storage.
 */
export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  item: string;
  amount: number;
  createdAt: string;
}

const orders: Order[] = [];

export function addOrder(o: Omit<Order, "id" | "createdAt">): Order {
  const order = {
    ...o,
    id: `ORD-${1000 + orders.length + 1}`,
    createdAt: new Date().toISOString(),
  };
  orders.unshift(order);
  return order;
}

export function ordersSince(since: Date): Order[] {
  return orders.filter((o) => new Date(o.createdAt) >= since);
}
