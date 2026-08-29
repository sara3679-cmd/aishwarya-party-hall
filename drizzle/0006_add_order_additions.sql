CREATE TABLE `order_additions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`addition_date` text NOT NULL,
	`function_date` text NOT NULL,
	`customer_name` text NOT NULL,
	`item_service` text NOT NULL,
	`category` text NOT NULL,
	`original_qty` integer DEFAULT 0 NOT NULL,
	`additional_qty` integer NOT NULL,
	`unit` text NOT NULL,
	`rate` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`amount_received` integer DEFAULT 0 NOT NULL,
	`payment_status` text DEFAULT 'Pending' NOT NULL,
	`confirmed_by` text NOT NULL,
	`customer_confirmation` text DEFAULT 'Yes' NOT NULL,
	`confirmation_mode` text DEFAULT '' NOT NULL,
	`remarks` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `order_additions_order_date_idx` ON `order_additions` (`order_id`,`function_date`);
