DROP TABLE `cmr_reports`;--> statement-breakpoint
DROP TABLE `companies`;--> statement-breakpoint
DROP TABLE `module_permissions`;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
DROP TABLE `order_revisions`;--> statement-breakpoint
DROP TABLE `project_material_checklists`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
DROP TABLE `receipts`;--> statement-breakpoint
DROP TABLE `screen_orders`;--> statement-breakpoint
DROP TABLE `zoning_lookups`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `approved`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `companyId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `firstName`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `lastName`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `dosRoles`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `permissions`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `expoPushToken`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `notification_prefs`;