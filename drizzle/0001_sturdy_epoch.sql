CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`superAdminId` int NOT NULL,
	`actionType` varchar(64) NOT NULL,
	`affectedUserId` int,
	`description` text NOT NULL,
	`details` json,
	`clientInfo` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `super_admin_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationType` varchar(64) NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`data` json,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`readBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `super_admin_notifications_id` PRIMARY KEY(`id`)
);
