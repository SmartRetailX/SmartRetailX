from fastapi import FastAPI
from app.db.session import engine
from app.routers import customer_segments
from fastapi.middleware.cors import CORSMiddleware
from app.models.customer_segment import CustomerSegment
from app.models.customer_category import CustomerCategoryContribution, CustomerCategoryPreference

CustomerSegment.metadata.create_all(bind=engine)
CustomerCategoryPreference.metadata.create_all(bind=engine)
CustomerCategoryContribution.metadata.create_all(bind=engine)

app = FastAPI(title="Customer Behavioral Segmentation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customer_segments.router)
