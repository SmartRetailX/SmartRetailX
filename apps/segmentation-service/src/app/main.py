from fastapi import FastAPI
from app.db.session import engine
from app.routers import customer_segments, loyalty_tiers
from fastapi.middleware.cors import CORSMiddleware
from app.models.customer_loyalty import CustomerLoyalty
from app.models.customer_segment import CustomerSegment
from app.models.customer_category import CustomerCategoryContribution, CustomerCategoryPreference
from sqlalchemy.exc import OperationalError
import time

app = FastAPI(title="Customer Behavioral Segmentation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customer_segments.router)
app.include_router(loyalty_tiers.router)


@app.on_event("startup")
def initialize_database() -> None:
    max_attempts = 12
    retry_delay_seconds = 5

    for attempt in range(1, max_attempts + 1):
        try:
            CustomerLoyalty.metadata.create_all(bind=engine)
            CustomerSegment.metadata.create_all(bind=engine)
            CustomerCategoryPreference.metadata.create_all(bind=engine)
            CustomerCategoryContribution.metadata.create_all(bind=engine)
            return
        except OperationalError:
            if attempt == max_attempts:
                raise
            time.sleep(retry_delay_seconds)
