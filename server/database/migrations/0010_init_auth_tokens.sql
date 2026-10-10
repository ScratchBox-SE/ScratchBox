CREATE TABLE `auth_tokens` (
	`private_code` text PRIMARY KEY NOT NULL,
	`public_code` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
