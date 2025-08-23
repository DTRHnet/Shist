-- CreateTable
CREATE TABLE "public"."connections" (
    "id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "addressee_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connections_requester_id_idx" ON "public"."connections"("requester_id");

-- CreateIndex
CREATE INDEX "connections_addressee_id_idx" ON "public"."connections"("addressee_id");

-- CreateIndex
CREATE INDEX "connections_status_idx" ON "public"."connections"("status");

-- AddForeignKey
ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
