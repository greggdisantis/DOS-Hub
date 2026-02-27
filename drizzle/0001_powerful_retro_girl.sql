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
	`workOrderNumber` varchar(64),
	`jobName` varchar(255),
	`poNumber` varchar(64),
	`materialCategory` enum('Structures','Screens','Electrical','Miscellaneous','Fuel','Tools') DEFAULT 'Miscellaneous',
	`expenseType` enum('JOB','OVERHEAD') DEFAULT 'JOB',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `receipts_id` PRIMARY KEY(`id`)
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
ALTER TABLE `users` ADD `companyId` int;