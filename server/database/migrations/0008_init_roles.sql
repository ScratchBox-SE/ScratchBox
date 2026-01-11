CREATE TABLE `user_roles` (
	`user` text NOT NULL,
	`role` text NOT NULL,
	`added_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`expires_at` integer,
	`description` text,
	PRIMARY KEY(`user`, `role`)
);
