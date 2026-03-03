ALTER TABLE `users` ADD `dosRoles` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `users` ADD `permissions` json DEFAULT ('{}');