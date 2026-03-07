-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "bi_dashboard";

-- CreateEnum
CREATE TYPE "bi_dashboard"."StockStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "bi_dashboard"."PaymentMethod" AS ENUM ('CASH', 'CARD', 'MOBILE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "bi_dashboard"."MovementType" AS ENUM ('RESTOCK', 'SALE', 'TRANSFER', 'ADJUSTMENT', 'WASTE');

-- CreateEnum
CREATE TYPE "bi_dashboard"."AlertType" AS ENUM ('RESTOCK', 'PRICE', 'PROMOTION', 'QUALITY');

-- CreateEnum
CREATE TYPE "bi_dashboard"."Urgency" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "bi_dashboard"."AlertStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "bi_dashboard"."PromotionStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "bi_dashboard"."NotificationType" AS ENUM ('ALERT', 'INFO', 'SUCCESS', 'WARNING');

-- CreateTable
CREATE TABLE "bi_dashboard"."user_stores" (
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "user_stores_pkey" PRIMARY KEY ("userId","storeId")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_si" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "manager" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "opening_hours" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "name_si" TEXT,
    "category" TEXT NOT NULL,
    "category_si" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "store_id" TEXT NOT NULL,
    "current_stock" INTEGER NOT NULL,
    "reorder_level" INTEGER NOT NULL,
    "max_stock" INTEGER NOT NULL,
    "status" "bi_dashboard"."StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "supplier" TEXT,
    "last_restocked" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."sales" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "final_amount" DOUBLE PRECISION NOT NULL,
    "payment_method" "bi_dashboard"."PaymentMethod" NOT NULL,
    "promotion_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."inventory_movements" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "type" "bi_dashboard"."MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previous_stock" INTEGER NOT NULL,
    "new_stock" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION,
    "reason" TEXT,
    "supplier" TEXT,
    "invoice_number" TEXT,
    "expiry_date" TIMESTAMP(3),
    "user_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."sales_forecasts" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "predicted_sales" DOUBLE PRECISION NOT NULL,
    "confidence_lower" DOUBLE PRECISION NOT NULL,
    "confidence_upper" DOUBLE PRECISION NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "model_type" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."sales_forecast_drivers" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_si" TEXT,
    "impact" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "description_si" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_forecast_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "segment" TEXT NOT NULL DEFAULT 'new_customers',
    "rfm_recency" INTEGER NOT NULL DEFAULT 0,
    "rfm_frequency" INTEGER NOT NULL DEFAULT 0,
    "rfm_monetary" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_order_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lifetime_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_purchase" TIMESTAMP(3),
    "loyalty_card_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."inventory_alerts" (
    "id" TEXT NOT NULL,
    "type" "bi_dashboard"."AlertType" NOT NULL,
    "urgency" "bi_dashboard"."Urgency" NOT NULL,
    "product_id" TEXT,
    "store_id" TEXT NOT NULL,
    "current_stock" INTEGER,
    "recommended_quantity" INTEGER,
    "reason" TEXT NOT NULL,
    "reason_si" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "estimated_stockout_date" TIMESTAMP(3),
    "status" "bi_dashboard"."AlertStatus" NOT NULL DEFAULT 'PENDING',
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "purchase_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."promotions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_si" TEXT,
    "store_id" TEXT NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "bi_dashboard"."PromotionStatus" NOT NULL,
    "targeted_revenue" DOUBLE PRECISION NOT NULL,
    "actual_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lift" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."promotion_products" (
    "promotionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "promotion_products_pkey" PRIMARY KEY ("promotionId","productId")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "action_si" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "changes" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "store_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "bi_dashboard"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "title_si" TEXT,
    "message" TEXT NOT NULL,
    "message_si" TEXT,
    "action_url" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "bi_dashboard"."products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "bi_dashboard"."products"("barcode");

-- CreateIndex
CREATE INDEX "products_store_id_idx" ON "bi_dashboard"."products"("store_id");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "bi_dashboard"."products"("category");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "bi_dashboard"."products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_transaction_id_key" ON "bi_dashboard"."sales"("transaction_id");

-- CreateIndex
CREATE INDEX "sales_store_id_idx" ON "bi_dashboard"."sales"("store_id");

-- CreateIndex
CREATE INDEX "sales_customer_id_idx" ON "bi_dashboard"."sales"("customer_id");

-- CreateIndex
CREATE INDEX "sales_timestamp_idx" ON "bi_dashboard"."sales"("timestamp");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "bi_dashboard"."sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "sale_items_product_id_idx" ON "bi_dashboard"."sale_items"("product_id");

-- CreateIndex
CREATE INDEX "inventory_movements_product_id_idx" ON "bi_dashboard"."inventory_movements"("product_id");

-- CreateIndex
CREATE INDEX "inventory_movements_store_id_idx" ON "bi_dashboard"."inventory_movements"("store_id");

-- CreateIndex
CREATE INDEX "inventory_movements_timestamp_idx" ON "bi_dashboard"."inventory_movements"("timestamp");

-- CreateIndex
CREATE INDEX "sales_forecasts_product_id_idx" ON "bi_dashboard"."sales_forecasts"("product_id");

-- CreateIndex
CREATE INDEX "sales_forecasts_date_idx" ON "bi_dashboard"."sales_forecasts"("date");

-- CreateIndex
CREATE UNIQUE INDEX "sales_forecasts_product_id_store_id_date_key" ON "bi_dashboard"."sales_forecasts"("product_id", "store_id", "date");

-- CreateIndex
CREATE INDEX "sales_forecast_drivers_product_id_idx" ON "bi_dashboard"."sales_forecast_drivers"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "bi_dashboard"."customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_loyalty_card_number_key" ON "bi_dashboard"."customers"("loyalty_card_number");

-- CreateIndex
CREATE INDEX "customers_store_id_idx" ON "bi_dashboard"."customers"("store_id");

-- CreateIndex
CREATE INDEX "customers_segment_idx" ON "bi_dashboard"."customers"("segment");

-- CreateIndex
CREATE INDEX "inventory_alerts_store_id_idx" ON "bi_dashboard"."inventory_alerts"("store_id");

-- CreateIndex
CREATE INDEX "inventory_alerts_status_idx" ON "bi_dashboard"."inventory_alerts"("status");

-- CreateIndex
CREATE INDEX "inventory_alerts_urgency_idx" ON "bi_dashboard"."inventory_alerts"("urgency");

-- CreateIndex
CREATE INDEX "promotions_store_id_idx" ON "bi_dashboard"."promotions"("store_id");

-- CreateIndex
CREATE INDEX "promotions_status_idx" ON "bi_dashboard"."promotions"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "bi_dashboard"."audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "bi_dashboard"."audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "bi_dashboard"."audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "bi_dashboard"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "bi_dashboard"."notifications"("read");

-- AddForeignKey
ALTER TABLE "bi_dashboard"."user_stores" ADD CONSTRAINT "user_stores_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "bi_dashboard"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_dashboard"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."sales" ADD CONSTRAINT "sales_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_dashboard"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "bi_dashboard"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."sales" ADD CONSTRAINT "sales_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "bi_dashboard"."promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "bi_dashboard"."sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "bi_dashboard"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "bi_dashboard"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."inventory_movements" ADD CONSTRAINT "inventory_movements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_dashboard"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."sales_forecasts" ADD CONSTRAINT "sales_forecasts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "bi_dashboard"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."customers" ADD CONSTRAINT "customers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_dashboard"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."inventory_alerts" ADD CONSTRAINT "inventory_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "bi_dashboard"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."inventory_alerts" ADD CONSTRAINT "inventory_alerts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_dashboard"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."promotions" ADD CONSTRAINT "promotions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_dashboard"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."promotion_products" ADD CONSTRAINT "promotion_products_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "bi_dashboard"."promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard"."promotion_products" ADD CONSTRAINT "promotion_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "bi_dashboard"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
