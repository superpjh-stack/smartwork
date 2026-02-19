-- CreateTable
CREATE TABLE "kpi_transmissions" (
    "id" SERIAL NOT NULL,
    "report_date" DATE NOT NULL,
    "transmitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "status_code" INTEGER,
    "response_msg" TEXT,
    "request_data" JSONB NOT NULL,
    "response_data" JSONB,
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "trigger_type" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_transmissions_pkey" PRIMARY KEY ("id")
);
