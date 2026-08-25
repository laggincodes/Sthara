CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorOpenId` varchar(64) NOT NULL,
	`role` enum('citizen','authority','government_employee','admin') NOT NULL DEFAULT 'citizen',
	`action` varchar(96) NOT NULL,
	`entityType` varchar(96) NOT NULL,
	`entityId` varchar(128) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issueReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordReference` varchar(128) NOT NULL,
	`category` enum('footprint','floor_count','location','missing_property','parcel_boundary') NOT NULL,
	`details` text NOT NULL,
	`status` enum('submitted','under_review','closed') NOT NULL DEFAULT 'submitted',
	`reportedBy` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `issueReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verificationSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordReference` varchar(128) NOT NULL,
	`submissionType` enum('geometry','height','floor_count','floor_plan','survey') NOT NULL,
	`sourceUrl` text,
	`sourceReference` varchar(320) NOT NULL,
	`notes` text NOT NULL,
	`verificationStatus` enum('submitted','under_review','verified','rejected') NOT NULL DEFAULT 'submitted',
	`submittedBy` varchar(64) NOT NULL,
	`reviewedBy` varchar(64),
	`reviewNote` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verificationSubmissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','citizen','authority','government_employee','admin') NOT NULL DEFAULT 'citizen';
--> statement-breakpoint
UPDATE `users` SET `role` = 'citizen' WHERE `role` = 'user';
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('citizen','authority','government_employee','admin') NOT NULL DEFAULT 'citizen';
