PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_project_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`original_id` integer NOT NULL,
	`project_id` text NOT NULL,
	`user` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_project_comments`("id", "project_id", "user", "body", "created_at") SELECT "id", "project_id", "user", "body", "created_at" FROM `project_comments`;--> statement-breakpoint
DROP TABLE `project_comments`;--> statement-breakpoint
ALTER TABLE `__new_project_comments` RENAME TO `project_comments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;