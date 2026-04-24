
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  sku: 'sku',
  barcode: 'barcode',
  name: 'name',
  nameSi: 'nameSi',
  category: 'category',
  categorySi: 'categorySi',
  price: 'price',
  cost: 'cost',
  currentStock: 'currentStock',
  reorderLevel: 'reorderLevel',
  maxStock: 'maxStock',
  status: 'status',
  supplier: 'supplier',
  lastRestocked: 'lastRestocked',
  expiryDate: 'expiryDate',
  imageUrl: 'imageUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SaleScalarFieldEnum = {
  id: 'id',
  transactionId: 'transactionId',
  customerId: 'customerId',
  totalAmount: 'totalAmount',
  discount: 'discount',
  finalAmount: 'finalAmount',
  paymentMethod: 'paymentMethod',
  promotionId: 'promotionId',
  timestamp: 'timestamp'
};

exports.Prisma.SaleItemScalarFieldEnum = {
  id: 'id',
  saleId: 'saleId',
  productId: 'productId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  revenue: 'revenue',
  cost: 'cost',
  profit: 'profit'
};

exports.Prisma.InventoryMovementScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  type: 'type',
  quantity: 'quantity',
  previousStock: 'previousStock',
  newStock: 'newStock',
  cost: 'cost',
  reason: 'reason',
  supplier: 'supplier',
  invoiceNumber: 'invoiceNumber',
  expiryDate: 'expiryDate',
  userId: 'userId',
  timestamp: 'timestamp'
};

exports.Prisma.ForecastScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  date: 'date',
  predictedSales: 'predictedSales',
  confidenceLower: 'confidenceLower',
  confidenceUpper: 'confidenceUpper',
  revenue: 'revenue',
  modelType: 'modelType',
  confidence: 'confidence',
  generatedAt: 'generatedAt'
};

exports.Prisma.ForecastDriverScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  name: 'name',
  nameSi: 'nameSi',
  impact: 'impact',
  description: 'description',
  descriptionSi: 'descriptionSi',
  generatedAt: 'generatedAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  segment: 'segment',
  rfmRecency: 'rfmRecency',
  rfmFrequency: 'rfmFrequency',
  rfmMonetary: 'rfmMonetary',
  totalOrders: 'totalOrders',
  totalSpent: 'totalSpent',
  averageOrderValue: 'averageOrderValue',
  lifetimeValue: 'lifetimeValue',
  lastPurchase: 'lastPurchase',
  loyaltyCardNumber: 'loyaltyCardNumber',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AlertScalarFieldEnum = {
  id: 'id',
  type: 'type',
  urgency: 'urgency',
  productId: 'productId',
  currentStock: 'currentStock',
  recommendedQuantity: 'recommendedQuantity',
  reason: 'reason',
  reasonSi: 'reasonSi',
  confidence: 'confidence',
  estimatedStockoutDate: 'estimatedStockoutDate',
  status: 'status',
  acceptedAt: 'acceptedAt',
  rejectedAt: 'rejectedAt',
  rejectionReason: 'rejectionReason',
  purchaseOrderId: 'purchaseOrderId',
  createdAt: 'createdAt'
};

exports.Prisma.PromotionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  nameSi: 'nameSi',
  discount: 'discount',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  targetedRevenue: 'targetedRevenue',
  actualRevenue: 'actualRevenue',
  lift: 'lift',
  createdAt: 'createdAt'
};

exports.Prisma.PromotionProductScalarFieldEnum = {
  promotionId: 'promotionId',
  productId: 'productId'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  actionSi: 'actionSi',
  entityType: 'entityType',
  entityId: 'entityId',
  changes: 'changes',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  timestamp: 'timestamp'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  titleSi: 'titleSi',
  message: 'message',
  messageSi: 'messageSi',
  actionUrl: 'actionUrl',
  read: 'read',
  readAt: 'readAt',
  timestamp: 'timestamp'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.StockStatus = exports.$Enums.StockStatus = {
  IN_STOCK: 'IN_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  MOBILE: 'MOBILE',
  BANK_TRANSFER: 'BANK_TRANSFER'
};

exports.MovementType = exports.$Enums.MovementType = {
  RESTOCK: 'RESTOCK',
  SALE: 'SALE',
  TRANSFER: 'TRANSFER',
  ADJUSTMENT: 'ADJUSTMENT',
  WASTE: 'WASTE'
};

exports.AlertType = exports.$Enums.AlertType = {
  RESTOCK: 'RESTOCK',
  PRICE: 'PRICE',
  PROMOTION: 'PROMOTION',
  QUALITY: 'QUALITY'
};

exports.Urgency = exports.$Enums.Urgency = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

exports.AlertStatus = exports.$Enums.AlertStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
};

exports.PromotionStatus = exports.$Enums.PromotionStatus = {
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  ALERT: 'ALERT',
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING'
};

exports.Prisma.ModelName = {
  Product: 'Product',
  Sale: 'Sale',
  SaleItem: 'SaleItem',
  InventoryMovement: 'InventoryMovement',
  Forecast: 'Forecast',
  ForecastDriver: 'ForecastDriver',
  Customer: 'Customer',
  Alert: 'Alert',
  Promotion: 'Promotion',
  PromotionProduct: 'PromotionProduct',
  AuditLog: 'AuditLog',
  Notification: 'Notification'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
