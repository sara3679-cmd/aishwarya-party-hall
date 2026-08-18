CREATE TABLE `staff_users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `username` text NOT NULL,
  `password_hash` text NOT NULL,
  `password_salt` text NOT NULL,
  `role` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_users_username_idx` ON `staff_users` (`username`);
