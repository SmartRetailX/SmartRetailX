"""
Smart RetailX ML Service
FastAPI service for AI forecasting and XAI explanations
"""

import sys
import io

# Force UTF-8 output to prevent charmap errors with emoji on Windows
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'buffer'):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

from api.forecast_service import ForecastService
from api.xai_service import XAIService
from api.alert_generator import AlertGenerator


# ── Lifespan (replaces deprecated @app.on_event) ────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown logic."""
    print("\n=== Smart RetailX ML Service starting ===")
    print(f"MODEL_PATH : {os.getenv('MODEL_PATH', './models')}")
    print(f"DATABASE   : {'configured' if os.getenv('DATABASE_URL') else 'NOT configured'}")
    yield
    print("\n=== Smart RetailX ML Service stopped ===")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Smart RetailX ML API",
    description="AI-powered forecasting and XAI service for retail analytics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Service singletons ────────────────────────────────────────────────────────

forecast_service = ForecastService()
xai_service      = XAIService()
alert_generator  = AlertGenerator()


# ── Request / Response models ─────────────────────────────────────────────────

class ForecastRequest(BaseModel):
    productId: str
    horizon:   int  = Field(default=30, ge=1, le=365)
    lang:      str  = Field(default="en", pattern="^(en|si)$")


class ForecastResponse(BaseModel):
    success: bool
    data:    Dict[str, Any]


class ExplainForecastRequest(BaseModel):
    productId: str
    date:      Optional[str] = None   # ISO date string, e.g. "2025-06-01"
    lang:      str = Field(default="en", pattern="^(en|si)$")


class ExplainRestockRequest(BaseModel):
    alertId: str
    lang:    str = Field(default="en", pattern="^(en|si)$")


class RetrainRequest(BaseModel):
    productId: Optional[str] = None


class AnalyzeProductRequest(BaseModel):
    productId: str


# ── Health / root ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "Smart RetailX ML API",
        "version": "1.0.0",
        "status":  "running",
        "endpoints": {
            "forecast":       "POST /api/v1/forecast",
            "explain":        "POST /api/v1/explain/forecast",
            "explainRestock": "POST /api/v1/explain/restock",
            "alerts":         "POST /api/v1/alerts/generate",
            "analyzeProduct": "POST /api/v1/alerts/analyze-product",
            "modelStatus":    "GET  /api/v1/models/status",
            "retrain":        "POST /api/v1/retrain",
        },
    }


@app.get("/health")
async def health_check():
    return {
        "status":        "healthy",
        "timestamp":     datetime.now().isoformat(),
        "models_loaded": forecast_service.is_model_loaded(),
    }


# ── Model status ──────────────────────────────────────────────────────────────

@app.get("/api/v1/models/status")
async def model_status():
    """
    List which product models are available on disk.
    Useful for debugging / admin without touching the DB.
    """
    model_path = os.getenv("MODEL_PATH", "./models")
    if not os.path.isdir(model_path):
        return {"success": True, "data": {"modelPath": model_path, "models": []}}

    files = os.listdir(model_path)
    # Collect product IDs that have at least a Prophet model
    products_with_prophet  = {f.replace("_prophet.pkl",  "") for f in files if f.endswith("_prophet.pkl")}
    products_with_xgboost  = {f.replace("_xgboost.pkl",  "") for f in files if f.endswith("_xgboost.pkl")}
    products_with_metadata = {f.replace("_metadata.pkl", "") for f in files if f.endswith("_metadata.pkl")}

    all_products = sorted(products_with_prophet | products_with_xgboost)
    models = [
        {
            "productId": pid,
            "prophet":   pid in products_with_prophet,
            "xgboost":   pid in products_with_xgboost,
            "metadata":  pid in products_with_metadata,
        }
        for pid in all_products
    ]

    return {
        "success": True,
        "data": {
            "modelPath":   model_path,
            "totalModels": len(all_products),
            "models":      models,
        },
    }


# ── Forecast ──────────────────────────────────────────────────────────────────

@app.post("/api/v1/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """Generate a sales forecast using pre-trained Prophet + XGBoost models."""
    try:
        print(f"\n=== Forecast Request ===")
        print(f"Product : {request.productId}  |  Horizon: {request.horizon}  |  Lang: {request.lang}")

        forecast = await forecast_service.predict(
            product_id=request.productId,
            horizon=request.horizon,
            lang=request.lang,
        )
        print("[OK] Forecast generated")
        return ForecastResponse(success=True, data=forecast)

    except FileNotFoundError as exc:
        print(f"[ERROR] Model not found: {exc}")
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        print(f"[ERROR] Bad request: {exc}")
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        import traceback
        print(f"[ERROR] {type(exc).__name__}: {exc}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(exc))


# ── XAI explanations ──────────────────────────────────────────────────────────

@app.post("/api/v1/explain/forecast")
async def explain_forecast(request: ExplainForecastRequest):
    """Get SHAP-based explanations for a product's forecast."""
    try:
        print(f"\n=== XAI SHAP — Forecast ===")
        print(f"Product : {request.productId}  |  Date: {request.date}  |  Lang: {request.lang}")

        explanation = await xai_service.explain_forecast(
            product_id=request.productId,
            date=request.date,
            lang=request.lang,
        )
        print("[OK] XAI forecast explanation generated")
        return {"success": True, "data": explanation}

    except FileNotFoundError as exc:
        print(f"[ERROR] Model not found: {exc}")
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        print(f"[ERROR] Bad request: {exc}")
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        import traceback
        print(f"[ERROR] {type(exc).__name__}: {exc}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/explain/restock")
async def explain_restock(request: ExplainRestockRequest):
    """
    Get SHAP-based explanations for a restock recommendation.

    Body:
        alertId  – the alert UUID generated by /api/v1/alerts/generate
        lang     – "en" (default) or "si"
    """
    try:
        print(f"\n=== XAI SHAP — Restock ===")
        print(f"Alert : {request.alertId}  |  Lang: {request.lang}")

        explanation = await xai_service.explain_restock(
            alert_id=request.alertId,
            lang=request.lang,
        )
        print("[OK] XAI restock explanation generated")
        return {"success": True, "data": explanation}

    except Exception as exc:
        import traceback
        print(f"[ERROR] {type(exc).__name__}: {exc}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Alert generation ──────────────────────────────────────────────────────────

@app.post("/api/v1/alerts/generate")
async def generate_alerts():
    """
    Analyse all products and generate restock alerts.
    Intended to be triggered by a scheduler (hourly / daily cron).
    """
    try:
        print("\n=== Alert Generation Triggered ===")
        alerts = await alert_generator.analyze_all_products()
        return {
            "success": True,
            "data": {
                "alertsGenerated": len(alerts),
                "alerts":          alerts,
                "timestamp":       datetime.now().isoformat(),
            },
        }
    except Exception as exc:
        import traceback
        print(f"[ERROR] {type(exc).__name__}: {exc}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/alerts/analyze-product")
async def analyze_product_for_alert(request: AnalyzeProductRequest):
    """
    Analyse a single product (by DB UUID) and return an alert if stock is insufficient.
    """
    try:
        result = await alert_generator.analyze_product_alert(request.productId)
        return {"success": True, "data": result}
    except Exception as exc:
        import traceback
        print(f"[ERROR] {type(exc).__name__}: {exc}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Model management ──────────────────────────────────────────────────────────

@app.post("/api/v1/retrain")
async def retrain_models(request: RetrainRequest):
    """
    Trigger model retraining.
    NOTE: actual training must be run via `python train_model.py`;
    this endpoint returns the guidance message from ForecastService.
    """
    try:
        result = await forecast_service.retrain(product_id=request.productId)
        return {"success": True, "data": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("ML_SERVICE_PORT", 8000))
    host = os.getenv("ML_SERVICE_HOST", "0.0.0.0")

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info",
    )