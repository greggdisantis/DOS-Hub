ALTER TABLE `receipts` ADD `archived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `receipts` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `receipts` ADD `archivedBy` int;