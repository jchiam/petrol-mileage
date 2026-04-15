ALTER TABLE "fill_ups" DROP CONSTRAINT "fill_ups_vehicle_id_vehicles_id_fk";
--> statement-breakpoint
ALTER TABLE "fill_ups" ADD CONSTRAINT "fill_ups_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;