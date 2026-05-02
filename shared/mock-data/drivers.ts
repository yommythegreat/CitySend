import type { Driver } from '../types'

export const MOCK_DRIVERS: Driver[] = [
  // ── Demo driver (driver@citysend.ca / Driver123!) ────────────────────────────
  {
    id: 'd0', name: 'Demo Driver', initials: 'DD',
    phone: '204 555 0100', email: 'driver@citysend.ca',
    vehicle: '2023 Toyota Corolla — Blue', status: 'busy',
    currentOrderId: 'CS-3026',
    rating: 4.8, completedOrders: 47, joinedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'd1', name: 'Armen Petrossian', initials: 'AP',
    phone: '204 555 0141', email: 'armen@citysend.ca',
    vehicle: '2022 Toyota Corolla — Grey', status: 'busy',
    currentOrderId: 'CS-3009',
    rating: 4.9, completedOrders: 312, joinedAt: '2024-03-12T10:00:00Z',
  },
  {
    id: 'd2', name: 'Dmitri Volkov', initials: 'DV',
    phone: '204 555 0182', email: 'dmitri@citysend.ca',
    vehicle: '2021 Honda Civic — White', status: 'available',
    rating: 4.8, completedOrders: 284, joinedAt: '2024-05-20T10:00:00Z',
  },
  {
    id: 'd3', name: 'Sofia Chen', initials: 'SC',
    phone: '204 555 0163', email: 'sofia@citysend.ca',
    vehicle: '2023 Mazda 3 — Red', status: 'busy',
    currentOrderId: 'CS-3013',
    rating: 4.95, completedOrders: 421, joinedAt: '2024-01-08T10:00:00Z',
  },
  {
    id: 'd4', name: 'Marcus Williams', initials: 'MW',
    phone: '204 555 0174', email: 'marcus@citysend.ca',
    vehicle: '2020 Ford Focus — Black', status: 'busy',
    currentOrderId: 'CS-3010',
    rating: 4.7, completedOrders: 198, joinedAt: '2024-07-15T10:00:00Z',
  },
  {
    id: 'd5', name: 'Priya Sharma', initials: 'PS',
    phone: '204 555 0155', email: 'priya.s@citysend.ca',
    vehicle: '2022 Hyundai Elantra — Silver', status: 'available',
    rating: 4.85, completedOrders: 256, joinedAt: '2024-04-02T10:00:00Z',
  },
  {
    id: 'd6', name: 'Liam O\'Brien', initials: 'LO',
    phone: '204 555 0196', email: 'liam@citysend.ca',
    vehicle: '2019 Volkswagen Golf — Blue', status: 'offline',
    rating: 4.6, completedOrders: 143, joinedAt: '2024-09-10T10:00:00Z',
  },
  {
    id: 'd7', name: 'Yuki Tanaka', initials: 'YT',
    phone: '204 555 0187', email: 'yuki@citysend.ca',
    vehicle: '2023 Toyota Yaris — White', status: 'available',
    rating: 4.9, completedOrders: 189, joinedAt: '2024-06-25T10:00:00Z',
  },
  {
    id: 'd8', name: 'Amara Diallo', initials: 'AD',
    phone: '204 555 0128', email: 'amara@citysend.ca',
    vehicle: '2021 Nissan Sentra — Charcoal', status: 'busy',
    currentOrderId: 'CS-3011',
    rating: 4.75, completedOrders: 167, joinedAt: '2024-08-14T10:00:00Z',
  },
]
