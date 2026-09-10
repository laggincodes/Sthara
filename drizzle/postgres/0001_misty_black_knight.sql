CREATE TYPE "public"."user_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED');--> statement-breakpoint
ALTER TYPE "public"."platform_role" ADD VALUE 'SUPER_ADMIN' BEFORE 'citizen';--> statement-breakpoint
ALTER TYPE "public"."platform_role" ADD VALUE 'AUTHORITY_ADMIN' BEFORE 'citizen';--> statement-breakpoint
ALTER TYPE "public"."platform_role" ADD VALUE 'AUTHORITY_OFFICER' BEFORE 'citizen';--> statement-breakpoint
ALTER TYPE "public"."platform_role" ADD VALUE 'GOVERNMENT_EMPLOYEE' BEFORE 'citizen';--> statement-breakpoint
ALTER TYPE "public"."platform_role" ADD VALUE 'SURVEYOR' BEFORE 'citizen';--> statement-breakpoint
ALTER TYPE "public"."platform_role" ADD VALUE 'CITIZEN' BEFORE 'citizen';--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"code" varchar(48) NOT NULL,
	"description" text,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"state" varchar(120) DEFAULT 'Bihar' NOT NULL,
	"code" varchar(48) NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "districts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"type" varchar(80) NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(64) NOT NULL,
	"permission" varchar(120) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auditLogs" ALTER COLUMN "actorRole" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "auditLogs" ADD COLUMN "actorName" varchar(160);--> statement-breakpoint
ALTER TABLE "auditLogs" ADD COLUMN "targetUserId" varchar(96);--> statement-breakpoint
ALTER TABLE "auditLogs" ADD COLUMN "targetResource" varchar(160);--> statement-breakpoint
ALTER TABLE "auditLogs" ADD COLUMN "departmentId" integer;--> statement-breakpoint
ALTER TABLE "auditLogs" ADD COLUMN "districtId" integer;--> statement-breakpoint
ALTER TABLE "auditLogs" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "auditLogs" ADD COLUMN "ipAddress" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(48);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "designation" varchar(160);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "departmentId" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "districtId" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organizationId" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "jurisdiction" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invitationSentAt" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invitationAcceptedAt" timestamp;