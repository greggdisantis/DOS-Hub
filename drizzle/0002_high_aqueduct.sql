CREATE TABLE `ai_knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`category` varchar(128) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`fileSize` int NOT NULL,
	`description` text,
	`uploadedBy` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_knowledge_base_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_knowledge_base_storageKey_unique` UNIQUE(`storageKey`)
);
