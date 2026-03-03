CREATE TABLE `module_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleKey` varchar(64) NOT NULL,
	`moduleName` varchar(128) NOT NULL,
	`allowedJobRoles` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `module_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `module_permissions_moduleKey_unique` UNIQUE(`moduleKey`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(32) NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` ADD `firstName` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `lastName` varchar(128);