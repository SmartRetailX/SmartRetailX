"""
FastAPI application for the Personalized Promotion Engine.
Loads ML models and exposes REST API endpoints.
"""

import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add parent dir so we can import models/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import get_customers, get_products, get_transactions, get_promotions
from api.routes.campaigns import router as campaigns_router
from api.routes.customer_promotions import router as customer_promotions_router
from api.routes.product_suggestions import router as product_suggestions_router

# Global state — shared with routes
app_state = {
    "engine": None,
    "preprocessor": None,
    "ready": False,
}


def load_data_from_db(preprocessor):
    """Override DataPreprocessor's CSV loading with database loading."""
    print("Loading data from PostgreSQL (pe_* tables)...")

    preprocessor.customers = get_customers()
    preprocessor.products = get_products()
    preprocessor.transactions = get_transactions()
    preprocessor.promotions = get_promotions()

    # Convert dates
    preprocessor.transactions['TransactionDate'] = pd.to_datetime(
        preprocessor.transactions['TransactionDate']
    )
    preprocessor.customers['RegistrationDate'] = pd.to_datetime(
        preprocessor.customers['RegistrationDate']
    )

    # Fit category encoder
    preprocessor.category_encoder.fit(preprocessor.products['Category'].unique())

    print(f"  Customers: {len(preprocessor.customers)}")
    print(f"  Products:  {len(preprocessor.products)}")
    print(f"  Transactions: {len(preprocessor.transactions)}")
    print(f"  Promotions: {len(preprocessor.promotions)}")
    print(f"  Categories: {list(preprocessor.category_encoder.classes_)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models and data on startup."""
    import pandas as pd

    print("=" * 60)
    print(" Starting Promotion Engine API...")
    print("=" * 60)

    try:
        from data_analysis.preprocessing import DataPreprocessor
        from models.promotion_engine import PersonalizedPromotionEngine

        # 1. Create preprocessor and load from DB
        preprocessor = DataPreprocessor(data_dir='')
        load_data_from_db(preprocessor)
        app_state["preprocessor"] = preprocessor

        # 2. Create engine and manually load models (NOT engine.load_models()
        #    because that creates a new DataPreprocessor from CSV which fails)
        models_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'models'
        )
        engine = PersonalizedPromotionEngine(models_dir=models_dir)
        engine.preprocessor = preprocessor

        # Manually load the trained .pkl models
        from models.purchase_prediction import PurchasePredictionModel
        from models.collaborative_filtering import CollaborativeFilteringModel
        from models.promotion_optimizer import PromotionOptimizer

        pp_path = os.path.join(models_dir, 'purchase_prediction_model.pkl')
        cf_path = os.path.join(models_dir, 'collaborative_filtering_model.pkl')

        if os.path.exists(pp_path):
            engine.purchase_model = PurchasePredictionModel.load_model(pp_path)
            print(f"  [OK] Purchase prediction model loaded")
        else:
            print(f"  [MISSING] purchase_prediction_model.pkl not found at {pp_path}")

        if os.path.exists(cf_path):
            engine.cf_model = CollaborativeFilteringModel.load_model(cf_path)
            print(f"  [OK] Collaborative filtering model loaded")
        else:
            print(f"  [MISSING] collaborative_filtering_model.pkl not found at {cf_path}")

        engine.optimizer = PromotionOptimizer()

        app_state["engine"] = engine
        app_state["ready"] = True

        print("\n[OK] Promotion Engine API ready!")

    except Exception as e:
        print(f"\n[ERROR] Failed to load: {e}")
        import traceback
        traceback.print_exc()

    yield
    print("Shutting down Promotion Engine API...")


# Need pandas import at module level for load_data_from_db
import pandas as pd

app = FastAPI(
    title="Personalized Promotion Engine API",
    description="ML-powered customer targeting for promotions",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(campaigns_router, prefix="/api")
app.include_router(customer_promotions_router, prefix="/api")
app.include_router(product_suggestions_router, prefix="/api")


@app.get("/health")
async def health():
    return {
        "status": "healthy" if app_state["ready"] else "loading",
        "models_loaded": app_state["ready"],
    }
