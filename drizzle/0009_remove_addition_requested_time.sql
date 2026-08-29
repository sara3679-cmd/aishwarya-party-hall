CREATE TABLE `order_additions_v4` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `order_id` text NOT NULL,
  `function_date` text NOT NULL,
  `function_time` text NOT NULL,
  `meal_session` text NOT NULL,
  `food_type` text NOT NULL,
  `item_name` text NOT NULL,
  `original_qty` integer NOT NULL,
  `unit` text NOT NULL,
  `rate` integer NOT NULL,
  `remarks` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `order_additions_v4_order_date_idx` ON `order_additions_v4` (`order_id`,`function_date`);
