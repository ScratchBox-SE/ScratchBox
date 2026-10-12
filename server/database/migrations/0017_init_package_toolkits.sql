CREATE TABLE `package_toolkits` (
	`platform` text PRIMARY KEY NOT NULL,
	`se_ref` text DEFAULT 'main' NOT NULL,
	`se_commit` text NOT NULL,
	`status` text DEFAULT 'building' NOT NULL,
	`error` text,
	`built_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
