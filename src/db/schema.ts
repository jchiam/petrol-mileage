import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const vehicles = pgTable('vehicles', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  make: text('make'),
  model: text('model'),
  year: integer('year'),
  plate: text('plate'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const fillUps = pgTable(
  'fill_ups',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    vehicleId: bigint('vehicle_id', { mode: 'number' })
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    pumpDate: date('pump_date', { mode: 'string' }).notNull(),
    petrolL: numeric('petrol_l', { precision: 6, scale: 3 }).notNull(),
    mileageKm: numeric('mileage_km', { precision: 7, scale: 1 }).notNull(),
    cost: numeric('cost', { precision: 7, scale: 2 }).notNull(),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_fillups_vehicle_date').on(table.vehicleId, table.pumpDate),
    uniqueIndex('uq_fillups_active')
      .on(table.vehicleId, table.pumpDate, table.petrolL, table.mileageKm, table.cost)
      .where(sql`${table.voidedAt} IS NULL`),
  ]
)

export type Vehicle = typeof vehicles.$inferSelect
export type NewVehicle = typeof vehicles.$inferInsert
export type FillUp = typeof fillUps.$inferSelect
export type NewFillUp = typeof fillUps.$inferInsert
