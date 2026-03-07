-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MOBILE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RESTOCK', 'SALE', 'TRANSFER', 'ADJUSTMENT', 'WASTE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('RESTOCK', 'PRICE', 'PROMOTION', 'QUALITY');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ALERT', 'INFO', 'SUCCESS', 'WARNING');

-- CreateTable
CREATE TABLE "bi_user_stores" (
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "bi_user_stores_pkey" PRIMARY KEY ("userId","storeId")
);

-- CreateTable
CREATE TABLE "bi_stores" (
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

    CONSTRAINT "bi_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_products" (
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
    "status" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "supplier" TEXT,
    "last_restocked" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bi_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_sales" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "final_amount" DOUBLE PRECISION NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "promotion_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "bi_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_inventory_movements" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
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

    CONSTRAINT "bi_inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_sales_forecasts" (
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

    CONSTRAINT "bi_sales_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_sales_forecast_drivers" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_si" TEXT,
    "impact" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "description_si" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_sales_forecast_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_customers" (
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

    CONSTRAINT "bi_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_inventory_alerts" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "urgency" "Urgency" NOT NULL,
    "product_id" TEXT,
    "store_id" TEXT NOT NULL,
    "current_stock" INTEGER,
    "recommended_quantity" INTEGER,
    "reason" TEXT NOT NULL,
    "reason_si" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "estimated_stockout_date" TIMESTAMP(3),
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "purchase_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_inventory_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_promotions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_si" TEXT,
    "store_id" TEXT NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "PromotionStatus" NOT NULL,
    "targeted_revenue" DOUBLE PRECISION NOT NULL,
    "actual_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lift" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_promotion_products" (
    "promotionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "bi_promotion_products_pkey" PRIMARY KEY ("promotionId","productId")
);

-- CreateTable
CREATE TABLE "bi_audit_logs" (
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

    CONSTRAINT "bi_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "title_si" TEXT,
    "message" TEXT NOT NULL,
    "message_si" TEXT,
    "action_url" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bi_products_sku_key" ON "bi_products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "bi_products_barcode_key" ON "bi_products"("barcode");

-- CreateIndex
CREATE INDEX "bi_products_store_id_idx" ON "bi_products"("store_id");

-- CreateIndex
CREATE INDEX "bi_products_category_idx" ON "bi_products"("category");

-- CreateIndex
CREATE INDEX "bi_products_status_idx" ON "bi_products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bi_sales_transaction_id_key" ON "bi_sales"("transaction_id");

-- CreateIndex
CREATE INDEX "bi_sales_store_id_idx" ON "bi_sales"("store_id");

-- CreateIndex
CREATE INDEX "bi_sales_customer_id_idx" ON "bi_sales"("customer_id");

-- CreateIndex
CREATE INDEX "bi_sales_timestamp_idx" ON "bi_sales"("timestamp");

-- CreateIndex
CREATE INDEX "bi_sale_items_sale_id_idx" ON "bi_sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "bi_sale_items_product_id_idx" ON "bi_sale_items"("product_id");

-- CreateIndex
CREATE INDEX "bi_inventory_movements_product_id_idx" ON "bi_inventory_movements"("product_id");

-- CreateIndex
CREATE INDEX "bi_inventory_movements_store_id_idx" ON "bi_inventory_movements"("store_id");

-- CreateIndex
CREATE INDEX "bi_inventory_movements_timestamp_idx" ON "bi_inventory_movements"("timestamp");

-- CreateIndex
CREATE INDEX "bi_sales_forecasts_product_id_idx" ON "bi_sales_forecasts"("product_id");

-- CreateIndex
CREATE INDEX "bi_sales_forecasts_date_idx" ON "bi_sales_forecasts"("date");

-- CreateIndex
CREATE UNIQUE INDEX "bi_sales_forecasts_product_id_store_id_date_key" ON "bi_sales_forecasts"("product_id", "store_id", "date");

-- CreateIndex
CREATE INDEX "bi_sales_forecast_drivers_product_id_idx" ON "bi_sales_forecast_drivers"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "bi_customers_email_key" ON "bi_customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bi_customers_loyalty_card_number_key" ON "bi_customers"("loyalty_card_number");

-- CreateIndex
CREATE INDEX "bi_customers_store_id_idx" ON "bi_customers"("store_id");

-- CreateIndex
CREATE INDEX "bi_customers_segment_idx" ON "bi_customers"("segment");

-- CreateIndex
CREATE INDEX "bi_inventory_alerts_store_id_idx" ON "bi_inventory_alerts"("store_id");

-- CreateIndex
CREATE INDEX "bi_inventory_alerts_status_idx" ON "bi_inventory_alerts"("status");

-- CreateIndex
CREATE INDEX "bi_inventory_alerts_urgency_idx" ON "bi_inventory_alerts"("urgency");

-- CreateIndex
CREATE INDEX "bi_promotions_store_id_idx" ON "bi_promotions"("store_id");

-- CreateIndex
CREATE INDEX "bi_promotions_status_idx" ON "bi_promotions"("status");

-- CreateIndex
CREATE INDEX "bi_audit_logs_user_id_idx" ON "bi_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "bi_audit_logs_entity_type_idx" ON "bi_audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "bi_audit_logs_timestamp_idx" ON "bi_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "bi_notifications_user_id_idx" ON "bi_notifications"("user_id");

-- CreateIndex
CREATE INDEX "bi_notifications_read_idx" ON "bi_notifications"("read");

-- AddForeignKey
ALTER TABLE "bi_user_stores" ADD CONSTRAINT "bi_user_stores_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "bi_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_products" ADD CONSTRAINT "bi_products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_sales" ADD CONSTRAINT "bi_sales_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_sales" ADD CONSTRAINT "bi_sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "bi_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_sales" ADD CONSTRAINT "bi_sales_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "bi_promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_sale_items" ADD CONSTRAINT "bi_sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "bi_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_sale_items" ADD CONSTRAINT "bi_sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "bi_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_inventory_movements" ADD CONSTRAINT "bi_inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "bi_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_inventory_movements" ADD CONSTRAINT "bi_inventory_movements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_sales_forecasts" ADD CONSTRAINT "bi_sales_forecasts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "bi_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_customers" ADD CONSTRAINT "bi_customers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_inventory_alerts" ADD CONSTRAINT "bi_inventory_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "bi_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_inventory_alerts" ADD CONSTRAINT "bi_inventory_alerts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_promotions" ADD CONSTRAINT "bi_promotions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "bi_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_promotion_products" ADD CONSTRAINT "bi_promotion_products_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "bi_promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_promotion_products" ADD CONSTRAINT "bi_promotion_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "bi_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
