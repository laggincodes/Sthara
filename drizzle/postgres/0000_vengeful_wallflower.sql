CREATE TYPE "public"."cadastre_status" AS ENUM('Verified', 'Review required');--> statement-breakpoint
CREATE TYPE "public"."evidence_file_category" AS ENUM('geojson', 'floorplan');--> statement-breakpoint
CREATE TYPE "public"."issue_report_category" AS ENUM('footprint', 'floor_count', 'location', 'missing_property', 'parcel_boundary');--> statement-breakpoint
CREATE TYPE "public"."issue_report_status" AS ENUM('submitted', 'under_review', 'closed');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('citizen', 'authority', 'government_employee', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('submitted', 'under_review', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."verification_submission_type" AS ENUM('geometry', 'height', 'floor_count', 'floor_plan', 'survey');--> statement-breakpoint
CREATE TABLE "auditLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorClerkUserId" varchar(96) NOT NULL,
	"actorRole" "platform_role" NOT NULL,
	"action" varchar(96) NOT NULL,
	"entityType" varchar(96) NOT NULL,
	"entityId" varchar(128) NOT NULL,
	"oldValue" text,
	"newValue" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cadastreRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"ulpin" varchar(96) NOT NULL,
	"title" varchar(160) NOT NULL,
	"parcel" varchar(96) NOT NULL,
	"building" varchar(120) NOT NULL,
	"unit" varchar(96) NOT NULL,
	"floor" integer NOT NULL,
	"area" varchar(48) NOT NULL,
	"volume" varchar(48) NOT NULL,
	"elevation" varchar(80) NOT NULL,
	"status" "cadastre_status" NOT NULL,
	"rights" text NOT NULL,
	"evidence" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cadastreRecords_ulpin_unique" UNIQUE("ulpin")
);
--> statement-breakpoint
CREATE TABLE "evidenceFiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"category" "evidence_file_category" NOT NULL,
	"mimeType" varchar(120) NOT NULL,
	"storageKey" varchar(255) NOT NULL,
	"storageUrl" text NOT NULL,
	"validationScore" integer NOT NULL,
	"validationSummary" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issueReports" (
	"id" serial PRIMARY KEY NOT NULL,
	"recordReference" varchar(128) NOT NULL,
	"category" "issue_report_category" NOT NULL,
	"details" text NOT NULL,
	"status" "issue_report_status" DEFAULT 'submitted' NOT NULL,
	"reportedByClerkUserId" varchar(96) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerkUserId" varchar(96) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "platform_role" DEFAULT 'citizen' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerkUserId_unique" UNIQUE("clerkUserId")
);
--> statement-breakpoint
CREATE TABLE "verificationSubmissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"recordReference" varchar(128) NOT NULL,
	"submissionType" "verification_submission_type" NOT NULL,
	"sourceUrl" text,
	"sourceReference" varchar(320) NOT NULL,
	"notes" text NOT NULL,
	"status" "verification_status" DEFAULT 'submitted' NOT NULL,
	"submittedByClerkUserId" varchar(96) NOT NULL,
	"reviewedByClerkUserId" varchar(96),
	"reviewNote" text,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
