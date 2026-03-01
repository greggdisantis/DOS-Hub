ALTER TABLE `receipts` MODIFY COLUMN `materialCategory` varchar(64) DEFAULT 'Miscellaneous';--> statement-breakpoint
ALTER TABLE `receipts` ADD `lineItems` json;--> statement-breakpoint
ALTER TABLE `receipts` ADD `overheadCategory` varchar(128);--> statement-breakpoint
ALTER TABLE `receipts` ADD `fileName` varchar(255);