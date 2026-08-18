CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location` text NOT NULL,
	`booking_date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`function_name` text NOT NULL,
	`customer_name` text NOT NULL,
	`mobile` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookings_location_date_idx` ON `bookings` (`location`,`booking_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_exact_slot_idx` ON `bookings` (`location`,`booking_date`,`start_time`,`end_time`);
