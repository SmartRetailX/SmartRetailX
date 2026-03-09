from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.customer_segmentation_service import generate_segements_by_catagory_preference, generate_segments_by_rfm, get_customer_segements_by_category_preference, get_customer_segements_by_rfm, get_customer_segment_by_rfm_id, get_customer_segment_profile_by_rfm_and_category

router = APIRouter(prefix="/segments", tags=["Customer Segmentation"])

@router.post("/rfm")
def generate_customer_segments(db: Session = Depends(get_db)):
    generate_segments_by_rfm(db)
    return {"status": "success"}

@router.post("/category")
def generate_customer_segments(db: Session = Depends(get_db)):
    generate_segements_by_catagory_preference(db)
    return {"status": "success"}

@router.get("/rfm")
def get_customer_segments(db: Session = Depends(get_db)):
    return get_customer_segements_by_rfm(db)

@router.get("/rfm/{customer_id}")
def get_customer_segment_by_id(customer_id: int, db: Session = Depends(get_db)):
    segment = get_customer_segment_by_rfm_id(db, customer_id)
    if not segment:
        raise HTTPException(status_code=404, detail="Customer segment not found")
    return segment

@router.get("/category")
def get_customer_segments(db: Session = Depends(get_db)):
    return get_customer_segements_by_category_preference(db)

@router.get("/profiles")
def get_customer_segment_profiles(db: Session = Depends(get_db)):
    return get_customer_segment_profile_by_rfm_and_category(db)