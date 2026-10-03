CREATE TABLE "agent_models" (
	"agent_id" uuid PRIMARY KEY NOT NULL,
	"model_id" uuid NOT NULL,
	"fallback_model_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"temperature_milli" integer DEFAULT 200 NOT NULL,
	"max_output_tokens" integer
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"role" varchar(80) DEFAULT 'general' NOT NULL,
	"title" varchar(120),
	"status" varchar(16) DEFAULT 'idle' NOT NULL,
	"reports_to" uuid,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"budget_monthly_cents" integer DEFAULT 0 NOT NULL,
	"spent_monthly_cents" integer DEFAULT 0 NOT NULL,
	"pause_reason" text,
	"error_reason" text,
	"last_heartbeat_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_company_id_uq" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" varchar(24) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"task_id" uuid,
	"run_id" uuid,
	"agent_id" uuid,
	"title" varchar(200) NOT NULL,
	"rule" jsonb NOT NULL,
	"diff" jsonb NOT NULL,
	"audit" jsonb NOT NULL,
	"outcome" text,
	"outcome_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decisions_open_per_run_uq" UNIQUE("run_id","status")
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"from_agent_id" uuid NOT NULL,
	"to_agent_id" uuid NOT NULL,
	"kind" varchar(24) NOT NULL,
	CONSTRAINT "edges_unique" UNIQUE("company_id","from_agent_id","to_agent_id","kind")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"owner_agent_id" uuid,
	"target_date" timestamp with time zone,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"run_id" uuid,
	"kind" varchar(16) DEFAULT 'model_call' NOT NULL,
	"model_id" uuid,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"amount_cents" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(200),
	"role" varchar(16) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"author_kind" varchar(8) NOT NULL,
	"author_id" varchar(40) NOT NULL,
	"parts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"run_id" uuid,
	"model_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_model" varchar(80) NOT NULL,
	"provider" varchar(24) NOT NULL,
	"lane" varchar(12) NOT NULL,
	"display_name" varchar(80) NOT NULL,
	"input_cents_per_mtok" integer NOT NULL,
	"output_cents_per_mtok" integer NOT NULL,
	"context_window" integer NOT NULL,
	"max_output_tokens" integer NOT NULL,
	"lifecycle" varchar(16) DEFAULT 'ga' NOT NULL,
	"lifecycle_changed_at" timestamp with time zone,
	"supports" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retired" boolean DEFAULT false NOT NULL,
	CONSTRAINT "models_provider_model_uq" UNIQUE("provider","provider_model")
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"task_id" uuid,
	"model_id" uuid NOT NULL,
	"requested_model_id" uuid NOT NULL,
	"status" varchar(12) DEFAULT 'running' NOT NULL,
	"blocked_by_decision_id" uuid,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"trace_id" varchar(120),
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"goal_id" uuid,
	"title" varchar(200) NOT NULL,
	"owner_agent_id" uuid NOT NULL,
	"stage" varchar(12) DEFAULT 'backlog' NOT NULL,
	"priority" varchar(12) DEFAULT 'medium' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"due_date" timestamp with time zone,
	"review_requested_by_run_id" uuid,
	"approved_by_member_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_progress_range" CHECK ("tasks"."progress" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"participant_agent_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"participant_member_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"internal" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_models" ADD CONSTRAINT "agent_models_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_models" ADD CONSTRAINT "agent_models_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_reports_to_agents_id_fk" FOREIGN KEY ("reports_to") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_from_agent_id_agents_id_fk" FOREIGN KEY ("from_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_to_agent_id_agents_id_fk" FOREIGN KEY ("to_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_requested_model_id_models_id_fk" FOREIGN KEY ("requested_model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_approved_by_member_id_members_id_fk" FOREIGN KEY ("approved_by_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agents_company_status_idx" ON "agents" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "agents_company_reports_to_idx" ON "agents" USING btree ("company_id","reports_to");--> statement-breakpoint
CREATE INDEX "decisions_company_status_idx" ON "decisions" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "edges_company_idx" ON "edges" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "goals_company_idx" ON "goals" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ledger_company_at_idx" ON "ledger" USING btree ("company_id","at");--> statement-breakpoint
CREATE INDEX "ledger_agent_at_idx" ON "ledger" USING btree ("agent_id","at");--> statement-breakpoint
CREATE INDEX "members_company_idx" ON "members" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "runs_company_started_idx" ON "runs" USING btree ("company_id","started_at");--> statement-breakpoint
CREATE INDEX "runs_agent_started_idx" ON "runs" USING btree ("agent_id","started_at");--> statement-breakpoint
CREATE INDEX "tasks_company_stage_idx" ON "tasks" USING btree ("company_id","stage");--> statement-breakpoint
CREATE INDEX "tasks_company_owner_idx" ON "tasks" USING btree ("company_id","owner_agent_id");--> statement-breakpoint
CREATE INDEX "threads_company_idx" ON "threads" USING btree ("company_id","internal");