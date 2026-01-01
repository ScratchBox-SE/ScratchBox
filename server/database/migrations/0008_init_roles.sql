CREATE TABLE `user_roles` (
	`user` text PRIMARY KEY NOT NULL,
	`roles` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`last_updated` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
