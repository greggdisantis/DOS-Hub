CREATE TABLE `aquaclean_receipts` (
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
	`archived` boolean NOT NULL DEFAULT false,
	`archivedAt` timestamp,
	`archivedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aquaclean_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `preconstruction_checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`supervisorName` varchar(255),
	`companyId` int,
	`projectName` varchar(255),
	`projectAddress` text,
	`meetingDate` varchar(10),
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`formData` json,
	`photoData` mediumtext,
	`supervisorSignature` text,
	`supervisorSignedName` varchar(255),
	`supervisorSignedAt` timestamp,
	`client1Signature` text,
	`client1SignedName` varchar(255),
	`client1SignedAt` timestamp,
	`client2Signature` text,
	`client2SignedName` varchar(255),
	`client2SignedAt` timestamp,
	`archived` boolean NOT NULL DEFAULT false,
	`archivedAt` timestamp,
	`archivedByName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `preconstruction_checklists_id` PRIMARY KEY(`id`)
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
	`materialsLoadedByName` varchar(255),
	`materialsLoadedAt` timestamp,
	`materialsDeliveredByName` varchar(255),
	`materialsDeliveredAt` timestamp,
	`archived` boolean NOT NULL DEFAULT false,
	`archivedAt` timestamp,
	`archivedByName` varchar(255),
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
	`archived` boolean NOT NULL DEFAULT false,
	`archivedAt` timestamp,
	`archivedBy` int,
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
CREATE TABLE `time_off_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`totalDaysAllowed` decimal(5,2) DEFAULT '0',
	`totalHoursAllowed` decimal(6,2) DEFAULT '0',
	`periodStartDate` varchar(10),
	`periodEndDate` varchar(10),
	`notes` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `time_off_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `time_off_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`requestType` varchar(50) NOT NULL DEFAULT 'vacation',
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`startTime` varchar(5),
	`endTime` varchar(5),
	`totalDays` decimal(5,2) DEFAULT '0',
	`totalHours` decimal(6,2) DEFAULT '0',
	`reason` text,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`periodYear` varchar(20),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `time_off_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` varchar(32) NOT NULL DEFAULT 'pending',
	`approved` boolean NOT NULL DEFAULT false,
	`companyId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	`firstName` varchar(128),
	`lastName` varchar(128),
	`dosRoles` json,
	`permissions` json,
	`isEmployee` boolean NOT NULL DEFAULT false,
	`expoPushToken` varchar(255),
	`notification_prefs` json,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
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
