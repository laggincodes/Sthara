ALTER TABLE `auditLogs` RENAME COLUMN `actorOpenId` TO `actorClerkUserId`;--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN `openId` TO `clerkUserId`;--> statement-breakpoint
ALTER TABLE `verificationSubmissions` RENAME COLUMN `submittedBy` TO `submittedByClerkUserId`;--> statement-breakpoint
ALTER TABLE `verificationSubmissions` RENAME COLUMN `reviewedBy` TO `reviewedByClerkUserId`;--> statement-breakpoint
ALTER TABLE `issueReports` RENAME COLUMN `reportedBy` TO `reportedByClerkUserId`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `auditLogs` MODIFY COLUMN `actorClerkUserId` varchar(96) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `clerkUserId` varchar(96) NOT NULL;--> statement-breakpoint
ALTER TABLE `verificationSubmissions` MODIFY COLUMN `submittedByClerkUserId` varchar(96) NOT NULL;--> statement-breakpoint
ALTER TABLE `verificationSubmissions` MODIFY COLUMN `reviewedByClerkUserId` varchar(96);--> statement-breakpoint
ALTER TABLE `issueReports` MODIFY COLUMN `reportedByClerkUserId` varchar(96) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_clerkUserId_unique` UNIQUE(`clerkUserId`);--> statement-breakpoint
