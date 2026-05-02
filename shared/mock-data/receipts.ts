import type { Receipt } from '../types'

// One receipt per delivered order (CS-3001 through CS-3008)
export const MOCK_RECEIPTS: Receipt[] = [
  {
    id: 'RCP-001', orderId: 'CS-3001', customerId: 'u1', customerName: 'Sasha Novak',
    amount: 16, tax: 1.92, tip: 3, total: 20.92,
    paymentMethod: 'card', last4: '4242', brand: 'visa',
    createdAt: new Date(Date.now() - 24 * 3_600_000).toISOString(),
  },
  {
    id: 'RCP-002', orderId: 'CS-3002', customerId: 'u3', customerName: 'Carlos Rivera',
    amount: 23.50, tax: 2.82, tip: 5, total: 31.32,
    paymentMethod: 'card', last4: '5555', brand: 'mastercard',
    createdAt: new Date(Date.now() - 28 * 3_600_000).toISOString(),
  },
  {
    id: 'RCP-003', orderId: 'CS-3003', customerId: 'u4', customerName: 'Aiko Patel',
    amount: 14, tax: 1.68, tip: 2, total: 17.68,
    paymentMethod: 'card', last4: '1234', brand: 'visa',
    createdAt: new Date(Date.now() - 20 * 3_600_000).toISOString(),
  },
  {
    id: 'RCP-004', orderId: 'CS-3004', customerId: 'u11', customerName: 'Ryan O\'Connor',
    amount: 17.75, tax: 2.13, tip: 0, total: 19.88,
    paymentMethod: 'card', last4: '9876', brand: 'visa',
    createdAt: new Date(Date.now() - 16 * 3_600_000).toISOString(),
  },
  {
    id: 'RCP-005', orderId: 'CS-3005', customerId: 'u13', customerName: 'Lucas Mendez',
    amount: 18, tax: 2.16, tip: 4, total: 24.16,
    paymentMethod: 'card', last4: '3782', brand: 'amex',
    createdAt: new Date(Date.now() - 12 * 3_600_000).toISOString(),
  },
  {
    id: 'RCP-006', orderId: 'CS-3006', customerId: 'u7', customerName: 'Liam Chen',
    amount: 14, tax: 1.68, tip: 0, total: 15.68,
    paymentMethod: 'card', last4: '4242', brand: 'visa',
    createdAt: new Date(Date.now() - 8 * 3_600_000).toISOString(),
  },
  {
    id: 'RCP-007', orderId: 'CS-3007', customerId: 'u8', customerName: 'Sophie Martin',
    amount: 19.75, tax: 2.37, tip: 3, total: 25.12,
    paymentMethod: 'card', last4: '5100', brand: 'mastercard',
    createdAt: new Date(Date.now() - 34 * 3_600_000).toISOString(),
  },
  {
    id: 'RCP-008', orderId: 'CS-3008', customerId: 'u9', customerName: 'David Kim',
    amount: 14, tax: 1.68, tip: 2, total: 17.68,
    paymentMethod: 'card', last4: '4242', brand: 'visa',
    createdAt: new Date(Date.now() - 46 * 3_600_000).toISOString(),
  },
]
