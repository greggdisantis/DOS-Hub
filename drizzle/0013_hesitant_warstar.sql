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
ALTER TABLE `project_material_checklists` ADD `materialsLoadedByName` varchar(255);--> statement-breakpoint
ALTER TABLE `project_material_checklists` ADD `materialsLoadedAt` timestamp;--> statement-breakpoint
ALTER TABLE `project_material_checklists` ADD `materialsDeliveredByName` varchar(255);--> statement-breakpoint
ALTER TABLE `project_material_checklists` ADD `materialsDeliveredAt` timestamp;--> statement-breakpoint
ALTER TABLE `project_material_checklists` ADD `archived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `project_material_checklists` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `project_material_checklists` ADD `archivedByName` varchar(255);