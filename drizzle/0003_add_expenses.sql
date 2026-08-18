CREATE TABLE `expenses` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `expense_date` text NOT NULL,
  `location` text NOT NULL,
  `category` text NOT NULL,
  `description` text NOT NULL,
  `amount` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `expenses_date_location_idx` ON `expenses` (`expense_date`,`location`);
