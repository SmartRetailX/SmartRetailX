"""
DB-Aligned Personalized Promotion Engine
Integrates CF + ML for end-to-end promotion targeting.

Pipeline:  Product -> CF candidates -> ML scoring -> Top-N targets

Aligned with the Prisma schema:
  - CustomerID = auth.user.id  (UUID string)
  - ProductID  = core.products.id (UUID string)
  - Category comes from core.categories.name via join
"""

import pandas as pd
import numpy as np
import os
import sys
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.purchase_prediction import PurchasePredictionModel
from models.collaborative_filtering import CollaborativeFilteringModel
from data_analysis.preprocessing import DataPreprocessor


class PersonalizedPromotionEngine:
    """
    Complete end-to-end promotion targeting system.

    PIPELINE:
    Step 1: CF finds candidate customers (similar to product buyers)
    Step 2: ML predicts purchase probability for each candidate
    Step 3: Only customers above threshold receive promotion
    """

    def __init__(self, models_dir="models"):
        self.models_dir = models_dir
        self.purchase_model = None
        self.cf_model = None
        self.optimizer = None
        self.preprocessor = None

    # ─────────── model loading ──────────────────────────────

    def load_models(self):
        """Load all trained models."""
        print("Loading models ...")

        # Purchase prediction
        pp_path = os.path.join(self.models_dir, "purchase_prediction_model.pkl")
        if os.path.exists(pp_path):
            self.purchase_model = PurchasePredictionModel.load_model(pp_path)
        else:
            print(f"  WARNING: {pp_path} not found. Train it first.")

        # Collaborative filtering
        cf_path = os.path.join(self.models_dir, "collaborative_filtering_model.pkl")
        if os.path.exists(cf_path):
            self.cf_model = CollaborativeFilteringModel.load_model(cf_path)
        else:
            print(f"  WARNING: {cf_path} not found. Train it first.")

        # Preprocessor (data set externally by main.py)
        if self.preprocessor is None:
            self.preprocessor = DataPreprocessor()

        # Optimizer (optional)
        try:
            from models.promotion_optimizer import PromotionOptimizer
            self.optimizer = PromotionOptimizer()

            # Build customer features for optimizer if data available
            if self.preprocessor.transactions is not None and len(self.preprocessor.transactions) > 0:
                cust_features = self.preprocessor.create_customer_features()
                # Directly set data rather than loading from file
                self.optimizer.customer_features = cust_features
                self.optimizer.promotion_history = self.preprocessor.transactions[
                    self.preprocessor.transactions["PromotionID"] != "None"
                ].copy()
                if "TransactionDate" in self.optimizer.promotion_history.columns:
                    self.optimizer.promotion_history["TransactionDate"] = pd.to_datetime(
                        self.optimizer.promotion_history["TransactionDate"], errors="coerce"
                    )
        except Exception as e:
            print(f"  Note: Optimizer not available ({e})")
            self.optimizer = None

        print("[OK] Models loaded\n")

    # ─────────── main pipeline ──────────────────────────────

    def generate_promotion_targets(self, product_id, top_n=50):
        """
        CF + ML pipeline:
          1. CF identifies candidate customers
          2. ML predicts purchase probability
          3. Threshold filters
        Returns: DataFrame with CustomerID, purchase_probability, etc.
        """
        print("\n" + "=" * 70)
        print(" GENERATING PROMOTION TARGETS (CF + ML PIPELINE)")
        print("=" * 70)

        # ── product info ──────────────────────────────────────
        product = self.preprocessor.products[
            self.preprocessor.products["ProductID"] == product_id
        ]
        if len(product) == 0:
            print(f"Error: Product {product_id} not found")
            return pd.DataFrame()

        product = product.iloc[0]
        print(f"\nProduct: {product['ProductName']}")
        print(f"Category: {product['Category']}")
        print(f"Price: Rs. {product['Price']:,.2f}")

        # ── STEP 1: CF candidates ────────────────────────────
        print("\n[STEP 1] Collaborative Filtering — finding candidates ...")
        cf_results = self.cf_model.find_customers_for_product(
            product_id, n=top_n * 3, return_scores=True
        )
        print(f"  {len(cf_results)} candidates from CF")

        cf_scores = {}
        cf_candidates = []
        if len(cf_results) == 0:
            print("  WARNING: No CF candidates — falling back to all customers")
            cf_candidates = self.preprocessor.customers["CustomerID"].tolist()[: top_n * 3]
            cf_scores = {cid: 0.5 for cid in cf_candidates}
        else:
            for item in cf_results:
                cf_candidates.append(item["CustomerID"])
                cf_scores[item["CustomerID"]] = item["cf_score"]

        # ── STEP 2: build feature vectors ────────────────────
        print("\n[STEP 2] Preparing features for ML scoring ...")

        max_date = self.preprocessor.transactions["TransactionDate"].max()
        obs_start = max_date - pd.Timedelta(days=180)
        obs_txns = self.preprocessor.transactions[
            self.preprocessor.transactions["TransactionDate"] >= obs_start
        ]

        cust_features_obs = self.preprocessor.calculate_customer_features_for_window(
            obs_txns, max_date
        )
        category_affinity = self.preprocessor.calculate_category_affinity(obs_txns)

        # Encode product category
        prod_category = product["Category"]
        if prod_category in self.preprocessor.category_encoder.classes_:
            category_encoded = int(
                self.preprocessor.category_encoder.transform([prod_category])[0]
            )
        else:
            category_encoded = -1
            print(f"  Warning: Unknown category '{prod_category}', using -1")

        # Fallback medians for cold-start customers
        if len(cust_features_obs) > 0:
            fb_freq = cust_features_obs["purchase_frequency"].median()
            fb_avg = cust_features_obs["avg_transaction"].median()
            fb_rec = cust_features_obs["recency_days"].median()
            fb_promo = cust_features_obs["promo_response_rate"].median()
        else:
            fb_freq, fb_avg, fb_rec, fb_promo = 5, 500, 30, 0.1

        candidate_features = []
        cold_count = 0

        for cid in cf_candidates:
            cf = cust_features_obs[cust_features_obs["CustomerID"] == cid]

            if len(cf) == 0:
                cold_count += 1
                feat = {
                    "purchase_frequency": fb_freq,
                    "avg_transaction": fb_avg,
                    "recency_days": fb_rec,
                    "promo_response_rate": fb_promo,
                }
            else:
                r = cf.iloc[0]
                feat = {
                    "purchase_frequency": r["purchase_frequency"],
                    "avg_transaction": r["avg_transaction"],
                    "recency_days": r["recency_days"],
                    "promo_response_rate": r["promo_response_rate"],
                }

            cust_cat = category_affinity.get(cid, {})
            cust_age = self.preprocessor.customers[
                self.preprocessor.customers["CustomerID"] == cid
            ]["Age"].values
            cust_age = int(cust_age[0]) if len(cust_age) > 0 else 30

            cat_purchase_count = len(obs_txns[
                (obs_txns["CustomerID"] == cid) &
                (obs_txns["ProductID"].isin(
                    self.preprocessor.products[
                        self.preprocessor.products["Category"] == prod_category
                    ]["ProductID"]
                ))
            ])

            candidate_features.append({
                "CustomerID": cid,
                "ProductID": product_id,
                "customer_purchase_frequency": feat["purchase_frequency"],
                "customer_avg_transaction": feat["avg_transaction"],
                "customer_recency": feat["recency_days"],
                "customer_promo_response_rate": feat["promo_response_rate"],
                "customer_age": cust_age,
                "product_price": float(product["Price"]),
                "product_category_encoded": category_encoded,
                "category_affinity": cust_cat.get(prod_category, 0),
                "category_purchase_count": cat_purchase_count,
                "cf_score": cf_scores.get(cid, 0),
            })

        if not candidate_features:
            print("  ERROR: No valid candidates with features")
            return pd.DataFrame()

        if cold_count:
            print(f"  Note: {cold_count} cold customers included with fallback features")

        candidate_df = pd.DataFrame(candidate_features)
        print(f"  Prepared features for {len(candidate_df)} candidates")

        # ── STEP 3: ML scoring ───────────────────────────────
        print("\n[STEP 3] ML Model — scoring candidates ...")

        X, _, _ = self.purchase_model.prepare_features(candidate_df)

        # Validate feature alignment
        if self.purchase_model.feature_cols is not None:
            expected = set(self.purchase_model.feature_cols)
            actual = set(X.columns)
            if expected != actual:
                missing = expected - actual
                extra = actual - expected
                msg = "Feature mismatch!\n"
                if missing:
                    msg += f"  Missing: {missing}\n"
                if extra:
                    msg += f"  Extra: {extra}\n"
                raise ValueError(msg)

        candidate_df["purchase_probability"] = self.purchase_model.predict_proba(X)

        # Hybrid score
        ML_W, CF_W = 0.7, 0.3
        candidate_df["hybrid_score"] = (
            ML_W * candidate_df["purchase_probability"]
            + CF_W * candidate_df["cf_score"]
        )
        print(f"  Hybrid: {ML_W:.0%} ML + {CF_W:.0%} CF")
        print(f"  ML prob range: {candidate_df['purchase_probability'].min():.4f} – "
              f"{candidate_df['purchase_probability'].max():.4f}")

        # Threshold
        model_thr = self.purchase_model.optimal_threshold
        pct_thr = candidate_df["purchase_probability"].quantile(0.5)
        promo_thr = max(0.02, pct_thr)

        print(f"  Model threshold (F1): {model_thr:.4f}")
        print(f"  Promotion threshold:  {promo_thr:.4f}")

        # ── STEP 4: filter & rank ────────────────────────────
        print("\n[STEP 4] Filtering and ranking ...")

        eligible = candidate_df[candidate_df["purchase_probability"] >= promo_thr]
        eligible = eligible.sort_values("hybrid_score", ascending=False)
        top_targets = eligible.head(top_n).copy()
        top_targets["above_threshold"] = True
        top_targets["targeting_method"] = "cf_ml_hybrid"

        below = len(candidate_df) - len(eligible)
        print(f"  Scored: {len(candidate_df)} | Eligible: {len(eligible)} | "
              f"Filtered out: {below} | Returned: {len(top_targets)}")

        print("\n  Top 5 targets:")
        for _, r in top_targets.head(5).iterrows():
            print(f"    {r['CustomerID']}: ML={r['purchase_probability']:.2%}  "
                  f"CF={r['cf_score']:.2f}  Hybrid={r['hybrid_score']:.2%}")

        return top_targets[[
            "CustomerID", "ProductID", "purchase_probability", "cf_score",
            "hybrid_score", "above_threshold", "category_affinity",
            "targeting_method", "customer_purchase_frequency",
            "customer_avg_transaction", "customer_recency",
            "customer_promo_response_rate", "customer_age",
            "category_purchase_count",
        ]]

    # ─────────── strategy router ────────────────────────────

    def get_promotion_targets(self, product_id, strategy="hybrid", top_n=100):
        """
        Get target customers for a product promotion.

        Strategies:
        - 'ml_only': Use only purchase prediction model
        - 'cf_only': Use only collaborative filtering
        - 'hybrid': Combine both approaches (recommended)
        """
        print(f"\nGetting promotion targets for product: {product_id}")
        print(f"Strategy: {strategy}, Top N: {top_n}")

        if strategy == "ml_only":
            return self._get_targets_ml(product_id, top_n)
        elif strategy == "cf_only":
            return self._get_targets_cf(product_id, top_n)
        else:
            return self._get_targets_hybrid(product_id, top_n)

    def _get_targets_ml(self, product_id, top_n):
        """Targets via ML prediction only."""
        product = self.preprocessor.products[
            self.preprocessor.products["ProductID"] == product_id
        ]
        if len(product) == 0:
            return pd.DataFrame(columns=["CustomerID", "purchase_probability"])

        product_category = product.iloc[0]["Category"]
        training_data = self.preprocessor.create_training_data_for_promotion_targeting(product_id)
        if len(training_data) == 0:
            return pd.DataFrame(columns=["CustomerID", "purchase_probability"])

        cat_prods = self.preprocessor.products[
            self.preprocessor.products["Category"] == product_category
        ]["ProductID"].tolist()
        category_data = training_data[training_data["ProductID"].isin(cat_prods)].copy()
        if len(category_data) == 0:
            return pd.DataFrame(columns=["CustomerID", "purchase_probability"])

        X, _, data = self.purchase_model.prepare_features(category_data)
        data["purchase_probability"] = self.purchase_model.predict_proba(X)

        customer_scores = data.groupby("CustomerID").agg({
            "purchase_probability": "max",
            "customer_promo_response_rate": "first",
            "category_affinity": "first",
        }).reset_index()
        customer_scores["ProductID"] = product_id
        return customer_scores.nlargest(top_n, "purchase_probability")

    def _get_targets_cf(self, product_id, top_n):
        """Targets via CF only."""
        cf_results = self.cf_model.find_customers_for_product(
            product_id, top_n * 2, return_scores=True
        )
        if not cf_results:
            return pd.DataFrame(columns=["CustomerID", "cf_score", "targeting_method"])

        df = pd.DataFrame(cf_results[:top_n])
        df["targeting_method"] = "collaborative_filtering"
        return df

    def _get_targets_hybrid(self, product_id, top_n):
        """Hybrid: ML + CF with proper scoring."""
        ml_targets = self._get_targets_ml(product_id, top_n * 2)
        cf_targets = self._get_targets_cf(product_id, top_n * 2)

        cf_lookup = {}
        if len(cf_targets) > 0 and "cf_score" in cf_targets.columns:
            cf_lookup = dict(zip(cf_targets["CustomerID"], cf_targets["cf_score"]))

        if len(ml_targets) == 0 or "CustomerID" not in ml_targets.columns:
            if len(cf_targets) == 0:
                return pd.DataFrame(columns=[
                    "CustomerID", "purchase_probability", "cf_score", "targeting_method"
                ])
            cf_targets["purchase_probability"] = cf_targets["cf_score"] * 0.5
            cf_targets["targeting_method"] = "cf_only_fallback"
            return cf_targets.head(top_n)

        ml_custs = set(ml_targets["CustomerID"])
        cf_custs = set(cf_targets["CustomerID"]) if len(cf_targets) > 0 else set()

        combined = []
        for cid in ml_custs & cf_custs:
            ml_row = ml_targets[ml_targets["CustomerID"] == cid]
            if len(ml_row) > 0:
                combined.append({
                    "CustomerID": cid,
                    "purchase_probability": ml_row.iloc[0]["purchase_probability"],
                    "cf_score": cf_lookup.get(cid, 0.5),
                    "targeting_method": "hybrid_both",
                })
        for cid in ml_custs - cf_custs:
            ml_row = ml_targets[ml_targets["CustomerID"] == cid]
            if len(ml_row) > 0:
                combined.append({
                    "CustomerID": cid,
                    "purchase_probability": ml_row.iloc[0]["purchase_probability"],
                    "cf_score": 0,
                    "targeting_method": "ml_only",
                })
        for cid in cf_custs - ml_custs:
            s = cf_lookup.get(cid, 0.5)
            combined.append({
                "CustomerID": cid,
                "purchase_probability": 0.5 * s,
                "cf_score": s,
                "targeting_method": "cf_only",
            })

        df = pd.DataFrame(combined)
        return df.sort_values("purchase_probability", ascending=False).head(top_n)

    # ─────────── campaign builder ───────────────────────────

    def create_promotion_campaign(self, product_id, max_targets=100,
                                  strategy="hybrid", optimize=True):
        """
        Create a complete promotion campaign.
        Returns: (campaign_df, summary_dict)
        """
        print("\n" + "=" * 70)
        print(" CREATING PROMOTION CAMPAIGN")
        print("=" * 70)

        product = self.preprocessor.products[
            self.preprocessor.products["ProductID"] == product_id
        ]
        if len(product) == 0:
            print(f"Error: Product {product_id} not found")
            return None, None

        product = product.iloc[0]
        product_name = product["ProductName"]
        product_price = float(product["Price"])

        print(f"\nProduct: {product_name}")
        print(f"Price: Rs. {product_price:,.2f}")

        print(f"\n1. Finding targets (strategy={strategy}) ...")
        targets = self.get_promotion_targets(product_id, strategy, max_targets * 2)
        print(f"   Found {len(targets)} potential customers")

        if optimize and self.optimizer:
            print("\n2. Optimizing campaign ...")
            campaign, summary = self.optimizer.generate_promotion_campaign(
                product_id, product_name, product_price, targets, max_targets
            )
        else:
            print("\n2. Returning top customers by purchase probability ...")
            campaign = targets.head(max_targets).copy()
            summary = {
                "product_id": product_id,
                "product_name": product_name,
                "num_customers_targeted": len(campaign),
            }

        print("\n" + "=" * 70)
        print(" CAMPAIGN CREATED SUCCESSFULLY")
        print("=" * 70)
        return campaign, summary

    # ─────────── comparison helper ──────────────────────────

    def _calculate_historical_conversion_rate(self, product_id=None):
        """Calculate historical conversion rate from data."""
        txns = self.preprocessor.transactions
        promo_txns = txns[txns["PromotionID"] != "None"]
        if len(promo_txns) == 0:
            return 0.10

        if product_id:
            product = self.preprocessor.products[
                self.preprocessor.products["ProductID"] == product_id
            ]
            if len(product) > 0:
                cat = product.iloc[0]["Category"]
                cat_pids = self.preprocessor.products[
                    self.preprocessor.products["Category"] == cat
                ]["ProductID"].tolist()
                cat_promo = promo_txns[promo_txns["ProductID"].isin(cat_pids)]
                if len(cat_promo) > 0:
                    return cat_promo["CustomerID"].nunique() / txns["CustomerID"].nunique()

        return promo_txns["CustomerID"].nunique() / txns["CustomerID"].nunique()

    def compare_personalized_vs_broadcast(self, product_id, broadcast_discount=15,
                                          conversion_rate=None):
        """
        Compare personalised targeting vs broadcast to all customers.
        """
        print("\n" + "=" * 70)
        print(" PERSONALIZED vs BROADCAST COMPARISON")
        print("=" * 70)

        product = self.preprocessor.products[
            self.preprocessor.products["ProductID"] == product_id
        ].iloc[0]
        product_price = float(product["Price"])

        if conversion_rate is None:
            conversion_rate = self._calculate_historical_conversion_rate(product_id)
        print(f"\nConversion rate: {conversion_rate:.1%} (historical)")

        # Personalised
        print("\nA. PERSONALIZED CAMPAIGN (Top 100)")
        p_campaign, p_summary = self.create_promotion_campaign(
            product_id, max_targets=100, optimize=True
        )

        # Broadcast
        print("\n\nB. BROADCAST CAMPAIGN (All customers)")
        all_customers = self.preprocessor.customers["CustomerID"].tolist()
        bc_cost = len(all_customers) * product_price * (broadcast_discount / 100) * conversion_rate
        bc_rev = len(all_customers) * product_price * conversion_rate
        bc_profit = bc_rev - bc_cost

        print(f"   Reached: {len(all_customers)}")
        print(f"   Discount: {broadcast_discount}%")
        print(f"   Expected Cost: Rs. {bc_cost:,.2f}")
        print(f"   Expected Revenue: Rs. {bc_rev:,.2f}")
        print(f"   Expected Profit: Rs. {bc_profit:,.2f}")

        print("\n" + "-" * 70)
        print("COMPARISON SUMMARY")
        print("-" * 70)

        if p_summary and "total_expected_profit" in p_summary:
            improvement = (p_summary["total_expected_profit"] - bc_profit) / (bc_profit + 1) * 100
            efficiency = p_summary["num_customers_targeted"] / len(all_customers) * 100
            print(f"Personalised reaches {efficiency:.1f}% of customers")
            print(f"Profit improvement: {improvement:.1f}%")
            print(f"Cost efficiency: {100 - efficiency:.1f}% reduction")

        return {
            "personalized": p_summary,
            "broadcast": {"cost": bc_cost, "revenue": bc_rev, "profit": bc_profit},
        }


# ─────────── standalone demo ────────────────────────────────

def main():
    """Demo with CF+ML pipeline."""
    print("=" * 70)
    print(" PERSONALIZED PROMOTION ENGINE — DEMO")
    print("=" * 70)

    engine = PersonalizedPromotionEngine()
    engine.load_models()

    sample = engine.preprocessor.products[
        engine.preprocessor.products["Category"].str.contains("Bakery", case=False, na=False)
    ]
    if len(sample) == 0:
        sample = engine.preprocessor.products
    product_id = sample.iloc[0]["ProductID"]

    targets = engine.generate_promotion_targets(product_id, top_n=50)
    if len(targets) > 0:
        print(f"\n  Total targets: {len(targets)}")

    print("\n" + "=" * 70)
    print(" DEMO COMPLETED")
    print("=" * 70)


if __name__ == "__main__":
    main()
