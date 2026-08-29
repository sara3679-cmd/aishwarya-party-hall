CREATE TABLE `order_additions_v2` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `order_id` text NOT NULL,
  `addition_date` text NOT NULL,
  `function_date` text NOT NULL,
  `meal_session` text NOT NULL,
  `food_type` text NOT NULL,
  `category` text NOT NULL,
  `item_name` text NOT NULL,
  `original_qty` integer NOT NULL,
  `unit` text NOT NULL,
  `rate` integer NOT NULL,
  `addition_time` text NOT NULL,
  `remarks` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `order_additions_v2_order_date_idx` ON `order_additions_v2` (`order_id`,`function_date`);
