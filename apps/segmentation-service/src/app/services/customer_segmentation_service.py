import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.customer_category import CustomerCategoryContribution, CustomerCategoryPreference
from app.models.customer_segment import CustomerSegment
from app.repositories.transaction_repo import get_all_transactions

# Load ML artifacts
BASE_DIR = Path(__file__).resolve().parent.parent / "artifacts"

kmeans = joblib.load(BASE_DIR / "kmeans_model.pkl")
scaler = joblib.load(BASE_DIR / "scaler.pkl")

with open(BASE_DIR / "kmeans_cluster_behavior.json", "r") as f:
    cluster_behavior = json.load(f)

def generate_segments_by_rfm(session: Session):
    transactions = get_all_transactions()
    if not transactions:
        return pd.DataFrame()
    
    transactions_df = pd.DataFrame([{
        "TransactionID": t.transaction_id,
        "InvoiceNo": t.invoice_no,
        "InvoiceDate": t.transaction_date,
        "Customer ID": t.customer_id,
        "ProductID": t.product_id,
        "ProductCategory": t.product_category,
        "Quantity": float(t.quantity),
        "Price": float(t.unit_price),
        "TotalPrice": float(t.total_amount)
    } for t in transactions])

    latest_date = transactions_df['InvoiceDate'].max()

    rfm = transactions_df.groupby('Customer ID').agg({
        'InvoiceDate': lambda x: (latest_date - x.max()).days,
        'InvoiceNo': 'nunique',
        'TotalPrice': 'sum'
    }).rename(columns={
        'InvoiceDate': 'recency',
        'InvoiceNo': 'frequency',
        'TotalPrice': 'monetary'
    }).reset_index()

    # Log-transform for numeric stability
    rfm['log_frequency'] = np.log1p(rfm['frequency'].astype(float))
    rfm['log_monetary'] = np.log1p(rfm['monetary'].astype(float))

    # PARENT CLUSTER (K-MEANS)
    rfm_scaled = scaler.fit_transform(
        rfm[['recency', 'log_frequency', 'log_monetary']]
    )
    rfm['kmeans_cluster'] = kmeans.predict(rfm_scaled)
    rfm['kmeans_behavior'] = (
        rfm['kmeans_cluster'].astype(str)
        .map(cluster_behavior)
        .fillna("Unknown")
    )

    # CHILD CLUSTER (RFM RULES)
    rfm['recency_score'] = pd.qcut(rfm['recency'], 5, labels=[5,4,3,2,1])
    rfm['frequency_score'] = pd.qcut(rfm['frequency'].rank(method='first'), 5, labels=[1,2,3,4,5])
    rfm['monetary_score'] = pd.qcut(rfm['monetary'], 5, labels=[1,2,3,4,5])

    rfm['rfm_score'] = (
        rfm['recency_score'].astype(str) +
        rfm['frequency_score'].astype(str)
    )

    seg_map = {
        r'[1-2][1-2]': 'Hibernating',
        r'[1-2][3-4]': 'At Risk',
        r'[1-2]5': 'Cannt Lose',
        r'3[1-2]': 'About to Sleep',
        r'33': 'Need Attention',
        r'[3-4][4-5]': 'Loyal Customers',
        r'41': 'Promising',
        r'51': 'New Customers',
        r'[4-5][2-3]': 'Potential Loyalists',
        r'5[4-5]': 'Champions'
    }

    rfm['rfm_segment'] = rfm['rfm_score'].replace(seg_map, regex=True)

    try:
        for _, row in rfm.iterrows():
            segment = (
                session.query(CustomerSegment)
                .filter(CustomerSegment.customer_id == row["Customer ID"])
                .first()
            )

            if segment:
                segment.parent_behavior = row["kmeans_behavior"]
                segment.sub_segment = row["rfm_segment"]
                segment.recency = int(row["recency"])
                segment.frequency = int(row["frequency"])
                segment.monetary = float(row["monetary"])
            else:
                session.add(CustomerSegment(
                    customer_id=row["Customer ID"],
                    parent_behavior=row["kmeans_behavior"],
                    sub_segment=row["rfm_segment"],
                    recency=int(row["recency"]),
                    frequency=int(row["frequency"]),
                    monetary=float(row["monetary"])
                ))

        session.commit()

    finally:
        session.close()


def get_customer_segements_by_rfm(session: Session):
    segments = session.query(CustomerSegment).all()

    return [
        {
            "customer_id": s.customer_id,
            "parent_cluster": {
                "behavior": s.parent_behavior
            },
            "sub_cluster": {
                "segment": s.sub_segment
            },
            "metrics": {
                "recency": s.recency,
                "frequency": s.frequency,
                "monetary": float(s.monetary)
            }
        }
        for s in segments
    ]


def get_customer_segment_by_rfm_id(session: Session, customer_id: int):
    s = session.query(CustomerSegment).filter(CustomerSegment.customer_id == customer_id).first()
    if not s:
        return None

    return {
        "customer_id": s.customer_id,
        "parent_cluster": {
            "behavior": s.parent_behavior
        },
        "sub_cluster": {
            "segment": s.sub_segment
        },
        "metrics": {
            "recency": s.recency,
            "frequency": s.frequency,
            "monetary": float(s.monetary)
        }
    }

def generate_segements_by_catagory_preference(session: Session, lambda_decay=0.03):
    transactions = get_all_transactions()
    if not transactions:
        return []

    transactions_df = pd.DataFrame([{
        "TransactionID": t.transaction_id,
        "InvoiceNo": t.invoice_no,
        "InvoiceDate": t.transaction_date,
        "Customer ID": t.customer_id,
        "ProductID": t.product_id,
        "ProductCategory": t.product_category,
        "Quantity": float(t.quantity),
        "Price": float(t.unit_price),
        "TotalPrice": float(t.total_amount)
    } for t in transactions])

    transactions_df = transactions_df.copy()
    transactions_df["InvoiceDate"] = pd.to_datetime(transactions_df["InvoiceDate"])

    latest_date = transactions_df["InvoiceDate"].max()
    transactions_df["days_ago"] = (latest_date - transactions_df["InvoiceDate"]).dt.days
    transactions_df["decay_weight"] = np.exp(-lambda_decay * transactions_df["days_ago"])
    transactions_df["weighted_price"] = transactions_df["TotalPrice"] * transactions_df["decay_weight"]

    results = []

    for customer_id, group in transactions_df.groupby("Customer ID"):
        category_sum = (
            group.groupby("ProductCategory")["weighted_price"]
            .sum()
            .sort_values(ascending=False)
        )

        probabilities = category_sum / category_sum.sum()

        customer_result = {
            "customer_id": int(customer_id),
            "preferred_category": probabilities.idxmax(),
            "ratio": round(float(probabilities.max()), 4),
            "top_categories": probabilities.head(3).index.tolist(),
            "category_contributions": probabilities.round(4).to_dict()
        }

        results.append(customer_result)

        pref = session.query(CustomerCategoryPreference).filter_by(
            customer_id=customer_id
        ).first()

        top_categories_str = ",".join(customer_result["top_categories"])

        if pref:
            pref.preferred_category = customer_result["preferred_category"]
            pref.ratio = customer_result["ratio"]
            pref.top_categories = top_categories_str
        else:
            pref = CustomerCategoryPreference(
                customer_id=customer_id,
                preferred_category=customer_result["preferred_category"],
                ratio=customer_result["ratio"],
                top_categories=top_categories_str
            )
            session.add(pref)
            session.flush()  # ensure customer_id available

        # Delete old contributions
        session.query(CustomerCategoryContribution).filter_by(
            customer_id=customer_id
        ).delete()

        # Insert new contributions
        contributions = [
            CustomerCategoryContribution(
                customer_id=customer_id,
                category=cat,
                contribution=val
            )
            for cat, val in customer_result["category_contributions"].items()
        ]
        session.add_all(contributions)

    session.commit()
    return results

def get_customer_segements_by_category_preference(session: Session):
    customers = session.query(CustomerCategoryPreference).all()
    result = []

    for customer in customers:
        contributions = {
            contrib.category: float(contrib.contribution)
            for contrib in customer.contributions
        }

        top_categories = sorted(
            contributions, key=lambda k: contributions[k], reverse=True
        )[:3]

        result.append({
            "customer_id": customer.customer_id,
            "preferred_category": customer.preferred_category,
            "ratio": float(customer.ratio),
            "top_categories": top_categories,
            "category_contributions": contributions
        })

    return result

def get_customer_segment_profile_by_rfm_and_category(db: Session):
    rfm_segments = {
        s.customer_id: s
        for s in db.query(CustomerSegment).all()
    }

    # Fetch category preferences
    category_prefs = {
        c.customer_id: c
        for c in db.query(CustomerCategoryPreference).all()
    }

    # Fetch category contributions
    contributions = db.query(CustomerCategoryContribution).all()

    contributions_map = {}
    for c in contributions:
        contributions_map.setdefault(c.customer_id, {})
        contributions_map[c.customer_id][c.category] = float(c.contribution)

    profiles = []

    # Union of customer IDs
    customer_ids = set(rfm_segments.keys()) | set(category_prefs.keys())

    for customer_id in customer_ids:
        rfm = rfm_segments.get(customer_id)
        cat = category_prefs.get(customer_id)

        profiles.append({
            "customer_id": customer_id,

            "rfm": None if not rfm else {
                "parent_cluster": {
                    "behavior": rfm.parent_behavior
                },
                "sub_cluster": {
                    "segment": rfm.sub_segment
                },
                "metrics": {
                    "recency": rfm.recency,
                    "frequency": rfm.frequency,
                    "monetary": float(rfm.monetary)
                }
            },

            "category_preference": None if not cat else {
                "preferred_category": cat.preferred_category,
                "ratio": float(cat.ratio),
                "top_categories": (
                    cat.top_categories.split(",")
                    if cat.top_categories else []
                ),
                "category_contributions": contributions_map.get(customer_id, {})
            }
        })

    return profiles