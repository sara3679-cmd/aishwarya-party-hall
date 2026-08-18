CREATE TABLE `additional_income` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `income_date` text NOT NULL,
  `location` text NOT NULL,
  `category` text NOT NULL,
  `description` text NOT NULL,
  `amount` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `income_date_location_idx` ON `additional_income` (`income_date`,`location`);
