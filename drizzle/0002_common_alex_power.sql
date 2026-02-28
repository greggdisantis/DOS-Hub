CREATE TABLE `order_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`revisionNumber` int NOT NULL,
	`editedByUserId` int NOT NULL,
	`editedByName` varchar(255),
	`changeDescription` text,
	`orderData` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `screen_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`projectId` int,
	`title` varchar(255) NOT NULL,
	`status` enum('draft','submitted','approved','rejected','completed') NOT NULL DEFAULT 'draft',
	`orderData` json NOT NULL,
	`screenCount` int NOT NULL DEFAULT 1,
	`manufacturer` varchar(64),
	`submitterNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `screen_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','pending','technician','manager') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` ADD `approved` boolean DEFAULT false NOT NULL;