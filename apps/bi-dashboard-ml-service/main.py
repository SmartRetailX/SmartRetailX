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

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import services (will be created)
from api.forecast_service import ForecastService
from api.xai_service import XAIService
from api.alert_generator import AlertGenerator

# Initialize FastAPI app
app = FastAPI(
    title="Smart RetailX ML API",
    description="AI-powered forecasting and XAI service for retail analytics",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
forecast_service = ForecastService()
xai_service = XAIService()
alert_generator = AlertGenerator()


# ==================== REQUEST/RESPONSE MODELS ====================

class ForecastRequest(BaseModel):
    productId: str
    horizon: int = 30
    lang: str = "en"

class ForecastResponse(BaseModel):
    success: bool
    data: Dict[str, Any]

class ExplainRequest(BaseModel):
    productId: str
    date: Optional[str] = None
    lang: str = "en"

class RetrainRequest(BaseModel):
    productId: Optional[str] = None


# ==================== HEALTH CHECK ====================

@app.get("/")
async def root():
    return {
        "service": "Smart RetailX ML API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "forecast": "/api/v1/forecast",
            "explain": "/api/v1/explain",
            "restock": "/api/v1/restock",
            "retrain": "/api/v1/retrain",
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": forecast_service.is_model_loaded(),
    }


# ==================== FORECAST ENDPOINTS ====================

@app.post("/api/v1/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """
    Generate sales forecast using Prophet/XGBoost
    """
    try:
        print(f"\n=== Forecast Request ===")
        print(f"Product ID: {request.productId}")
        print(f"Horizon: {request.horizon}")
        print(f"Language: {request.lang}")
        
        forecast = await forecast_service.predict(
            product_id=request.productId,
            horizon=request.horizon,
            lang=request.lang
        )
        print(f"[OK] Forecast generated successfully")
        return ForecastResponse(success=True, data=forecast)
    except ValueError as e:
        # Product/Store not found
        print(f"[ERROR] ValueError: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        # Data file not found - model needs training
        print(f"[ERROR] FileNotFoundError: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        import traceback
        print(f"\n=== ERROR in generate_forecast ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error: {e}")
        print(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== XAI EXPLANATION ENDPOINTS ====================

@app.post("/api/v1/explain/forecast")
async def explain_forecast(request: ExplainRequest):
    """
    Get SHAP explanations for forecast predictions
    """
    try:
        print(f"\n=== XAI SHAP Analysis ===")
        print(f"Product: {request.productId}")
        
        explanation = await xai_service.explain_forecast(
            product_id=request.productId,
            date=request.date,
            lang=request.lang
        )
        print(f"[OK] XAI explanation generated successfully")
        return {"success": True, "data": explanation}
    except ValueError as e:
        print(f"[ERROR] ValueError: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        print(f"[ERROR] FileNotFoundError: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        import traceback
        print(f"\n=== ERROR in explain_forecast ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error: {e}")
        print(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/explain/restock")
async def explain_restock(alert_id: str, lang: str = "en"):
    """
    Get explanations for restock recommendations
    """
    try:
        explanation = await xai_service.explain_restock(alert_id, lang)
        return {"success": True, "data": explanation}
    except Exception as e:
        import traceback
        print(f"ERROR in explain_restock: {str(e)}")
        print(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))



# ==================== ALERT GENERATION ====================

@app.post("/api/v1/alerts/generate")
async def generate_alerts():
    """
    Analyze all products and generate restock alerts
    This should be called by a scheduled job (hourly/daily)
    """
    try:
        print(f"\n=== Alert Generation Triggered ===")
        alerts = await alert_generator.analyze_all_products()
        
        return {
            "success": True,
            "data": {
                "alertsGenerated": len(alerts),
                "alerts": alerts,
                "timestamp": datetime.now().isoformat()
            }
        }
    except Exception as e:
        import traceback
        print(f"ERROR in generate_alerts: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/alerts/analyze-product")
async def analyze_product_for_alert(product_id: str):
    """
    Analyze a specific product and check if alert is needed
    """
    try:
        result = await alert_generator.analyze_product_alert(product_id)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MODEL MANAGEMENT ====================

@app.post("/api/v1/retrain")
async def retrain_models(request: RetrainRequest):
    """
    Retrain ML models with latest data
    """
    try:
        result = await forecast_service.retrain(
            product_id=request.productId
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== RUN SERVER ====================

if __name__ == "__main__":
    port = int(os.getenv("ML_SERVICE_PORT", 8000))
    host = os.getenv("ML_SERVICE_HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
