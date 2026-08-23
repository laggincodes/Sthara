CREATE TABLE `cadastreRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ulpin` varchar(96) NOT NULL,
	`title` varchar(160) NOT NULL,
	`parcel` varchar(96) NOT NULL,
	`building` varchar(120) NOT NULL,
	`unit` varchar(96) NOT NULL,
	`floor` int NOT NULL,
	`area` varchar(48) NOT NULL,
	`volume` varchar(48) NOT NULL,
	`elevation` varchar(80) NOT NULL,
	`status` enum('Verified','Review required') NOT NULL,
	`rights` text NOT NULL,
	`evidence` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cadastreRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `cadastreRecords_ulpin_unique` UNIQUE(`ulpin`)
);
--> statement-breakpoint
CREATE TABLE `evidenceFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`category` enum('geojson','floorplan') NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`storageKey` varchar(255) NOT NULL,
	`storageUrl` text NOT NULL,
	`validationScore` int NOT NULL,
	`validationSummary` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidenceFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
