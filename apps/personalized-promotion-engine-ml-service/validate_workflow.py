"""
Validation Script — end-to-end workflow test using sample CSV files.

Simulates database loading by reading the CSVs in data_analysis/raw_db/
and mapping columns exactly as database.py does, then runs:
  1. DataPreprocessor feature engineering
  2. CollaborativeFilteringModel training + evaluation
  3. PurchasePredictionModel training + evaluation
  4. PersonalizedPromotionEngine full pipeline (CF+ML hybrid)
  5. PromotionOptimizer campaign generation

Exit code 0 = all checks passed.
"""

import os
import sys
import traceback
import pandas as pd
import numpy as np

# Force UTF-8 output on Windows (avoids cp1252 UnicodeEncodeError)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Ensure imports work
SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SERVICE_DIR)

RAW_DB_DIR = os.path.join(SERVICE_DIR, "data_analysis", "raw_db")

PASS = "[OK] PASS"
FAIL = "[!!] FAIL"
results = []


def log(msg):
    print(msg)


def check(name, condition, detail=""):
    if condition:
        results.append((name, True))
        log(f"  {PASS}  {name}")
    else:
        results.append((name, False))
        log(f"  {FAIL}  {name}  —  {detail}")


# ─────────────────────────────────────────────────────────────
# STEP 0: Load CSVs and map to ML pipeline column names
# (mirrors what database.py + main.py do at runtime)
# ─────────────────────────────────────────────────────────────
log("\n" + "=" * 70)
log(" STEP 0: Loading sample CSV data")
log("=" * 70)

try:
    # --- users → customers ---
    users_raw = pd.read_csv(os.path.join(RAW_DB_DIR, "users.csv"))
    customers = pd.DataFrame({
        "CustomerID":       users_raw["id"],
        "Name":             users_raw["name"],
        "Email":            users_raw["email"],
        "Age":              pd.to_numeric(users_raw["age"], errors="coerce").fillna(30).astype(int),
        "Gender":           users_raw["gender"],
        "Location":         users_raw["City"],
        "CustomerSegment":  users_raw["customerSegment"],
        "RegistrationDate": pd.to_datetime(users_raw["createdAt"]),
    })
    check("Users loaded", len(customers) > 0, f"got {len(customers)} rows")

    # --- categories ---
    categories_raw = pd.read_csv(os.path.join(RAW_DB_DIR, "categories.csv"))
    cat_lookup = dict(zip(categories_raw["id"], categories_raw["name"]))
    check("Categories loaded", len(cat_lookup) > 0, f"got {len(cat_lookup)} categories")

    # --- products ---
    products_raw = pd.read_csv(os.path.join(RAW_DB_DIR, "products.csv"))
    products = pd.DataFrame({
        "ProductID":         products_raw["id"],
        "ProductName":       products_raw["name"],
        "Category":          products_raw["category_id"].map(cat_lookup),
        "Brand":             products_raw["brand"],
        "Price":             pd.to_numeric(products_raw["price"], errors="coerce"),
        "PurchaseFrequency": products_raw["purchase_frequency"],
        "StockQuantity":     products_raw["stock_quantity"],
    })
    # Filter active only
    if "is_active" in products_raw.columns:
        active_mask = products_raw["is_active"].astype(str).str.lower().isin(["true", "1", "t"])
        products = products[active_mask.values].reset_index(drop=True)
    check("Products loaded", len(products) > 0, f"got {len(products)} rows")
    check("Category mapping OK", products["Category"].notna().all(),
          f"{products['Category'].isna().sum()} unmapped categories")

    # --- transactions ---
    txn_raw = pd.read_csv(os.path.join(RAW_DB_DIR, "transactions.csv"))
    transactions = pd.DataFrame({
        "TransactionID":   txn_raw["transaction_id"],
        "OrderID":         txn_raw["order_id"],
        "InvoiceNo":       txn_raw["invoice_no"],
        "CustomerID":      txn_raw["customer_id"],
        "ProductID":       txn_raw["product_id"],
        "Quantity":         pd.to_numeric(txn_raw["quantity"], errors="coerce").fillna(1).astype(int),
        "UnitPrice":        pd.to_numeric(txn_raw["unit_price"], errors="coerce").fillna(0),
        "TotalAmount":      pd.to_numeric(txn_raw["total_amount"], errors="coerce").fillna(0),
        "TransactionDate":  pd.to_datetime(txn_raw["transaction_date"]),
        "DiscountedAmount": pd.to_numeric(txn_raw["discount_amount"], errors="coerce").fillna(0),
        "PromotionID":      txn_raw["promotion_id"].fillna("None").astype(str).replace("", "None").replace("nan", "None"),
    })
    check("Transactions loaded", len(transactions) > 0, f"got {len(transactions)} rows")

    # --- promotions ---
    promo_raw = pd.read_csv(os.path.join(RAW_DB_DIR, "promotions.csv"))
    promotions = pd.DataFrame({
        "PromotionID":        promo_raw["promotion_id"],
        "ProductID":          promo_raw["product_id"],
        "DiscountPercentage": pd.to_numeric(promo_raw["discount_percentage"], errors="coerce"),
        "StartDate":          pd.to_datetime(promo_raw["start_date"]),
        "EndDate":            pd.to_datetime(promo_raw["end_date"]),
        "PromotionType":      promo_raw["promotion_type"],
        "IsTargetted":        promo_raw["is_targetted_promotion"],
        "Status":             promo_raw.get("status", "active"),
    })
    check("Promotions loaded", len(promotions) > 0, f"got {len(promotions)} rows")

    log(f"\n  Summary: {len(customers)} customers, {len(products)} products, "
        f"{len(transactions)} transactions, {len(promotions)} promotions")

except Exception as e:
    log(f"\n  {FAIL} CSV loading failed: {e}")
    traceback.print_exc()
    sys.exit(1)


# ─────────────────────────────────────────────────────────────
# STEP 1: DataPreprocessor
# ─────────────────────────────────────────────────────────────
log("\n" + "=" * 70)
log(" STEP 1: DataPreprocessor — feature engineering")
log("=" * 70)

try:
    from data_analysis.preprocessing import DataPreprocessor

    preprocessor = DataPreprocessor(data_dir="")
    preprocessor.customers = customers
    preprocessor.products = products
    preprocessor.transactions = transactions
    preprocessor.promotions = promotions
    preprocessor.category_encoder.fit(products["Category"].unique())

    check("DataPreprocessor init", True)
    check("Category encoder fitted",
          len(preprocessor.category_encoder.classes_) > 0,
          f"{len(preprocessor.category_encoder.classes_)} classes")

    # Test feature calculations
    max_date = transactions["TransactionDate"].max()
    obs_start = max_date - pd.Timedelta(days=180)
    obs_txns = transactions[transactions["TransactionDate"] >= obs_start]

    cust_feats = preprocessor.calculate_customer_features_for_window(obs_txns, max_date)
    check("Customer features calculated", len(cust_feats) > 0,
          f"{len(cust_feats)} customers with features")

    required_cols = ["CustomerID", "purchase_frequency", "avg_transaction",
                     "recency_days", "promo_response_rate"]
    missing = [c for c in required_cols if c not in cust_feats.columns]
    check("Customer feature columns OK", len(missing) == 0,
          f"missing: {missing}")

    cat_affinity = preprocessor.calculate_category_affinity(obs_txns)
    check("Category affinity calculated", len(cat_affinity) > 0,
          f"{len(cat_affinity)} customers with affinity")

    interactions = preprocessor.create_customer_product_matrix()
    check("Interaction matrix created", len(interactions) > 0,
          f"{len(interactions)} interactions")
    check("Interaction score column exists",
          "interaction_score" in interactions.columns)

    # Full customer features (for optimizer)
    full_cust_feats = preprocessor.create_customer_features()
    check("Full customer features created", len(full_cust_feats) > 0,
          f"{len(full_cust_feats)} rows")

except Exception as e:
    log(f"\n  {FAIL} DataPreprocessor failed: {e}")
    traceback.print_exc()


# ─────────────────────────────────────────────────────────────
# STEP 2: Collaborative Filtering — train + evaluate
# ─────────────────────────────────────────────────────────────
log("\n" + "=" * 70)
log(" STEP 2: Collaborative Filtering — training")
log("=" * 70)

cf_model = None
try:
    from models.collaborative_filtering import CollaborativeFilteringModel

    # Time split
    txn_sorted = transactions.sort_values("TransactionDate")
    split_date = txn_sorted["TransactionDate"].quantile(0.75)

    train_interactions = preprocessor.create_customer_product_matrix(end_date=split_date)
    check("CF train interactions created", len(train_interactions) > 0)

    cf_model = CollaborativeFilteringModel(
        n_neighbors_user=min(50, len(customers) - 1),
        n_neighbors_item=min(30, len(products) - 1),
        shrinkage_factor=5,
    )
    cf_model.create_interaction_matrix(train_interactions)
    check("CF interaction matrix built",
          cf_model.user_item_matrix is not None,
          f"shape={cf_model.user_item_matrix.shape}")

    cf_model.train_user_similarity()
    check("CF user similarity trained", cf_model.user_similarity_model is not None)

    cf_model.train_item_similarity()
    check("CF item similarity trained", cf_model.item_similarity_model is not None)

    # Test recommendations
    if len(cf_model.customer_ids) > 0:
        sample_cust = cf_model.customer_ids[0]
        similar = cf_model.get_similar_customers(sample_cust, n=5)
        check("CF similar customers works", len(similar) > 0,
              f"got {len(similar)} similar customers")

    if len(cf_model.product_ids) > 0:
        sample_prod = cf_model.product_ids[0]
        similar_prods = cf_model.get_similar_products(sample_prod, n=5)
        check("CF similar products works", len(similar_prods) > 0,
              f"got {len(similar_prods)} similar products")

        # find_customers_for_product (used by promotion engine)
        cf_targets = cf_model.find_customers_for_product(
            sample_prod, n=20, return_scores=True
        )
        check("CF find_customers_for_product works", len(cf_targets) > 0,
              f"got {len(cf_targets)} candidates")
        if len(cf_targets) > 0:
            check("CF results have cf_score", "cf_score" in cf_targets[0],
                  f"keys: {list(cf_targets[0].keys())}")

    # Evaluate
    test_trans = txn_sorted[txn_sorted["TransactionDate"] >= split_date]
    test_interactions = test_trans.groupby(["CustomerID", "ProductID"]).size().reset_index(name="count")
    metrics = cf_model.evaluate_recommendations(test_interactions, k=10)
    check("CF evaluation completed",
          "Precision@K" in metrics,
          f"P@10={metrics.get('Precision@K', 0):.4f}")

    # Save model
    cf_save_path = os.path.join(SERVICE_DIR, "models", "collaborative_filtering_model_test.pkl")
    cf_model.save_model(cf_save_path)
    check("CF model saved", os.path.exists(cf_save_path))

    # Load model
    cf_loaded = CollaborativeFilteringModel.load_model(cf_save_path)
    check("CF model loaded back", cf_loaded.user_item_matrix is not None)

    # Cleanup test file
    os.remove(cf_save_path)

except Exception as e:
    log(f"\n  {FAIL} Collaborative Filtering failed: {e}")
    traceback.print_exc()


# ─────────────────────────────────────────────────────────────
# STEP 3: Purchase Prediction — train + evaluate
# ─────────────────────────────────────────────────────────────
log("\n" + "=" * 70)
log(" STEP 3: Purchase Prediction — training")
log("=" * 70)

pp_model = None
try:
    from models.purchase_prediction import PurchasePredictionModel

    # Create training data (use smaller windows for speed)
    training_data = preprocessor.create_time_aware_training_data(
        observation_days=60, prediction_days=14
    )
    check("Training data created", len(training_data) > 0,
          f"{len(training_data)} samples")

    if len(training_data) > 0:
        pos_rate = training_data["target"].mean()
        check("Training data has positive samples",
              pos_rate > 0, f"positive rate: {pos_rate*100:.2f}%")

        # Split
        train_df, val_df, test_df = preprocessor.get_train_val_test_split(
            training_data, val_ratio=0.15, test_ratio=0.15
        )
        check("Train/val/test split OK",
              len(train_df) > 0 and len(val_df) > 0 and len(test_df) > 0)

        # Train
        pp_model = PurchasePredictionModel(model_type="random_forest")
        X_train, y_train, _ = pp_model.prepare_features(train_df)
        check("Features prepared",
              len(X_train.columns) > 0,
              f"features: {list(X_train.columns)}")

        pp_model.train(X_train, y_train)
        check("Model trained", pp_model.model is not None)

        # Threshold on validation
        X_val, y_val, _ = pp_model.prepare_features(val_df)
        threshold = pp_model.find_optimal_threshold(X_val, y_val)
        check("Optimal threshold found",
              0 < threshold < 1, f"threshold={threshold:.4f}")

        # Evaluate on test
        X_test, y_test, _ = pp_model.prepare_features(test_df)
        metrics = pp_model.evaluate(X_test, y_test)
        check("Model evaluated",
              "roc_auc" in metrics,
              f"AUC={metrics['roc_auc']:.4f}, F1={metrics['f1_score']:.4f}")

        # Save/load
        pp_save_path = os.path.join(SERVICE_DIR, "models", "purchase_prediction_model_test.pkl")
        pp_model.save_model(pp_save_path)
        check("PP model saved", os.path.exists(pp_save_path))

        pp_loaded = PurchasePredictionModel.load_model(pp_save_path)
        check("PP model loaded back", pp_loaded.model is not None)

        # Verify inference works
        test_proba = pp_loaded.predict_proba(X_test)
        check("PP inference works",
              len(test_proba) == len(X_test),
              f"got {len(test_proba)} predictions")

        os.remove(pp_save_path)

except Exception as e:
    log(f"\n  {FAIL} Purchase Prediction failed: {e}")
    traceback.print_exc()


# ─────────────────────────────────────────────────────────────
# STEP 4: Promotion Engine — full pipeline
# ─────────────────────────────────────────────────────────────
log("\n" + "=" * 70)
log(" STEP 4: PersonalizedPromotionEngine — full pipeline")
log("=" * 70)

try:
    from models.promotion_engine import PersonalizedPromotionEngine

    engine = PersonalizedPromotionEngine(models_dir=os.path.join(SERVICE_DIR, "models"))
    engine.preprocessor = preprocessor
    engine.purchase_model = pp_model
    engine.cf_model = cf_model

    check("Engine initialized",
          engine.preprocessor is not None and
          engine.purchase_model is not None and
          engine.cf_model is not None)

    # Pick a product
    sample_product_id = products.iloc[0]["ProductID"]
    sample_product_name = products.iloc[0]["ProductName"]
    log(f"\n  Testing with product: {sample_product_name} ({sample_product_id})")

    # generate_promotion_targets (the main CF+ML pipeline)
    targets = engine.generate_promotion_targets(sample_product_id, top_n=20)
    check("generate_promotion_targets works",
          targets is not None and len(targets) > 0,
          f"got {len(targets)} targets")

    if len(targets) > 0:
        expected_cols = ["CustomerID", "purchase_probability", "cf_score",
                         "hybrid_score", "targeting_method"]
        missing = [c for c in expected_cols if c not in targets.columns]
        check("Target columns OK", len(missing) == 0,
              f"missing: {missing}")

        check("Probabilities in valid range",
              targets["purchase_probability"].between(0, 1).all(),
              f"range: {targets['purchase_probability'].min():.4f}-{targets['purchase_probability'].max():.4f}")

    # get_promotion_targets with different strategies
    for strategy in ["hybrid", "cf_only"]:
        strat_targets = engine.get_promotion_targets(
            sample_product_id, strategy=strategy, top_n=10
        )
        check(f"Strategy '{strategy}' works",
              strat_targets is not None and len(strat_targets) > 0,
              f"got {len(strat_targets)} targets")

except Exception as e:
    log(f"\n  {FAIL} Promotion Engine failed: {e}")
    traceback.print_exc()


# ─────────────────────────────────────────────────────────────
# STEP 5: Promotion Optimizer
# ─────────────────────────────────────────────────────────────
log("\n" + "=" * 70)
log(" STEP 5: PromotionOptimizer")
log("=" * 70)

try:
    from models.promotion_optimizer import PromotionOptimizer

    optimizer = PromotionOptimizer()
    optimizer.customer_features = full_cust_feats
    promo_txns = transactions[transactions["PromotionID"] != "None"].copy()
    promo_txns["TransactionDate"] = pd.to_datetime(promo_txns["TransactionDate"], errors="coerce")
    optimizer.promotion_history = promo_txns

    check("Optimizer initialized", optimizer.customer_features is not None)

    # Test optimal discount
    sample_cid = customers.iloc[0]["CustomerID"]
    discount = optimizer.calculate_optimal_discount(sample_cid, 500.0)
    check("Optimal discount calculated",
          5 <= discount <= 50, f"discount={discount}%")

    # Test fatigue check
    fatigue_result = optimizer.check_promotion_fatigue(sample_cid)
    check("Fatigue check works",
          isinstance(fatigue_result, tuple) and len(fatigue_result) == 3,
          f"result={fatigue_result}")

    # Test ROI prediction
    roi = optimizer.predict_promotion_roi(sample_cid, sample_product_id, 500.0, 15.0, 0.6)
    check("ROI prediction works",
          "expected_profit" in roi and "roi_percentage" in roi,
          f"ROI={roi['roi_percentage']:.1f}%")

    # Wire to engine and test campaign
    engine.optimizer = optimizer
    campaign, summary = engine.create_promotion_campaign(
        sample_product_id, max_targets=20, strategy="hybrid", optimize=True
    )
    check("Campaign generation works",
          campaign is not None and len(campaign) > 0,
          f"targeted {len(campaign)} customers")
    check("Campaign summary OK",
          summary is not None and "product_name" in summary,
          f"product: {summary.get('product_name')}")

except Exception as e:
    log(f"\n  {FAIL} Promotion Optimizer failed: {e}")
    traceback.print_exc()


# ─────────────────────────────────────────────────────────────
# STEP 6: Load existing PKL models (if present)
# ─────────────────────────────────────────────────────────────
log("\n" + "=" * 70)
log(" STEP 6: Load existing trained PKL models")
log("=" * 70)

try:
    from models.purchase_prediction import PurchasePredictionModel
    from models.collaborative_filtering import CollaborativeFilteringModel

    pp_pkl = os.path.join(SERVICE_DIR, "models", "purchase_prediction_model.pkl")
    cf_pkl = os.path.join(SERVICE_DIR, "models", "collaborative_filtering_model.pkl")

    if os.path.exists(pp_pkl):
        pp_loaded = PurchasePredictionModel.load_model(pp_pkl)
        check("Existing PP .pkl loads OK", pp_loaded.model is not None)
        check("PP feature_cols present",
              pp_loaded.feature_cols is not None,
              f"features: {pp_loaded.feature_cols}")
    else:
        log(f"  [SKIP] {pp_pkl} not found")

    if os.path.exists(cf_pkl):
        cf_loaded = CollaborativeFilteringModel.load_model(cf_pkl)
        check("Existing CF .pkl loads OK",
              cf_loaded.user_item_matrix is not None,
              f"shape: {cf_loaded.user_item_matrix.shape}")
    else:
        log(f"  [SKIP] {cf_pkl} not found")

except Exception as e:
    log(f"\n  {FAIL} PKL loading failed: {e}")
    traceback.print_exc()


# ─────────────────────────────────────────────────────────────
# FINAL REPORT
# ─────────────────────────────────────────────────────────────
log("\n" + "=" * 70)
log(" VALIDATION REPORT")
log("=" * 70)

total = len(results)
passed = sum(1 for _, ok in results if ok)
failed = sum(1 for _, ok in results if not ok)

log(f"\n  Total checks: {total}")
log(f"  Passed:       {passed}")
log(f"  Failed:       {failed}")

if failed > 0:
    log("\n  Failed checks:")
    for name, ok in results:
        if not ok:
            log(f"    {FAIL}  {name}")

log("\n" + "=" * 70)
if failed == 0:
    log(" ALL CHECKS PASSED [OK]")
else:
    log(f" {failed} CHECK(S) FAILED [!!]")
log("=" * 70)

sys.exit(0 if failed == 0 else 1)
