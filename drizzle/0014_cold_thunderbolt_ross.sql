CREATE TABLE `cmr_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`localId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`consultantName` varchar(255),
	`consultantUserId` varchar(64),
	`clientName` varchar(255),
	`appointmentDate` varchar(10),
	`weekOf` varchar(10),
	`dealStatus` varchar(64),
	`outcome` varchar(16) DEFAULT 'open',
	`purchaseConfidencePct` int,
	`originalPcPct` int,
	`estimatedContractValue` decimal(12,2),
	`soldAt` varchar(32),
	`reportData` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cmr_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `cmr_reports_localId_unique` UNIQUE(`localId`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`logoUrl` text,
	`primaryColor` varchar(7) DEFAULT '#1E3A5F',
	`secondaryColor` varchar(7),
	`subscriptionTier` enum('free','basic','pro','enterprise') NOT NULL DEFAULT 'free',
	`subscriptionActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`type` varchar(100) NOT NULL DEFAULT 'general',
	`data` json,
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `project_material_checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdByName` varchar(255),
	`projectName` varchar(255) NOT NULL,
	`clientName` varchar(255),
	`projectLocation` text,
	`supervisorUserId` int,
	`supervisorName` varchar(255),
	`status` varchar(64) NOT NULL DEFAULT 'draft',
	`boxedItems` json,
	`deliveryItems` json,
	`projectSpecificItems` json,
	`warehouseCheckoffs` json,
	`auditTrail` json,
	`attachments` json,
	`materialsLoadedPhotos` json,
	`materialsDeliveredPhotos` json,
	`materialsLoaded` boolean NOT NULL DEFAULT false,
	`materialsDelivered` boolean NOT NULL DEFAULT false,
	`companyId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_material_checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`name` varchar(255) NOT NULL,
	`address` text,
	`status` enum('active','completed','on_hold','cancelled') NOT NULL DEFAULT 'active',
	`hubspotDealId` varchar(64),
	`serviceFusionJobId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`projectId` int,
	`submitterName` varchar(255),
	`vendorName` varchar(255),
	`vendorLocation` text,
	`purchaseDate` varchar(10),
	`subtotal` decimal(10,2),
	`tax` decimal(10,2),
	`total` decimal(10,2),
	`imageUrl` text,
	`lineItems` json,
	`workOrderNumber` varchar(64),
	`jobName` varchar(255),
	`poNumber` varchar(64),
	`materialCategory` varchar(64) DEFAULT 'Miscellaneous',
	`expenseType` enum('JOB','OVERHEAD') DEFAULT 'JOB',
	`overheadCategory` varchar(128),
	`notes` text,
	`fileName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `receipts_id` PRIMARY KEY(`id`)
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
CREATE TABLE `zoning_lookups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`projectId` int,
	`address` text,
	`county` varchar(128),
	`municipality` varchar(128),
	`state` varchar(2),
	`zoningCode` varchar(64),
	`zoningStatus` enum('CONFIRMED','UNVERIFIED','UNKNOWN') DEFAULT 'UNKNOWN',
	`parcelId` varchar(64),
	`lotSqft` decimal(12,2),
	`permitSummaryUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `zoning_lookups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(32) NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `approved` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `approved` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `firstName` varchar(128);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastName` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `dosRoles` json;--> statement-breakpoint
ALTER TABLE `users` ADD `permissions` json;--> statement-breakpoint
ALTER TABLE `users` ADD `expoPushToken` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `notification_prefs` json;