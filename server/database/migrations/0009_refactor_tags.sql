CREATE TABLE `project_tags` (
	`project_id` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`project_id`, `tag`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE `project_platforms`;