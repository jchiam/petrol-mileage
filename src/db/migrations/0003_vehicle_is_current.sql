ALTER TABLE "vehicles" ADD COLUMN "is_current" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vehicles_current" ON "vehicles" ("is_current") WHERE "is_current" = true;
