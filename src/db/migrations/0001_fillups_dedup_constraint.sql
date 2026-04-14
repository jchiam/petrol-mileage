CREATE UNIQUE INDEX "uq_fillups_active" ON "fill_ups" USING btree ("vehicle_id","pump_date","petrol_l","mileage_km","cost") WHERE "voided_at" IS NULL;
