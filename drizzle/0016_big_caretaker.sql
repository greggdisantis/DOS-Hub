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
	CONSTRAINT `time_off_requests_id` PRIMARY KEY(`id`)
);
