from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import shutil
from fastapi.responses import StreamingResponse, FileResponse
import io
import csv
import json
import hashlib
import hmac
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from playwright.async_api import async_playwright
from jinja2 import Template
import tempfile
import jwt
from jwt import InvalidTokenError, ExpiredSignatureError
from bson import ObjectId

def serialize_mongo(doc):
    if not doc:
        return doc
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
    return doc


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
SECRET_KEY = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
# Data Models
class Salesperson(BaseModel):
    name: str
    phone: str
    email: str
    photo: str

class Summary(BaseModel):
    duration: str
    travelers: int
    rating: float = 4.8
    highlights: List[str]

class Pricing(BaseModel):
    subtotal: float
    taxes: float
    discount: float
    total: float
    perPerson: float
    depositDue: float
    currency: str = "INR"

class Meals(BaseModel):
    breakfast: str
    lunch: str
    dinner: str

class Hotel(BaseModel):
    id: str
    name: str
    stars: int
    image: str
    address: str
    amenities: Optional[List[str]] = None

class ActivityPDF(BaseModel):
    id: str
    time: str
    title: str
    description: str
    image: Optional[str] = None
    meetingPoint: str
    type: str

class Day(BaseModel):
    dayNumber: int
    date: str
    location: str
    meals: Optional[Meals] = None
    hotel: Optional[Hotel] = None
    activities: List[ActivityPDF]

class GalleryItem(BaseModel):
    url: str
    caption: str

class Terms(BaseModel):
    cancellation: str
    payment: str
    insurance: str
    changes: str

class Testimonial(BaseModel):
    name: str
    rating: int
    text: str

class TransportLeg(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    leg_number: int
    transport_type: str  # flight, train, bus, cab, mini_bus, traveller
    from_location: str
    to_location: str
    departure_date: str
    departure_time: str
    arrival_date: Optional[str] = None
    arrival_time: Optional[str] = None
    vehicle_details: Optional[str] = None  # Flight number, Train number, Bus operator, etc.
    pickup_point: Optional[str] = None
    drop_point: Optional[str] = None
    cost: float = 0
    notes: Optional[str] = None
    catalog_item_id: Optional[str] = None

class HotelBooking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hotel_name: str
    location: str
    check_in_date: str
    check_out_date: str
    room_type: str
    number_of_rooms: int
    stars: Optional[int] = None
    amenities: Optional[List[str]] = None
    cost_per_night: float = 0
    total_nights: int = 0
    total_cost: float = 0
    image: Optional[str] = None
    catalog_item_id: Optional[str] = None

class VisaService(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    country: str
    visa_type: str
    processing_days: int
    cost: float
    documents_required: Optional[List[str]] = None
    notes: Optional[str] = None

class SightseeingService(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location: str
    date: str
    activities: List[str]
    cost: float
    notes: Optional[str] = None

class QuotationData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tripTitle: str
    city: str
    bookingRef: str
    start_date: str
    end_date: str
    coverImage: str
    
    # Service type flags (to determine what sections to show)
    is_holiday_package: bool = False
    is_mice: bool = False
    is_hotel_booking: bool = False
    is_sightseeing: bool = False
    is_visa: bool = False
    is_transport_service: bool = False
    
    # Data for different service types
    summary: Optional[Summary] = None
    pricing: Pricing
    days: Optional[List[Day]] = []  # For holiday packages
    transport_legs: Optional[List[TransportLeg]] = []  # For transport services
    hotel_bookings: Optional[List[HotelBooking]] = []  # For hotel bookings
    visa_services: Optional[List[VisaService]] = []  # For visa services
    sightseeing_services: Optional[List[SightseeingService]] = []  # For sightseeing
    
    inclusions: Optional[List[str]] = None
    exclusions: Optional[List[str]] = None

class UserRole(str, Enum):
    OPERATIONS = "operations"
    SALES = "sales"
    ACCOUNTANT = "accountant"
    CUSTOMER = "customer"
    ADMIN = "admin"

class RequestStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    QUOTED = "QUOTED"
    ACCEPTED = "ACCEPTED"
    PAID = "PAID"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CUSTOMERCANCELLED = "CANCELLATION REQUESTED"

class QuotationStatus(str, Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    RECEIVED_BY_ACCOUNTANT = "RECEIVED_BY_ACCOUNTANT"
    VERIFIED_BY_OPS = "VERIFIED_BY_OPS"
    CAPTURED = "CAPTURED"
    REJECTED = "REJECTED"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: UserRole
    phone: Optional[str] = None
    is_active: bool = True
    country_code: Optional[str] = "+91"  # Default to India
    can_see_cost_breakup: bool = False  # Admin can control cost breakup visibility for salespeople
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    deactivated_at: Optional[str] = None
    deactivated_by: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class QuotationVersion(BaseModel):
    status: str
    expiry_date: Optional[str] = None
    quotation_id: str
    advance_amount: float = 0.0
    total_amount: float = 0.0

class TravelRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: Optional[str] = None
    title: str
    people_count: int
    budget_min: float
    budget_max: float
    start_date: str
    end_date: str
    is_holiday_package_required: bool = False
    is_mice_required: bool = False
    is_hotel_booking_required: bool = False
    is_sight_seeing_required: bool = False
    is_visa_required: bool = False
    is_transport_within_city_required: bool = False
    is_transfer_to_destination_required: bool = False
    destination: str
    source: Optional[str] = None
    visa_citizenship: Optional[str] = None
    type_of_travel: Optional[List[str]] = None
    special_requirements: Optional[str] = None
    status: RequestStatus = RequestStatus.PENDING
    assigned_salesperson_id: Optional[str] = None
    quotations: Optional[List[QuotationVersion]] = []
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_salesperson_validated: bool = False

class LineItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "hotel", "transport", "activity", "meal"
    name: str
    supplier: Optional[str] = None
    unit_price: float
    quantity: int = 1
    tax_percent: float = 18.0
    markup_percent: float = 0.0
    total: float = 0.0
    is_manual_rate: bool = False

class QuotationOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str]  # "Option A", "Option B"
    line_item_ids: List[str] = []
    subtotal: float = 0.0
    tax_amount: float = 0.0
    total: float = 0.0
    is_recommended: bool = False


class CostBreakupItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    date: str
    quantity: int
    unit_cost: float

class Quotation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    status: QuotationStatus = QuotationStatus.DRAFT
    expiry_date: Optional[str] = None
    published_at: Optional[str] = None
    detailed_quotation_data: QuotationData
    cost_breakup: List[CostBreakupItem] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    quotation_id: str
    request_id: str
    client_name: str
    client_email: str
    client_country_code: str
    client_phone: str
    total_amount: float
    advance_amount: float
    status: str = "Verification Pending"  # "Verification Pending", "Paid", "Partially Paid", "Overdue", "Cancelled"
    gst_number: Optional[str] = "GST123456789"
    bank_details: Dict[str, str] = {
        "account_name": "Travel Company Pvt Ltd",
        "account_number": "1234567890",
        "ifsc": "BANK0001234",
        "bank_name": "Example Bank"
    }
    upi_id: Optional[str] = "travelcompany@upi"
    due_date: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: str
    amount: float
    method: str  # "bank_transfer", "upi", "card"
    status: PaymentStatus = PaymentStatus.PENDING
    received_at: Optional[str] = None
    verified_at: Optional[str] = None
    accountant_notes: Optional[str] = None
    ops_notes: Optional[str] = None
    proof_url: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_country_code: Optional[str] = None
    client_phone: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    type: str = "partial_payment"

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    message_text: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Activity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    actor_id: str
    actor_name: str
    actor_role: str
    action: str  # "created", "updated", "published", "accepted", etc.
    notes: Optional[str] = None
    attachment_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CatalogItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # "hotel", "transport", "activity", "meal"
    destination: str
    supplier: Optional[str] = None
    default_price: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    rating: Optional[int] = None  # For hotels: 1-5 stars
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    is_read: bool = False
    link: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Leave(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_role: str
    start_date: str  # ISO format date string (YYYY-MM-DD)
    end_date: str  # ISO format date string (YYYY-MM-DD)
    backup_user_id: str
    backup_user_name: str
    reason: Optional[str] = None
    status: str = "active"  # active, cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AdminSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    privacy_policy: str = ""
    terms_and_conditions: str = ""
    default_inclusions: List[str] = []
    default_exclusions: List[str] = []
    testimonials: List[Testimonial] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class QuoatationPDFData(BaseModel):
    tripTitle: str
    customerName: str
    dates: str
    city: str
    bookingRef: str
    coverImage: str
    salesperson: Salesperson
    summary: Summary
    pricing: Pricing
    days: List[Day]
    inclusions: Optional[List[str]] = None
    exclusions: Optional[List[str]] = None
    detailedTerms: Optional[str] = None
    privacyPolicy: Optional[str] = None
    testimonials: Optional[List[Testimonial]] = None

# Mock users for login
MOCK_USERS = {
    "ops@travel.com": {"password": "ops123", "role": UserRole.OPERATIONS, "name": "Operations Manager", "id": "ops-001", "can_see_cost_breakup": True},
    "sales@travel.com": {"password": "sales123", "role": UserRole.SALES, "name": "Sales Executive", "id": "sales-001", "can_see_cost_breakup": False},
    "accountant@travel.com": {"password": "acc123", "role": UserRole.ACCOUNTANT, "name": "Accountant", "id": "acc-001", "can_see_cost_breakup": True},
    "customer@travel.com": {"password": "customer123", "role": UserRole.CUSTOMER, "name": "John Customer", "id": "customer-001", "can_see_cost_breakup": False},
    "admin@travel.com": {"password": "admin123", "role": UserRole.ADMIN, "name": "Admin User", "id": "admin-001", "can_see_cost_breakup": True},
}

# Dependency to get current user from token
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def hash_password(password: str) -> str:
    salt = os.urandom(16)  # 128-bit salt
    pwd_bytes = password.encode("utf-8")

    hash_bytes = hashlib.pbkdf2_hmac(
        hash_name="sha256",
        password=pwd_bytes,
        salt=salt,
        iterations=200_000,
        dklen=32
    )

    return f"{salt.hex()}:{hash_bytes.hex()}"

def verify_password(password: str, stored_value: str) -> bool:
    salt_hex, hash_hex = stored_value.split(":")
    salt = bytes.fromhex(salt_hex)
    stored_hash = bytes.fromhex(hash_hex)

    pwd_bytes = password.encode("utf-8")

    new_hash = hashlib.pbkdf2_hmac(
        hash_name="sha256",
        password=pwd_bytes,
        salt=salt,
        iterations=200_000,
        dklen=32
    )

    return hmac.compare_digest(new_hash, stored_hash)

def create_access_token(
    user_id: int,
    email: str,
    name: str,
    role: str,
    can_see_cost_breakup: bool
) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "name": name,
        "role": role,
        "can_see_cost_breakup": can_see_cost_breakup,
        "iat": datetime.now(tz=timezone.utc),
        "exp": datetime.now(tz=timezone.utc) + timedelta(days=1),
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload

    except ExpiredSignatureError:
        raise ValueError("Token expired")
    except InvalidTokenError:
        raise ValueError("Invalid token")

# Auth endpoints
@api_router.post("/auth/register")
async def register_customer(user_data: Dict[str, str]):
    existing = await db.users.find_one({"email": user_data["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = {
        "id": str(uuid.uuid4()),
        "email": user_data["email"],
        "name": user_data["name"],
        "phone": user_data.get("phone", ""),
        "country_code": user_data.get("country_code", "+91"),
        "role": "customer",
        "password": hash_password(user_data["password"]),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    return {"success": True, "message": "Account created successfully"}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    existing = await db.users.find_one({"email": credentials.email})
    if existing and verify_password(credentials.password, existing["password"]):
        return {
            "success": True,
                "user": {
                    "id": existing["id"],
                    "email": credentials.email,
                    "name": existing["name"],
                    "role": existing["role"],
                    "can_see_cost_breakup": existing.get("can_see_cost_breakup", False)
                },
                "token": create_access_token(
                    user_id=existing["id"],
                    email=credentials.email,
                    name=existing["name"],
                    role=existing["role"],
                    can_see_cost_breakup=existing.get("can_see_cost_breakup", False)
                )
            }
    raise HTTPException(status_code=401, detail="Invalid credentials")

# Customer endpoints
@api_router.get("/customers/search")
async def search_customers(query: str):
    """
    Search for existing customers by name, email, or phone.
    Returns list of customers with id, name, email, phone, country_code.
    """
    if not query or len(query) < 2:
        return {"customers": []}
    
    # Create search pattern for MongoDB regex
    search_pattern = {"$regex": query, "$options": "i"}
    
    # Search by name, email, or phone
    search_query = {
        "role": "customer",
        "$or": [
            {"name": search_pattern},
            {"email": search_pattern},
            {"phone": search_pattern}
        ]
    }
    
    customers_cursor = db.users.find(search_query).limit(10)
    customers = await customers_cursor.to_list(length=10)
    
    # Format response
    result = []
    for customer in customers:
        result.append({
            "id": customer["id"],
            "name": customer["name"],
            "email": customer["email"],
            "phone": customer.get("phone", ""),
            "country_code": customer.get("country_code", "+91")
        })
    
    return {"customers": result}

@api_router.post("/customers/quick-create")
async def quick_create_customer(customer_data: Dict[str, str]):
    """
    Quick create a new customer.
    Generates a random password and saves to database.
    Returns the created customer object.
    """
    # Validate required fields
    if not all(key in customer_data for key in ["name", "email", "phone"]):
        raise HTTPException(status_code=400, detail="Missing required fields: name, email, phone")
    
    # Check if email already exists
    existing = await db.users.find_one({"email": customer_data["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate random password (8 characters)
    import random
    import string
    random_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    
    # Create new customer
    new_customer = {
        "id": str(uuid.uuid4()),
        "email": customer_data["email"],
        "name": customer_data["name"],
        "phone": customer_data["phone"],
        "country_code": customer_data.get("country_code", "+91"),
        "role": "customer",
        "password": hash_password(random_password),
        "can_see_cost_breakup": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_customer)
    
    # Return customer without password
    return {
        "success": True,
        "customer": {
            "id": new_customer["id"],
            "name": new_customer["name"],
            "email": new_customer["email"],
            "phone": new_customer["phone"],
            "country_code": new_customer["country_code"]
        },
        "message": f"Customer created successfully. Auto-generated password: {random_password}"
    }


# Request endpoints
@api_router.post("/requests", response_model=TravelRequest)
async def create_request(request: Dict[str, Any], current_user: Dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    role = current_user.get("role")

    newRequest = TravelRequest(
        client_id=user_id if role == UserRole.CUSTOMER else request.get("client_id"),
        title=request["title"],
        people_count=request["people_count"],
        budget_min=request["budget_min"],
        budget_max=request["budget_max"],
        start_date=request["start_date"],
        end_date=request["end_date"],
        is_holiday_package_required=request.get("is_holiday_package_required", False),
        is_mice_required=request.get("is_mice_required", False),
        is_hotel_booking_required=request.get("is_hotel_booking_required", False),
        is_visa_required=request.get("is_visa_required", False),
        is_transport_within_city_required=request.get("is_transport_within_city_required", False),
        is_sight_seeing_required=request.get("is_sight_seeing_required", False),
        is_transfer_to_destination_required=request.get("is_transfer_to_destination_required", False),
        destination=request.get("destination"),
        source=request.get("source"),
        visa_citizenship=request.get("visa_citizenship"),
        type_of_travel=request.get("type_of_travel"),
        special_requirements=request.get("special_requirements"),
        created_by=user_id,
        assigned_salesperson_id= user_id if role == UserRole.SALES else None
    )

    await db.requests.insert_one(newRequest.model_dump())

    
    # Create activity
    activity = Activity(
        request_id=newRequest.id,
        actor_id=current_user.get("sub"),
        actor_name=current_user.get("name", ""),
        actor_role=current_user.get("role", ""),
        action="created",
        notes=f"Request created for {newRequest.client_id}"
    )
    
    await db.activities.insert_one(activity.model_dump())

    return newRequest

@api_router.get("/requests", response_model=List[Any])
async def get_requests(status: Optional[str] = None, assigned_to: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    role = current_user.get("role")
    user_id = current_user.get("sub")
    query = {}
    if role == UserRole.CUSTOMER:
        query["client_id"] = user_id
        requests = await db.requests.find(query).sort("created_at", -1).to_list(1000)
        user_ids = set()

        for req in requests:
            if req.get("assigned_salesperson_id"):
                user_ids.add(req["assigned_salesperson_id"])
        users = await db.users.find(
            {"id": {"$in": list(user_ids)}}
        ).to_list(1000)

        user_map = {str(u["id"]): u for u in users}

        response = []

        for req in requests:
            salesperson = user_map.get(req.get("assigned_salesperson_id"))
            response.append(
                {
                    "id": str(req["id"]),
                    "title": req["title"],
                    "people_count": req["people_count"],
                    "budget_min": req["budget_min"],
                    "budget_max": req["budget_max"],
                    "start_date": req["start_date"],
                    "end_date": req["end_date"],
                    "source": req.get("source"),
                    "destination": req.get("destination"),
                    
                    "status": req["status"],
                    
                    # Service type fields
                    "is_holiday_package_required": req.get("is_holiday_package_required", False),
                    "is_mice_required": req.get("is_mice_required", False),
                    "is_hotel_booking_required": req.get("is_hotel_booking_required", False),
                    "is_sight_seeing_required": req.get("is_sight_seeing_required", False),
                    "is_visa_required": req.get("is_visa_required", False),
                    "is_transport_within_city_required": req.get("is_transport_within_city_required", False),
                    "is_transfer_to_destination_required": req.get("is_transfer_to_destination_required", False),

                    "assigned_salesperson_name": (
                        salesperson["name"] if salesperson else "Not Assigned Yet"
                    ),

                    "created_by": req["created_by"],
                    "created_at": req["created_at"],
                }
            )

        return response
    elif role == UserRole.SALES:
        query["assigned_salesperson_id"] = user_id
        requests = await db.requests.find(query).sort("created_at", -1).to_list(1000)
        user_ids = set()

        for req in requests:
            if req.get("client_id"):
                user_ids.add(req["client_id"])
            if req.get("assigned_salesperson_id"):
                user_ids.add(req["assigned_salesperson_id"])
        users = await db.users.find(
            {"id": {"$in": list(user_ids)}}
        ).to_list(1000)

        user_map = {str(u["id"]): u for u in users}

        response = []

        for req in requests:
            client_id = req.get("client_id")
            if not client_id:
                continue
            client = user_map.get(client_id)
            salesperson = user_map.get(req.get("assigned_salesperson_id"))

            response.append(
                {
                    "id": str(req["id"]),
                    "title": req["title"],
                    "people_count": req["people_count"],
                    "budget_min": req["budget_min"],
                    "budget_max": req["budget_max"],
                    "start_date": req["start_date"],
                    "end_date": req["end_date"],
                    "destination": req.get("destination"),
                    "status": req["status"],
                    "client_name": client["name"] if client else "Unknown Client",
                    "client_email": client["email"],
                    "client_phone": client["phone"],
                    "client_country_code": client["country_code"],
                    "assigned_salesperson_name": (
                        salesperson["name"] if salesperson else "Not Assigned Yet"
                    ),
                    "created_by": req["created_by"],
                    "created_at": req["created_at"],
                    "is_salesperson_validated": req.get("is_salesperson_validated", False),
                    "is_holiday_package_required": req.get("is_holiday_package_required", False),
                    "is_mice_required": req.get("is_mice_required", False),
                    "is_hotel_booking_required": req.get("is_hotel_booking_required", False),
                    "is_sight_seeing_required": req.get("is_sight_seeing_required", False),
                    "is_visa_required": req.get("is_visa_required", False),
                    "is_transport_within_city_required": req.get("is_transport_within_city_required", False),
                    "is_transfer_to_destination_required": req.get("is_transfer_to_destination_required", False),
                    "source": req.get("source"),
                    "visa_citizenship": req.get("visa_citizenship"),
                    "type_of_travel": req.get("type_of_travel"),
                    "special_requirements": req.get("special_requirements")
                }    
            )

        return response
    elif role == UserRole.OPERATIONS:
        query["assigned_operation_id"] = user_id
        requests = await db.requests.find(query).sort("created_at", -1).to_list(1000)
        user_ids = set()

        for req in requests:
            if req.get("client_id"):
                user_ids.add(req["client_id"])
            if req.get("assigned_salesperson_id"):
                user_ids.add(req["assigned_salesperson_id"])
        users = await db.users.find(
            {"id": {"$in": list(user_ids)}}
        ).to_list(1000)

        user_map = {str(u["id"]): u for u in users}

        response = []

        for req in requests:
            client = user_map.get(req.get("client_id"))
            salesperson = user_map.get(req.get("assigned_salesperson_id"))

            response.append(
                {
                    "id": str(req["id"]),
                    "title": req["title"],
                    "people_count": req["people_count"],
                    "budget_min": req["budget_min"],
                    "budget_max": req["budget_max"],
                    "start_date": req["start_date"],
                    "end_date": req["end_date"],
                    "destination": req.get("destination"),
                    "status": req["status"],
                    "client_name": client["name"] if client else "Unknown Client",
                    "client_email": client["email"],
                    "client_phone": client["phone"],
                    "client_country_code": client["country_code"],
                    "assigned_salesperson_name": (
                        salesperson["name"] if salesperson else "Not Assigned Yet"
                    ),
                    "created_by": req["created_by"],
                    "created_at": req["created_at"],
                    "is_salesperson_validated": req.get("is_salesperson_validated", False),}
            )

        return response
    else:
        query = {}
    requests = await db.requests.find(query).sort("created_at", -1).to_list(1000)
    return [TravelRequest(**req) for req in requests]

@api_router.get("/requests/delegated")
async def get_delegated_requests(current_user: Dict = Depends(get_current_user)):
    # Find all active leaves where current user is backup
    today = datetime.now(timezone.utc).date().isoformat()
    
    backup_leaves = await db.leaves.find({
        "backup_user_id": current_user["sub"],
        "status": "active",
        "start_date": {"$lte": today},
        "end_date": {"$gte": today}
    }).to_list(1000)
    
    delegated_user_ids = []
    for leave in backup_leaves:
        delegated_user_ids.append(leave["user_id"])
        chain_leaves = await db.leaves.find({
            "backup_user_id": leave["user_id"],
            "status": "active",
            "start_date": {"$lte": today},
            "end_date": {"$gte": today}
        }).to_list(1000)
        
        for chain_leave in chain_leaves:
            delegated_user_ids.append(chain_leave["user_id"])
    
    # Get requests from all delegated users
    if not delegated_user_ids:
        return []
    
    role = current_user.get("role")
    
    if role == UserRole.SALES:
        global query
        query = {
            "assigned_salesperson_id": {"$in": delegated_user_ids},
            "status": {"$in": [RequestStatus.PENDING, RequestStatus.QUOTED]}
        }
    elif role == UserRole.OPERATIONS:
        query = {
            "assigned_operation_id": {"$in": delegated_user_ids},
            "status": {"$in": [RequestStatus.PENDING, RequestStatus.QUOTED]}
        }

    requests = await db.requests.find(query).sort("created_at", -1).to_list(1000)

    user_ids = set()
    for req in requests:
        if req.get("client_id"):
            user_ids.add(req["client_id"])
        if req.get("assigned_salesperson_id"):
            user_ids.add(req["assigned_salesperson_id"])

    users = await db.users.find(
        {"id": {"$in": list(user_ids)}}
    ).to_list(1000)

    user_map = {str(u["id"]): u for u in users}
    
    # Add delegation info to each request
    result = []
    for req in requests:
        client = user_map.get(req.get("client_id"))
        salesperson = user_map.get(req.get("assigned_salesperson_id"))
        result.append(
            TravelRequest(
                id=str(req["id"]),
                title=req["title"],
                people_count=req["people_count"],
                budget_min=req["budget_min"],
                budget_max=req["budget_max"],
                preferred_dates=req["preferred_dates"],
                destination=req.get("destination") if req.get("destination") else req.get("travel_vibe"),
                status=req["status"],

                client_name=client["name"] if client else "Unknown Client",
                client_email=client["email"],
                client_phone=client["phone"],
                client_country_code=client["country_code"],
                
                # Service type fields
                is_holiday_package_required=req.get("is_holiday_package_required", False),
                is_mice_required=req.get("is_mice_required", False),
                is_hotel_booking_required=req.get("is_hotel_booking_required", False),
                is_sight_seeing_required=req.get("is_sight_seeing_required", False),
                is_visa_required=req.get("is_visa_required", False),
                is_transport_within_city_required=req.get("is_transport_within_city_required", False),
                is_transfer_to_destination_required=req.get("is_transfer_to_destination_required", False),

                assigned_salesperson_name=(
                    salesperson["name"] if salesperson else "Not Assigned Yet"
                ),

                created_by=req["created_by"],
                created_at=req["created_at"],
                updated_at=req["updated_at"],
            )
        )
    
    return result

@api_router.get("/requests/{request_id}")
async def get_request(request_id: str, current_user: Dict = Depends(get_current_user)):
    request = await db.requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    client = await db.users.find_one({"id": request.get("client_id")})
    if client:
        request["client_name"] = client["name"]
        request["client_email"] = client["email"]
        request["client_phone"] = client.get("phone", "")
        request["client_country_code"] = client.get("country_code", "+91")

    # Format dates for display
    if request.get("start_date") and request.get("end_date"):
        try:
            start = datetime.fromisoformat(request["start_date"].replace('Z', '+00:00'))
            end = datetime.fromisoformat(request["end_date"].replace('Z', '+00:00'))
            request["preferred_dates"] = f"{start.strftime('%d %b %Y')} - {end.strftime('%d %b %Y')}"
        except:
            request["preferred_dates"] = f"{request.get('start_date', 'TBD')} - {request.get('end_date', 'TBD')}"
    else:
        request["preferred_dates"] = "TBD"

    filterQuotations = []
    if request["status"] == RequestStatus.ACCEPTED:
        acceptedQuotation = await db.quotations.find_one({"request_id": request_id, "status": QuotationStatus.ACCEPTED})
        if acceptedQuotation:
            filterQuotations = [{
                "status": acceptedQuotation["status"],
                "expiry_date": acceptedQuotation.get("expiry_date"),
                "quotation_id": acceptedQuotation["id"],
                "advance_amount": acceptedQuotation.get("detailed_quotation_data", {}).get("pricing", {}).get("depositDue", 0.0),
                "total_amount": acceptedQuotation.get("detailed_quotation_data", {}).get("pricing", {}).get("total", 0.0)
            }]
    else:
        if(current_user.get("role") == UserRole.OPERATIONS):
            global quotationsOptions
            quotationsOptions = await db.quotations.find({"request_id": request_id}).to_list(1000)
        elif(current_user.get("role") in [UserRole.SALES, UserRole.CUSTOMER] and (request.get("assigned_salesperson_id") == current_user.get("sub") or request.get("client_id") == current_user.get("sub"))):
            quotationsOptions = await db.quotations.find({"request_id": request_id, "status": QuotationStatus.SENT}).to_list(1000)
        else:
            raise HTTPException(status_code=403, detail="Not authorized to view this request")
        for quotation in quotationsOptions:
            filterQuotations.append({
                "status": quotation["status"],
                "expiry_date": quotation.get("expiry_date"),
                "quotation_id": quotation["id"],
                "advance_amount": quotation.get("detailed_quotation_data", {}).get("pricing", {}).get("depositDue", 0.0),
                "total_amount": quotation.get("detailed_quotation_data", {}).get("pricing", {}).get("total", 0.0)
            })
    request["quotations"] = filterQuotations
       
    return serialize_mongo(request)

@api_router.put("/requests/{request_id}", response_model=TravelRequest)
async def update_request(request_id: str, request: TravelRequest):
    request.updated_at = datetime.now(timezone.utc).isoformat()
    await db.requests.update_one({"id": request_id}, {"$set": request.dict()})
    return request

@api_router.post("/requests/{request_id}/validate")
async def validate_request(request_id: str, current_user: Dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    role = current_user.get("role")
    if role == UserRole.SALES:
        request = await db.requests.find_one({"id": request_id, "assigned_salesperson_id": user_id})
        if not request:
            raise HTTPException(status_code=403, detail="Not authorized to validate this request")
        else:
            await db.requests.update_one(
                {"id": request_id},
                {"$set": {
                    "is_salesperson_validated": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            # Create activity
            activity = Activity(
                request_id=request_id,
                actor_id=current_user.get("sub", ""),
                actor_name=current_user.get("name", ""),
                actor_role=current_user.get("role", ""),
                action="validated",
                notes="Request validated by salesperson"
            )
            await db.activities.insert_one(activity.model_dump())
            
            return {"success": True}
    
    raise HTTPException(status_code=403, detail="Only salespersons can validate requests")

@api_router.post("/requests/{request_id}/cancel")
async def cancel_request(request_id: str, data: Dict[str, Any], current_user: Dict = Depends(get_current_user)):
    await db.requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": RequestStatus.CUSTOMERCANCELLED,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create activity
    activity = Activity(
        request_id=request_id,
        actor_id=current_user.get("sub", ""),
        actor_name=current_user.get("name", ""),
        actor_role=current_user.get("role", ""),
        action="cancelled",
        notes=data.get("reason", data.get("reason", "Request cancelled"))
    )
    await db.activities.insert_one(activity.model_dump())
    
    return {"success": True}

@api_router.post("/requests/{request_id}/add-note")
async def add_request_note(request_id: str, data: Dict[str, Any]):
    # Create activity for communication
    activity = Activity(
        request_id=request_id,
        actor_id=data.get("actor_id", ""),
        actor_name=data.get("actor_name", ""),
        actor_role=data.get("actor_role", ""),
        action="added_note",
        notes=data.get("note", "")
    )
    await db.activities.insert_one(activity.dict())
    
    # Create notification for assigned person
    if data.get("notify_user_id"):
        notification = Notification(
            user_id=data["notify_user_id"],
            title="New Note on Request",
            message=f"{data.get('actor_name', 'Someone')} added a note: {data.get('note', '')}",
            link=f"/requests/{request_id}"
        )
        await db.notifications.insert_one(notification.dict())
    
    return {"success": True}

# New endpoint: Get open/unassigned requests
@api_router.get("/requests/open/list", response_model=List[TravelRequest])
async def get_open_requests(current_user: Dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    role = current_user.get("role")

    if role == UserRole.SALES:
        query = {
            "$or": [
                {"assigned_salesperson_id": None},
                {"assigned_salesperson_id": ""},
                {"assigned_salesperson_id": {"$exists": False}}
            ],
            "status": RequestStatus.PENDING
        }
    elif role == UserRole.OPERATIONS:
        query = {
            "$or": [
                {"assigned_operation_id": None},
                {"assigned_operation_id": ""},
                {"assigned_operation_id": {"$exists": False}}
            ],
            "status": RequestStatus.PENDING,
            "is_salesperson_validated": True
        }
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    
    requests = await db.requests.find(query).sort("created_at", -1).to_list(100)
    return [TravelRequest(**req) for req in requests]

# New endpoint: Assign request to salesperson
@api_router.post("/requests/{request_id}/assign-to-me")
async def assign_request_to_me(request_id: str, current_user: Dict = Depends(get_current_user)):
    """Assign a request to the current salesperson with limit validation"""
    user_id = current_user.get("sub")
    role = current_user.get("role")

    if role == UserRole.SALES:
        global query
        query = {"$set": {
            "assigned_salesperson_id": user_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    elif role == UserRole.OPERATIONS:
        query = {"$set": {
            "assigned_operation_id": user_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    request = await db.requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if role == UserRole.SALES:
        if request.get("assigned_salesperson_id"):
            raise HTTPException(status_code=400, detail="Request is already assigned")
    elif role == UserRole.OPERATIONS:
        if request.get("assigned_operation_id"):
            raise HTTPException(status_code=400, detail="Request is already assigned")

    # Assign the request
    await db.requests.update_one(
        {"id": request_id},
        query
    )
    
    # Create activity
    activity = Activity(
        request_id=request_id,
        actor_id=user_id,
        actor_name=current_user.get("name", ""),
        actor_role=role,
        action="assigned",
        notes=f"Request assigned to {current_user.get('name', user_id)}"
    )

    await db.activities.insert_one(activity.model_dump())

    return {"success": True, "message": "Request assigned successfully"}

# Quotation endpoints
@api_router.post("/quotations", response_model=Quotation)
async def create_quotation(quotation: Quotation):

    quotation_dict = quotation.model_dump()
    await db.quotations.insert_one(quotation_dict)

    request_id = quotation.request_id
    await db.requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": RequestStatus.QUOTED,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return quotation

@api_router.get("/quotations", response_model=List[Quotation])
async def get_quotations(request_id: Optional[str] = None):
    query = {}
    if request_id:
        query["request_id"] = request_id
    
    quotations = await db.quotations.find(query).to_list(1000)
    return [Quotation(**quot) for quot in quotations]

@api_router.get("/quotations/{quotation_id}/cost-breakup", response_model=List[CostBreakupItem])
async def get_quotation(quotation_id: str, current_user: Dict = Depends(get_current_user)):
    if (not current_user.get("can_see_cost_breakup", False) and current_user.get("role") == UserRole.SALES) or current_user.get("role") == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Not authorized to view cost breakup")
    
    quotation = await db.quotations.find_one({"id": quotation_id})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return [CostBreakupItem(**item) for item in quotation.get("cost_breakup", [])]


def get_day_suffix(day: int) -> str:
    if 11 <= day <= 13:
        return "th"
    last_digit = day % 10
    if last_digit == 1:
        return "st"
    elif last_digit == 2:
        return "nd"
    elif last_digit == 3:
        return "rd"
    else:
        return "th"

# date formatting helper - 18th Mar, 24 - 25th Mar, 24
def formatDate(start_date_str: str, end_date_str: str) -> str:
    start_date = datetime.fromisoformat(start_date_str)
    end_date = datetime.fromisoformat(end_date_str)
    formatted_start = start_date.strftime("%d").lstrip("0") + get_day_suffix(start_date.day) + " " + start_date.strftime("%b, %y")
    formatted_end = end_date.strftime("%d").lstrip("0") + get_day_suffix(end_date.day) + " " + end_date.strftime("%b, %y")
    return f"{formatted_start} - {formatted_end}"

@api_router.get("/quotations/{quotation_id}/pdf")
async def get_quotation_pdf(quotation_id: str):
    quotation = await db.quotations.find_one({"id": quotation_id})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    request_id = quotation.get("request_id")
    request = await db.requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    client_id = request.get("client_id")
    salesPerson_id = request.get("assigned_salesperson_id")

    client = await db.users.find_one({"id": client_id})
    salesPerson = await db.users.find_one({"id": salesPerson_id})
    
    quotation_data = quotation.get("detailed_quotation_data", {})
    
    # Detect service types from request if not explicitly set in quotation_data
    if not quotation_data.get("is_holiday_package") and not quotation_data.get("is_transport_service"):
        quotation_data["is_holiday_package"] = request.get("is_holiday_package_required", False)
        quotation_data["is_mice"] = request.get("is_mice_required", False)
        quotation_data["is_hotel_booking"] = request.get("is_hotel_booking_required", False)
        quotation_data["is_sightseeing"] = request.get("is_sight_seeing_required", False)
        quotation_data["is_visa"] = request.get("is_visa_required", False)
        quotation_data["is_transport_service"] = request.get("is_transport_within_city_required", False) or request.get("is_transfer_to_destination_required", False)
    
    quotation_data["customerName"] = client.get("name", "Valued Customer")
    quotation_data["dates"] = formatDate(request.get("start_date"), request.get("end_date"))
    if "start_date" in quotation_data:
        quotation_data.pop("start_date")
    if "end_date" in quotation_data:
        quotation_data.pop("end_date")
    
    salesPerson = {
        "name": salesPerson.get("name", "Sales Executive"),
        "email": salesPerson.get("email", ""),
        "phone": salesPerson.get("country_code", "") + " " + salesPerson.get("phone", ""),
        "photo": "https://cdn-icons-png.flaticon.com/512/847/847969.png"
    }
    quotation_data["salesperson"] = salesPerson

    admin_settings = await db.admin_settings.find_one({})
    if admin_settings:
        quotation_data["detailedTerms"] = admin_settings.get("terms_and_conditions", "")
        quotation_data["privacyPolicy"] = admin_settings.get("privacy_policy", "")

    try:
        # Use comprehensive template
        template_path = os.path.join(os.path.dirname(__file__), 'templates', 'comprehensive_quotation_pdf.html')
        
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Render template with data
        template = Template(template_content)
        html_content = template.render(data=quotation_data)
        
        # Create temporary files
        temp_dir = tempfile.mkdtemp()
        html_file = os.path.join(temp_dir, 'quotation.html')
        pdf_file = os.path.join(temp_dir, f'quotation-{quotation_data["bookingRef"]}.pdf')

        # Write HTML to file
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Generate PDF using Playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(f'file://{html_file}', wait_until='networkidle')
            await page.pdf(
                path=pdf_file,
                format='A4',
                print_background=True,
                margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'}
            )
            await browser.close()
        
        # Check if PDF was created
        if not os.path.exists(pdf_file):
            raise Exception("PDF file was not created")
        
        # Return PDF file
        response = FileResponse(
            pdf_file,
            media_type='application/pdf',
            filename=f'quotation-{quotation_data["bookingRef"]}.pdf'
        )
        
        # Clean up temp HTML file immediately
        os.remove(html_file)
        
        return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@api_router.put("/quotations/{quotation_id}", response_model=Quotation)
async def update_quotation(quotation_id: str, quotation: Quotation):
    # If detailed_quotation_data is provided, populate with AdminSettings defaults
    if quotation.detailed_quotation_data:
        admin_settings = await db.admin_settings.find_one({})
        if admin_settings:
            # Populate privacy_policy from AdminSettings if not set
            if not quotation.detailed_quotation_data.privacyPolicy:
                quotation.detailed_quotation_data.privacyPolicy = admin_settings.get("privacy_policy", "")
            
            # Populate terms from AdminSettings if not set
            if not quotation.detailed_quotation_data.detailedTerms:
                quotation.detailed_quotation_data.detailedTerms = admin_settings.get("terms_and_conditions", "")
            
            # Populate inclusions from AdminSettings if not set
            if not quotation.detailed_quotation_data.inclusions:
                quotation.detailed_quotation_data.inclusions = admin_settings.get("default_inclusions", [])
            
            # Populate exclusions from AdminSettings if not set
            if not quotation.detailed_quotation_data.exclusions:
                quotation.detailed_quotation_data.exclusions = admin_settings.get("default_exclusions", [])
    
    quotation.updated_at = datetime.now(timezone.utc).isoformat()
    await db.quotations.update_one({"id": quotation_id}, {"$set": quotation.dict()})
    return quotation

@api_router.post("/quotations/{quotation_id}/publish")
async def publish_quotation(quotation_id: str, data: Dict[str, Any]):
    expiry_date = data.get("expiry_date")
    notes = data.get("notes", "")
    
    quotation = await db.quotations.find_one({"id": quotation_id})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    await db.quotations.update_one(
        {"id": quotation_id},
        {"$set": {
            "status": QuotationStatus.SENT,
            "expiry_date": expiry_date,
            "published_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create activity
    activity = Activity(
        request_id=quotation["request_id"],
        actor_id=data.get("actor_id", "ops-001"),
        actor_name=data.get("actor_name", "Operations"),
        actor_role="operations",
        action="published",
        notes=f"Proforma published. {notes}"
    )
    await db.activities.insert_one(activity.dict())
    
    return {"success": True, "message": "Quotation published"}

@api_router.post("/invoices/{invoice_id}/full-payment")
async def full_payment(invoice_id: str, current_user: Dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id})
    payment = Payment(
        invoice_id=invoice.get("id"),
        amount=invoice.get("total_amount") - invoice.get("advance_amount"),
        method="Bank Transfer",
        type="full-payment",
    )
    await db.payments.insert_one(payment.model_dump())

    return {"success": True}
    

@api_router.post("/quotations/{quotation_id}/accept")
async def accept_quotation(quotation_id: str, current_user: Dict = Depends(get_current_user)):
    quotation = await db.quotations.find_one({"id": quotation_id})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Update quotation status
    await db.quotations.update_one(
        {"id": quotation_id},
        {"$set": {"status": QuotationStatus.ACCEPTED, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    
    # Update request status
    await db.requests.update_one(
        {"id": quotation["request_id"]},
        {"$set": {"status": RequestStatus.ACCEPTED, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    

    # Create invoice
    request = await db.requests.find_one({"id": quotation["request_id"]})
    client_id = request.get("client_id")
    client = await db.users.find_one({"id": client_id})

    invoice = Invoice(
        invoice_number=f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}",
        quotation_id=quotation_id,
        request_id=quotation["request_id"],
        client_name=client.get("name"),
        client_email=client.get("email"),
        client_country_code=client.get("country_code"),
        client_phone=client.get("phone"),
        total_amount=quotation.get("detailed_quotation_data", {}).get("pricing", {}).get("total", 0.0),
        advance_amount=quotation.get("detailed_quotation_data", {}).get("pricing", {}).get("depositDue", 0.0),
        due_date=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    )
    await db.invoices.insert_one(invoice.model_dump())
    
    # Create payment record
    payment = Payment(
        invoice_id=invoice.id,
        amount=invoice.advance_amount,
        method="pending"
    )
    await db.payments.insert_one(payment.model_dump())
    
    # Create activity
    activity = Activity(
        request_id=quotation["request_id"],
        actor_id=current_user.get("sub", ""),
        actor_name=current_user.get("name", "Customer"),
        actor_role=current_user.get("role", "Unknown"),
        action="accepted",
        notes="Quotation accepted by " + current_user.get("name", "Customer")
    )
    await db.activities.insert_one(activity.model_dump())
    
    return {"success": True, "invoice_id": invoice.id}


# New endpoint: Download Proforma Invoice PDF
@api_router.get("/quotations/{quotation_id}/download-proforma")
async def download_proforma_invoice(quotation_id: str):
    """Generate and download proforma invoice as PDF"""
    quotation = await db.quotations.find_one({"id": quotation_id})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    request = await db.requests.find_one({"id": quotation["request_id"]})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#f97316'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#ea580c'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    normal_style = styles['Normal']
    
    # Title
    elements.append(Paragraph("PROFORMA INVOICE", title_style))
    elements.append(Spacer(1, 12))
    
    # Company Details
    company_data = [
        ["Travel Company Pvt Ltd", ""],
        ["123 Business Street", f"Date: {datetime.now().strftime('%d %B %Y')}"],
        ["City, State - 123456", f"Proforma #: PI-{quotation_id[:8].upper()}"],
        ["Phone: +91-1234567890", f"Valid Until: {datetime.fromisoformat(quotation['expiry_date']).strftime('%d %B %Y') if quotation.get('expiry_date') else 'N/A'}"],
    ]
    
    company_table = Table(company_data, colWidths=[3*inch, 3*inch])
    company_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]))
    elements.append(company_table)
    elements.append(Spacer(1, 20))
    
    # Client Details
    elements.append(Paragraph("BILL TO:", heading_style))
    client_data = [
        ["Client Name:", request["client_name"]],
        ["Email:", request["client_email"]],
        ["Phone:", f"{request.get('client_country_code', '+91')} {request['client_phone']}"],
        ["Destination:", request.get("destination", "N/A")],
        ["Travel Dates:", request["preferred_dates"]],
        ["Number of People:", str(request["people_count"])],
    ]
    
    client_table = Table(client_data, colWidths=[1.5*inch, 4.5*inch])
    client_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 20))
    
    # Get current version
    current_version = None
    for version in quotation.get("versions", []):
        if version.get("is_current", False):
            current_version = version
            break
    
    if not current_version and quotation.get("versions"):
        current_version = quotation["versions"][-1]
    
    if current_version and current_version.get("options"):
        # Process each option
        for option in current_version["options"]:
            elements.append(Paragraph(f"<b>{option['name']}</b>", heading_style))
            
            # Line items table
            line_items_data = [["Item", "Supplier", "Qty", "Unit Price", "Tax %", "Total"]]
            
            for item in option.get("line_items", []):
                line_items_data.append([
                    f"{item['name']}\n({item['type']})",
                    item.get('supplier', 'N/A'),
                    str(item['quantity']),
                    f"₹{item['unit_price']:,.2f}",
                    f"{item['tax_percent']}%",
                    f"₹{item['total']:,.2f}"
                ])
            
            # Add subtotal, tax, and total rows
            line_items_data.append(["", "", "", "", "Subtotal:", f"₹{option['subtotal']:,.2f}"])
            line_items_data.append(["", "", "", "", "Tax:", f"₹{option['tax_amount']:,.2f}"])
            line_items_data.append(["", "", "", "", "Total:", f"₹{option['total']:,.2f}"])
            
            items_table = Table(line_items_data, colWidths=[2*inch, 1.2*inch, 0.5*inch, 1*inch, 0.8*inch, 1*inch])
            items_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f97316')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -4), colors.white),
                ('GRID', (0, 0), (-1, -4), 1, colors.grey),
                ('LINEABOVE', (4, -3), (-1, -3), 2, colors.grey),
                ('LINEABOVE', (4, -1), (-1, -1), 2, colors.HexColor('#f97316')),
                ('FONTNAME', (4, -1), (-1, -1), 'Helvetica-Bold'),
            ]))
            elements.append(items_table)
            elements.append(Spacer(1, 20))
    
    # Payment Terms
    elements.append(Paragraph("PAYMENT TERMS:", heading_style))
    advance_amount = quotation.get("advance_amount", 0)
    advance_percent = quotation.get("advance_percent", 30)
    grand_total = quotation.get("grand_total", 0)
    
    payment_terms_data = [
        [f"Advance Payment ({advance_percent}%):", f"₹{advance_amount:,.2f}"],
        ["Balance Payment:", f"₹{grand_total - advance_amount:,.2f}"],
        ["Grand Total:", f"₹{grand_total:,.2f}"],
    ]
    
    payment_table = Table(payment_terms_data, colWidths=[4*inch, 2*inch])
    payment_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#f97316')),
        ('FONTSIZE', (0, -1), (-1, -1), 14),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#f97316')),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 20))
    
    # Bank Details
    elements.append(Paragraph("BANK DETAILS:", heading_style))
    bank_details_text = """
    <b>Account Name:</b> Travel Company Pvt Ltd<br/>
    <b>Account Number:</b> 1234567890<br/>
    <b>IFSC Code:</b> BANK0001234<br/>
    <b>Bank Name:</b> Example Bank<br/>
    <b>UPI ID:</b> travelcompany@upi
    """
    elements.append(Paragraph(bank_details_text, normal_style))
    elements.append(Spacer(1, 20))
    
    # Terms and Conditions
    elements.append(Paragraph("TERMS & CONDITIONS:", heading_style))
    terms_text = """
    1. This proforma invoice is valid until the expiry date mentioned above.<br/>
    2. Advance payment is required to confirm the booking.<br/>
    3. Balance payment must be made before the travel date.<br/>
    4. Cancellation charges apply as per company policy.<br/>
    5. All prices are subject to availability at the time of booking.
    """
    elements.append(Paragraph(terms_text, normal_style))
    
    # Build PDF
    doc.build(elements)
    
    # Get the value of the BytesIO buffer and return as response
    buffer.seek(0)
    
    filename = f"proforma_invoice_{quotation_id[:8]}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Invoice endpoints
@api_router.get("/invoice", response_model=Invoice)
async def get_invoices(request_id: Optional[str] = None):
    query = {}
    query["request_id"] = request_id
    
    invoice = await db.invoices.find_one(query)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return Invoice(**invoice)

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return Invoice(**invoice)

# New endpoint: Download Invoice PDF (after payment verification)
@api_router.get("/invoices/{invoice_id}/download")
async def download_invoice(invoice_id: str):
    """Generate and download invoice as PDF after payment verification"""
    invoice = await db.invoices.find_one({"id": invoice_id}) 
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    status = invoice.get("status", "Verification Pending")

    # Get quotation and request details
    quotation = await db.quotations.find_one({"id": invoice["quotation_id"]})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    request = await db.requests.find_one({"id": invoice["request_id"]})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=40, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#10b981'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#059669'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    normal_style = styles['Normal']
    
    # Title with PAID badge
    elements.append(Paragraph("INVOICE", title_style))
    paid_style = ParagraphStyle(
        'PaidBadge',
        parent=styles['Normal'],
        fontSize=16,
        textColor=colors.HexColor('#10b981' if status == "Paid" else '#f59e0b' if status == "Partially Paid" else '#ef4444'), # Verification Pending, Partially Paid, Paid
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    elements.append(Paragraph((status or "").upper(), paid_style))
    elements.append(Spacer(1, 12))
    
    # Company Details
    company_data = [
        ["Traveego Company Pvt Ltd", ""],
        ["123 Business Street", f"Date: {datetime.now().strftime('%d %B %Y')}"],
        ["City, State - 123456", f"Invoice #: {invoice['invoice_number']}"],
        ["Phone: +91-1234567890", f"Due Date: {datetime.fromisoformat(invoice['due_date']).strftime('%d %B %Y')}"],
        ["GST: " + (invoice.get('gst_number', 'N/A')), ""],
    ]
    
    company_table = Table(company_data, colWidths=[3*inch, 3*inch])
    company_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]))
    elements.append(company_table)
    elements.append(Spacer(1, 20))
    
    # Client Details
    elements.append(Paragraph("BILL TO:", heading_style))
    client_data = [
        ["Client Name:", invoice["client_name"]],
        ["Email:", invoice["client_email"]],
        ["Phone:", f"{invoice.get('client_country_code', '+91')} {invoice['client_phone']}"],
        ["Destination:", request.get("destination", "N/A")],
        ["Travel Dates:", request["preferred_dates"]],
        ["Number of People:", str(request["people_count"])],
    ]
    
    client_table = Table(client_data, colWidths=[1.5*inch, 4.5*inch])
    client_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 20))    
    
    # Payment Summary
    elements.append(Paragraph("PAYMENT SUMMARY:", heading_style))
    advance_amount = invoice.get("advance_amount", 0)
    total_amount = invoice.get("total_amount", 0)
    
    payment_summary_data = [
        ["Advance Payment:", f"Rs. {advance_amount:,.2f}"],
        ["Balance Payment:", f"Rs. {total_amount - advance_amount:,.2f}"],
        ["Total Amount:", f"Rs. {total_amount:,.2f}"],
    ]
    
    payment_table = Table(payment_summary_data, colWidths=[4*inch, 2*inch])
    payment_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -2), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -2), 6),
        ('BOTTOMPADDING', (0, -2), (-1, -2), 14),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#10b981')),
        ('TOPPADDING', (0, -1), (-1, -1), 14),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#10b981')),
        ('FONTSIZE', (0, -1), (-1, -1), 14),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 20))
    
    # Payment Verification Details
    elements.append(Paragraph("PAYMENT VERIFICATION:", heading_style))
    if not (status == "Paid" or status == "Partially Paid"):
        global verification_text
        verification_text = "<b style='color:red;'>Payment not yet verified by Operations.</b>"
    else:
        verification_text = f"""
        <b>Payment Received:</b> {datetime.fromisoformat(invoice['received_at']).strftime('%d %B %Y, %I:%M %p') if invoice.get('received_at') else 'N/A'}<br/>
        <b>Verified by Operations:</b> {datetime.fromisoformat(invoice['verified_at']).strftime('%d %B %Y, %I:%M %p') if invoice.get('verified_at') else 'N/A'}<br/>
        <b>Payment Method:</b> {invoice.get('method', 'N/A').replace('_', ' ').title()}<br/>
        """
        if invoice.get('accountant_notes'):
            verification_text += f"<b>Accountant Notes:</b> {invoice['accountant_notes']}<br/>"
        if invoice.get('ops_notes'):
            verification_text += f"<b>Operations Notes:</b> {invoice['ops_notes']}<br/>"
    
    elements.append(Paragraph(verification_text, normal_style))
    elements.append(Spacer(1, 20))
    
    # Terms and Conditions
    elements.append(Paragraph("TERMS & CONDITIONS:", heading_style))
    if status == "Paid" or status == "Partially Paid":
        global terms_text
        terms_text = """
        1. This invoice confirms the payment received for the travel services booked.<br/>
        2. All services are subject to availability and confirmation from suppliers.<br/>
        3. Cancellation charges apply as per company policy.<br/>
        4. Any disputes are subject to the jurisdiction of the company's registered office.<br/>
        5. Thank you for choosing our services.
        """
    else:
        terms_text = """
        1. This invoice is issued pending payment verification.<br/>
        2. Please ensure payment is verified to confirm your booking.<br/>
        3. Cancellation charges apply as per company policy.<br/>
        4. Any disputes are subject to the jurisdiction of the company's registered office.<br/>
        5. Thank you for choosing our services.
        """
    elements.append(Paragraph(terms_text, normal_style))
    elements.append(Spacer(1, 20))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#10b981'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    elements.append(Paragraph("Thank you for your business!", footer_style))
    
    # Build PDF
    doc.build(elements)
    
    # Get the value of the BytesIO buffer and return as response
    buffer.seek(0)
    
    filename = f"invoice_{invoice['invoice_number']}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Payment endpoints
@api_router.get("/payments")
async def get_payments(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    
    payments = await db.payments.find(query).to_list(1000)

    invoice_ids = []
    for payment in payments:
        invoice_id = payment.get("invoice_id")
        invoice_ids.append(invoice_id)
    
    # get invoice data
    invoices = await db.invoices.find({"id": {"$in": invoice_ids}}).to_list(1000)
    
    for payment in payments:
        invoice = next((inv for inv in invoices if inv.get("id") == payment.get("invoice_id")), None)
        if invoice:
            payment["client_name"] = invoice.get("client_name")
            payment["client_phone"] = invoice.get("client_phone")
            payment["client_email"] = invoice.get("client_email")
            payment["client_country_code"] = invoice.get("client_country_code")


    return [Payment(**pay) for pay in payments]

@api_router.get("/payments/{payment_id}", response_model=Payment)
async def get_payment(payment_id: str):
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return Payment(**payment)

@api_router.put("/payments/{payment_id}/mark-received")
async def mark_payment_received(payment_id: str, data: Dict[str, Any]):
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        return {"success": False, "error": "Payment not found"}
    
    if payment.get("type") == "full-payment":
        await db.payments.update_one(
            {"id": payment_id},
            {"$set": {
                "status": PaymentStatus.VERIFIED_BY_OPS,
                "received_at": datetime.now(timezone.utc).isoformat(),
                "accountant_notes": data.get("notes", ""),
                "ops_notes": "System Auto Approved",
                "proof_url": data.get("proof_url", "")
            }}
        )
        await db.invoices.update_one(
            {"id": payment.get("invoice_id")},
            {"$set": {"status": "PAID"}}
        )
    else:
        await db.payments.update_one(
            {"id": payment_id},
            {"$set": {
                "status": PaymentStatus.RECEIVED_BY_ACCOUNTANT,
                "received_at": datetime.now(timezone.utc).isoformat(),
                "accountant_notes": data.get("notes", ""),
                "proof_url": data.get("proof_url", "")
            }}
        )

    return {"success": True}

@api_router.put("/payments/{payment_id}/verify")
async def verify_payment(payment_id: str, data: Dict[str, Any]):
    status = PaymentStatus.VERIFIED_BY_OPS if data.get("verified", True) else PaymentStatus.REJECTED
    
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        return {"success": False, "error": "Payment not found"}

    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": status,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "ops_notes": data.get("notes", "")
        }}
    )

    # Update invoice status
    invoice_id = payment.get("invoice_id")

    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        return {"success": False, "error": "Invoice not found"}

    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "status": "Partial Paid" if status == PaymentStatus.VERIFIED_BY_OPS else "Refund Initiated",
        }}
    )

    if status == PaymentStatus.REJECTED:
        request_id = invoice.get("request_id")

        # Update request status
        request = await db.requests.find_one({"id": request_id})
        if not request:
            return {"success": False, "error": "Request not found"}

        await db.requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "Rejected",
            }}
        )

    return {"success": True}

# Activity endpoints
@api_router.get("/activities", response_model=List[Activity])
async def get_activities(request_id: Optional[str] = None):
    query = {}
    if request_id:
        query["request_id"] = request_id
    
    activities = await db.activities.find(query).sort("created_at", -1).to_list(1000)
    return [Activity(**act) for act in activities]

@api_router.post("/activities", response_model=Activity)
async def create_activity(activity: Activity):
    await db.activities.insert_one(activity.dict())
    return activity

# Catalog endpoints
@api_router.get("/catalog", response_model=List[CatalogItem])
async def get_catalog(type: Optional[str] = None, destination: Optional[str] = None):
    query = {}
    if type:
        query["type"] = type
    if destination:
        query["destination"] = destination
    
    items = await db.catalog.find(query).to_list(1000)
    return [CatalogItem(**item) for item in items]

@api_router.post("/catalog", response_model=CatalogItem)
async def create_catalog_item(item: CatalogItem):
    await db.catalog.insert_one(item.dict())
    return item

# Notification endpoints with params unreadOnly and need to fetch user-specific notifications
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(unread_only: Optional[bool] = False, current_user: Dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    query = {"user_id": user_id}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(query).sort("created_at", -1).to_list(100)
    return [Notification(**notif) for notif in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    return {"success": True}

@api_router.post("/notifications", response_model=Notification)
async def create_notification(notification: Notification):
    await db.notifications.insert_one(notification.dict())
    return notification

# Chat/Message Endpoints
@api_router.post("/requests/{request_id}/messages", response_model=Message)
async def send_message(request_id: str, message: Message, current_user: Dict = Depends(get_current_user)):
    """Send a message in request chat and create notifications for all participants"""
    user_id = current_user.get("sub")

    # Get the request to check participants
    request_data = await db.requests.find_one({"id": request_id})
    if not request_data:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check access control: only client, assigned salesperson, assigned operations, or admin
    is_client = request_data.get("client_id") == user_id
    is_assigned_sales = request_data.get("assigned_salesperson_id") == user_id
    is_assigned_operations = request_data.get("assigned_operation_id") == user_id
    is_admin = current_user.get("role") == "admin"
    
    if not (is_client or is_assigned_sales or is_assigned_operations or is_admin):
        raise HTTPException(status_code=403, detail="You don't have access to this chat")
    
    # Ensure the message has the correct request_id and sender info
    message.request_id = request_id
    message.sender_id = user_id
    message.sender_name = current_user.get("name")
    message.sender_role = current_user.get("role")
    
    # Save the message
    await db.messages.insert_one(message.model_dump())
    
    # Create notifications for all participants except the sender
    participants = []
    
    # Add client (request creator)
    if request_data.get("client_id") and request_data.get("client_id") != user_id:
        # Get client info
        client = await db.users.find_one({"id": request_data["client_id"]})
        
        if client:
            participants.append({
                "user_id": request_data["client_id"],
                "name": client.get("name", "Client")
            })
    
    # Add assigned salesperson
    if request_data.get("assigned_salesperson_id") and request_data.get("assigned_salesperson_id") != user_id:

        salesPerson = await db.users.find_one({"id": request_data["assigned_salesperson_id"]})

        participants.append({
            "user_id": request_data["assigned_salesperson_id"],
            "name": salesPerson.get("name", "Salesperson")
        })

    # Add assigned operations
    if request_data.get("assigned_operation_id") and request_data.get("assigned_operation_id") != user_id:
        operationsPerson = await db.users.find_one({"id": request_data["assigned_operation_id"]})

        participants.append({
            "user_id": request_data["assigned_operation_id"],
            "name": operationsPerson.get("name", "Operations")
        })
    
    # Create notifications for all participants
    for participant in participants:
        notification = Notification(
            user_id=participant["user_id"],
            title=f"New message from {current_user['name']}",
            message=f"{current_user['name']} sent a message in request: {request_data.get('title', 'Travel Request')}",
            link=f"/requests/{request_id}"
        )
        await db.notifications.insert_one(notification.model_dump())
    
    return message

@api_router.get("/requests/{request_id}/messages")
async def get_messages(request_id: str, page: int = 1, limit: int = 10, authorization: str = Header(None), current_user: Dict = Depends(get_current_user)):
    """Get messages for a request with pagination (10 messages per page, latest first)"""

    user_id = current_user.get("sub")
    
    # Get the request to check access
    request_data = await db.requests.find_one({"id": request_id})
    if not request_data:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check access control
    is_client = request_data.get("client_id") == user_id
    is_assigned_sales = request_data.get("assigned_salesperson_id") == user_id
    is_assigned_operations = request_data.get("assigned_operation_id") == user_id
    is_admin = current_user.get("role") == "admin"
    
    if not (is_client or is_assigned_sales or is_assigned_operations or is_admin):
        raise HTTPException(status_code=403, detail="You don't have access to this chat")
    
    # Calculate skip for pagination
    skip = (page - 1) * limit
    
    # Get messages sorted by created_at descending (latest first)
    messages = await db.messages.find(
        {"request_id": request_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get total count for pagination info
    total_count = await db.messages.count_documents({"request_id": request_id})
    
    return {
        "messages": [Message(**msg) for msg in messages],
        "page": page,
        "limit": limit,
        "total": total_count,
        "has_more": (skip + len(messages)) < total_count
    }


# Leave Management Endpoints
@api_router.post("/leaves", response_model=Leave)
async def create_leave(leave: Leave):
    """Create a new leave request with backup assignment"""
    # Validate that backup user is not on leave during the requested dates
    backup_leaves = await db.leaves.find({
        "user_id": leave.backup_user_id,
        "status": "active"
    }).to_list(1000)
    
    leave_start = datetime.fromisoformat(leave.start_date).date()
    leave_end = datetime.fromisoformat(leave.end_date).date()
    
    for backup_leave in backup_leaves:
        backup_start = datetime.fromisoformat(backup_leave["start_date"]).date()
        backup_end = datetime.fromisoformat(backup_leave["end_date"]).date()
        
        # Check for date overlap
        if not (leave_end < backup_start or leave_start > backup_end):
            raise HTTPException(
                status_code=400, 
                detail=f"{leave.backup_user_name} is already on leave during these dates (from {backup_leave['start_date']} to {backup_leave['end_date']})"
            )
    
    # Create the leave
    leave_dict = leave.dict()
    await db.leaves.insert_one(leave_dict)
    
    # Create notification for backup user
    notification = Notification(
        user_id=leave.backup_user_id,
        title="You've been assigned as backup",
        message=f"{leave.user_name} has assigned you as backup from {leave.start_date} to {leave.end_date}",
        link="/leaves"
    )
    await db.notifications.insert_one(notification.dict())
    
    return leave

@api_router.get("/leaves", response_model=List[Leave])
async def get_leaves(user_id: Optional[str] = None, status: Optional[str] = None):
    """Get all leaves with optional filters"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if status:
        query["status"] = status
    
    leaves = await db.leaves.find(query).sort("start_date", -1).to_list(1000)
    return [Leave(**leave) for leave in leaves]

@api_router.get("/leaves/my-leaves")
async def get_my_leaves(user_id: str):
    """Get leaves for the current user (both as primary and backup)"""
    # Get leaves where user is primary
    my_leaves = await db.leaves.find({
        "user_id": user_id,
        "status": "active"
    }).sort("start_date", -1).to_list(1000)
    
    # Get leaves where user is backup
    backup_leaves = await db.leaves.find({
        "backup_user_id": user_id,
        "status": "active"
    }).sort("start_date", -1).to_list(1000)
    
    return {
        "my_leaves": [Leave(**leave) for leave in my_leaves],
        "backup_for": [Leave(**leave) for leave in backup_leaves]
    }

@api_router.get("/leaves/available-backups")
async def get_available_backups(role: str, start_date: str, end_date: str, exclude_user_id: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    available_users = []
    availableUsersObject = await db.users.find({"role": current_user.get("role")}).to_list(1000)

    for user in availableUsersObject:
        if user["role"] == role and user["id"] != exclude_user_id:
            available_users.append({
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            })
    
    # Filter out users who are on leave during the requested dates
    leave_start = datetime.fromisoformat(start_date).date()
    leave_end = datetime.fromisoformat(end_date).date()
    
    all_leaves = await db.leaves.find({"status": "active"}).to_list(1000)
    
    unavailable_user_ids = set()
    for leave in all_leaves:
        leave_user_start = datetime.fromisoformat(leave["start_date"]).date()
        leave_user_end = datetime.fromisoformat(leave["end_date"]).date()
        
        # Check for date overlap
        if not (leave_end < leave_user_start or leave_start > leave_user_end):
            unavailable_user_ids.add(leave["user_id"])
    
    # Filter available users
    available_backups = [
        user for user in available_users 
        if user["id"] not in unavailable_user_ids
    ]
    
    return available_backups

@api_router.delete("/leaves/{leave_id}")
async def cancel_leave(leave_id: str):
    """Cancel a leave request"""
    leave = await db.leaves.find_one({"id": leave_id})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    
    await db.leaves.update_one(
        {"id": leave_id},
        {"$set": {
            "status": "cancelled",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify backup user
    notification = Notification(
        user_id=leave["backup_user_id"],
        title="Leave cancelled",
        message=f"{leave['user_name']}'s leave from {leave['start_date']} to {leave['end_date']} has been cancelled",
        link="/leaves"
    )
    await db.notifications.insert_one(notification.dict())
    
    return {"success": True, "message": "Leave cancelled successfully"}


# Admin endpoints
@api_router.get("/admin/salespeople")
async def get_all_salespeople(current_user: dict = Depends(get_current_user)):
    """Get all salespeople with their cost breakup permissions. Only accessible by admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access this endpoint")
    
    # Fetch all users with sales role
    salespeople_cursor = db.users.find({"role": "sales"})
    salespeople = []
    
    # async for sp in salespeople_cursor:
    #     salespeople.append({
    #         "id": sp["id"],
    #         "name": sp["name"],
    #         "email": sp["email"],
    #         "phone": sp.get("phone", ""),
    #         "can_see_cost_breakup": sp.get("can_see_cost_breakup", False),
    #         "created_at": sp.get("created_at", "")
    #     })
    for email, user_data in MOCK_USERS.items():
        if user_data["role"] == "sales":
            salespeople.append({
                "id": user_data["id"],
                "name": user_data["name"],
                "email": email,
                "phone": user_data.get("phone", ""),
                "can_see_cost_breakup": user_data.get("can_see_cost_breakup", False),
                "created_at": user_data.get("created_at", "")
            })
    
    return salespeople

@api_router.put("/admin/salespeople/{user_id}/cost-breakup-permission")
async def toggle_cost_breakup_permission(
    user_id: str, 
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Toggle cost breakup visibility permission for a salesperson. Only accessible by admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can modify permissions")
    
    # Verify the user exists and is a salesperson
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("role") != "sales":
        raise HTTPException(status_code=400, detail="Can only modify permissions for salespeople")
    
    # Update the permission
    can_see = data.get("can_see_cost_breakup", False)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"can_see_cost_breakup": can_see}}
    )
    
    # Log the activity
    activity = Activity(
        user_id=current_user["sub"],
        user_name=current_user["name"],
        action=f"{'Enabled' if can_see else 'Disabled'} cost breakup visibility for {user.get('name')}",
        entity_type="user_permission",
        entity_id=user_id
    )
    await db.activities.insert_one(activity.dict())
    
    return {"message": "Permission updated successfully", "can_see_cost_breakup": can_see}

# Admin Settings Management
@api_router.get("/admin/settings", response_model=AdminSettings)
async def get_admin_settings():
    """Get admin settings. Creates default settings if none exist."""
    settings = await db.admin_settings.find_one({})
    
    if not settings:
        # Create default settings
        default_settings = AdminSettings(
            privacy_policy="",
            terms_and_conditions="",
            default_inclusions=[],
            default_exclusions=[],
            testimonials=[]
        )
        await db.admin_settings.insert_one(default_settings.dict())
        return default_settings
    
    return AdminSettings(**settings)

@api_router.put("/admin/settings", response_model=AdminSettings)
async def update_admin_settings(
    settings_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update admin settings. Only accessible by admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can modify settings")
    
    # Get existing settings or create new
    existing_settings = await db.admin_settings.find_one({})
    
    update_data = {
        "privacy_policy": settings_data.get("privacy_policy", ""),
        "terms_and_conditions": settings_data.get("terms_and_conditions", ""),
        "default_inclusions": settings_data.get("default_inclusions", []),
        "default_exclusions": settings_data.get("default_exclusions", []),
        "testimonials": settings_data.get("testimonials", []),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing_settings:
        # Update existing
        await db.admin_settings.update_one(
            {"id": existing_settings["id"]},
            {"$set": update_data}
        )
        updated_settings = await db.admin_settings.find_one({"id": existing_settings["id"]})
        return AdminSettings(**updated_settings)
    else:
        # Create new
        new_settings = AdminSettings(**update_data)
        await db.admin_settings.insert_one(new_settings.dict())
        return new_settings
    
# User Management Endpoints (Admin Only)
@api_router.post("/admin/users")
async def create_user(
    user_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a new user. Only accessible by admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create users")
    
    # Validate role
    allowed_roles = ["sales", "operations", "accountant"]
    if user_data.get("role") not in allowed_roles:
        raise HTTPException(status_code=400, detail="Invalid role. Allowed roles: sales, operations, accountant")
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create new user
    new_user = {
        "id": str(uuid.uuid4()),
        "email": user_data["email"],
        "name": user_data["name"],
        "phone": user_data.get("phone", ""),
        "country_code": user_data.get("country_code", "+91"),
        "role": user_data["role"],
        "password": hash_password("temp123"),  # Default temporary password
        "can_see_cost_breakup": user_data.get("can_see_cost_breakup", False) if user_data["role"] == "sales" else False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id")
    }
    
    await db.users.insert_one(new_user)
    
    return {"success": True, "message": "User created successfully"}

@api_router.get("/admin/users")
async def get_all_users(
    current_user: dict = Depends(get_current_user),
    role: Optional[str] = None
):
    """Get all users. Only accessible by admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can view users")
    
    # Build query
    query = {"role": {"$in": ["sales", "operations", "accountant"]}}
    if role:
        query["role"] = role
    
    # Get users from database
    users_cursor = db.users.find(query).sort("created_at", -1)
    users = await users_cursor.to_list(length=None)
    
    # Remove passwords from response
    for user in users:
        user.pop("password", None)
        user["_id"] = str(user.get("_id", ""))
    
    return {"users": users}

@api_router.get("/admin/users/{user_id}")
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single user by ID. Only accessible by admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can view users")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove password from response
    user.pop("password", None)
    user["_id"] = str(user.get("_id", ""))
    
    return {"user": user}

@api_router.put("/admin/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a user. Only accessible by admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update users")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate role if provided
    if "role" in user_data:
        allowed_roles = ["sales", "operations", "accountant"]
        if user_data["role"] not in allowed_roles:
            raise HTTPException(status_code=400, detail="Invalid role")
    
    # Check if email is being changed and if it already exists
    if "email" in user_data and user_data["email"] != user["email"]:
        existing_user = await db.users.find_one({"email": user_data["email"]})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        if user_data["email"] in MOCK_USERS:
            raise HTTPException(status_code=400, detail="Email already exists")
    
    # Prepare update data
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update allowed fields
    allowed_fields = ["name", "email", "phone", "country_code", "role", "can_see_cost_breakup", "is_active"]
    for field in allowed_fields:
        if field in user_data:
            # can_see_cost_breakup only for sales
            if field == "can_see_cost_breakup":
                new_role = user_data.get("role", user.get("role"))
                if new_role == "sales":
                    update_data[field] = user_data[field]
                else:
                    update_data[field] = False
            else:
                update_data[field] = user_data[field]
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    # Get updated user
    updated_user = await db.users.find_one({"id": user_id})
    updated_user.pop("password", None)
    updated_user["_id"] = str(updated_user.get("_id", ""))
    
    return {"success": True, "message": "User updated successfully", "user": updated_user}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Deactivate a user. Only accessible by admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete users")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Deactivate user instead of deleting
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_active": False,
            "deactivated_at": datetime.now(timezone.utc).isoformat(),
            "deactivated_by": current_user.get("id")
        }}
    )
    
    
    return {"success": True, "message": "User deactivated successfully"}

@api_router.put("/admin/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reset user password to temp123. Only accessible by admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can reset passwords")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Reset password to temp123
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password": hash_password("temp123"),
            "password_reset_at": datetime.now(timezone.utc).isoformat(),
            "password_reset_by": current_user.get("id")
        }}
    )
    
    return {"success": True, "message": "Password reset to temp123 successfully"}

# Quotation Detailed Data Helper Endpoints
@api_router.get("/quotations/{quotation_id}/detailed-data")
async def get_quotation_detailed_data(quotation_id: str):
    """Get the detailed quotation JSON data."""
    quotation = await db.quotations.find_one({"id": quotation_id})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    detailed_data = quotation.get("detailed_quotation_data")
    if not detailed_data:
        raise HTTPException(status_code=404, detail="Detailed quotation data not found")
    
    return detailed_data

@api_router.put("/quotations/{quotation_id}/detailed-data")
async def update_quotation_detailed_data(
    quotation_id: str,
    detailed_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Update detailed quotation data.
    Operations can edit inclusions/exclusions but not privacy policy or terms & conditions.
    Admin can edit everything.
    """
    # Check authorization
    user_role = current_user.get("role")
    if user_role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin and operations can modify detailed quotation data")
    
    # Get existing quotation
    quotation = await db.quotations.find_one({"id": quotation_id})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    existing_detailed_data = quotation.get("detailed_quotation_data", {})
    
    # If operations role, restrict what they can edit
    if user_role == "operations":
        # Operations can only edit inclusions and exclusions
        allowed_fields = ["inclusions", "exclusions"]
        
        # Preserve all existing fields except the ones being updated
        updated_detailed_data = existing_detailed_data.copy()
        
        # Only update allowed fields
        for field in allowed_fields:
            if field in detailed_data:
                updated_detailed_data[field] = detailed_data[field]
        
        # Ensure privacy policy and terms remain from AdminSettings or existing data
        # Operations CANNOT modify these fields
        if "privacyPolicy" in detailed_data or "detailedTerms" in detailed_data:
            raise HTTPException(
                status_code=403, 
                detail="Operations role cannot modify privacy policy or terms & conditions"
            )
    else:
        # Admin can update any fields
        updated_detailed_data = existing_detailed_data.copy()
        updated_detailed_data.update(detailed_data)
    
    # Update the quotation with new detailed data
    await db.quotations.update_one(
        {"id": quotation_id},
        {
            "$set": {
                "detailed_quotation_data": updated_detailed_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Return updated detailed data
    updated_quotation = await db.quotations.find_one({"id": quotation_id})
    return updated_quotation.get("detailed_quotation_data")

# File upload endpoint
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    upload_dir = Path("/app/uploads")
    upload_dir.mkdir(exist_ok=True)
    
    file_path = upload_dir / f"{uuid.uuid4()}_{file.filename}"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"file_url": f"/uploads/{file_path.name}"}

# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    user_id = current_user.get("sub")
    stats = {}
    
    if role == "operations":
        # Expiring quotes
        expiring_count = await db.quotations.count_documents({
            "status": QuotationStatus.SENT,
            "assigned_operation_id": user_id,
            "expiry_date": {"$lte": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()}
        })
        
        # Pending payments
        pending_payments = await db.payments.count_documents({
            "status": {"$in": [PaymentStatus.PENDING, PaymentStatus.RECEIVED_BY_ACCOUNTANT]},
            "assigned_operation_id": user_id
        })
        
        stats = {
            "expiring_quotes": expiring_count,
            "pending_payments": pending_payments,
            "active_requests": await db.requests.count_documents({"status": RequestStatus.PENDING, "assigned_operation_id": user_id}),
            "open_requests": await db.requests.count_documents({"status": RequestStatus.PENDING, "assigned_operation_id": {"$exists": False}}),
            "total_revenue": await db.payments.aggregate([
                {"$match": {"status": PaymentStatus.VERIFIED_BY_OPS, "assigned_operation_id": user_id}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]).to_list(1)
        }
    
    elif role == "sales":
        stats = {
            "my_requests": await db.requests.count_documents({"assigned_salesperson_id": user_id}),
            "pending_quotes": await db.quotations.count_documents({"status": QuotationStatus.SENT, "assigned_salesperson_id": user_id}),
            "accepted_quotes": await db.quotations.count_documents({"status": QuotationStatus.ACCEPTED, "assigned_salesperson_id": user_id}),
        }
    
    elif role == "accountant":
        stats = {
            "pending_verification": await db.payments.count_documents({"status": PaymentStatus.RECEIVED_BY_ACCOUNTANT}),
            "pending_payments": await db.payments.count_documents({"status": PaymentStatus.PENDING}),
            "verified_payments": await db.payments.count_documents({"status": PaymentStatus.VERIFIED_BY_OPS})
        }
    
    return stats


@api_router.get("/download")
async def download_data(table: str, format: str = "csv"):
    allowed_tables = {
        "requests": db.requests,
        "quotations": db.quotations,
        "invoices": db.invoices,
        "payments": db.payments,
        "activities": db.activities,
        "catalog": db.catalog,
        "notifications": db.notifications
    }

    if table not in allowed_tables:
        raise HTTPException(status_code=400, detail="Invalid table name")

    collection = allowed_tables[table]
    data = await collection.find({}).to_list(10000)

    if not data:
        raise HTTPException(status_code=404, detail="No data found")

    # Convert MongoDB ObjectIds and datetime objects
    def clean(doc):
        doc = dict(doc)
        doc.pop('_id', None)  # Remove Mongo _id
        return json.loads(json.dumps(doc, default=str))  # Ensure all values are JSON serializable

    cleaned_data = [clean(doc) for doc in data]

    if format.lower() == "csv":
        output = io.StringIO()
        fieldnames = sorted({k for row in cleaned_data for k in row.keys()})
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cleaned_data)
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={table}.csv"}
        )

    elif format.lower() == "sql":
        output = io.StringIO()
        for row in cleaned_data:
            columns = ', '.join(f"`{key}`" for key in row.keys())
            escaped_values = [str(value).replace("'", "''") for value in row.values()]
            values = ', '.join(f"'{value}'" for value in escaped_values)
            insert_stmt = f"INSERT INTO `{table}` ({columns}) VALUES ({values});\n"
            output.write(insert_stmt)
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={table}.sql"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'csv' or 'sql'")


# Seed mock data
@api_router.post("/seed")
async def seed_data():
    # Clear existing data
    await db.catalog.delete_many({})
    await db.requests.delete_many({})
    await db.quotations.delete_many({})
    await db.activities.delete_many({})
    await db.admin_settings.delete_many({})
    
    # Seed catalog with image URLs and hotel ratings
    catalog_items = [
        CatalogItem(
            name="Luxury Hotel - Manali", 
            type="hotel", 
            destination="Manali", 
            supplier="Hotel Paradise", 
            default_price=5000,
            image_url="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
            rating=5
        ),
        CatalogItem(
            name="Budget Hotel - Manali", 
            type="hotel", 
            destination="Manali", 
            supplier="Hotel Comfort", 
            default_price=2000,
            image_url="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
            rating=3
        ),
        CatalogItem(
            name="Luxury Hotel - Goa", 
            type="hotel", 
            destination="Goa", 
            supplier="Beach Resort", 
            default_price=8000,
            image_url="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
            rating=5
        ),
        CatalogItem(
            name="Resort Hotel - Goa", 
            type="hotel", 
            destination="Goa", 
            supplier="Seaside Resort", 
            default_price=6000,
            image_url="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
            rating=4
        ),
        CatalogItem(
            name="Private Cab - SUV", 
            type="transport", 
            destination="All", 
            supplier="Quick Cabs", 
            default_price=3000,
            image_url="https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800"
        ),
        CatalogItem(
            name="Private Cab - Sedan", 
            type="transport", 
            destination="All", 
            supplier="Quick Cabs", 
            default_price=2000,
            image_url="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800"
        ),
        CatalogItem(
            name="Paragliding", 
            type="activity", 
            destination="Manali", 
            supplier="Adventure Co", 
            default_price=2500,
            image_url="https://images.unsplash.com/photo-1529413683045-2a8e34f10d87?w=800"
        ),
        CatalogItem(
            name="River Rafting", 
            type="activity", 
            destination="Rishikesh", 
            supplier="Rapids Inc", 
            default_price=1500,
            image_url="https://images.unsplash.com/photo-1594122230689-45899d9e6f69?w=800"
        ),
        CatalogItem(
            name="Scuba Diving", 
            type="activity", 
            destination="Goa", 
            supplier="Deep Blue", 
            default_price=4500,
            image_url="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"
        ),
        CatalogItem(
            name="Breakfast Buffet", 
            type="meal", 
            destination="All", 
            supplier="Various", 
            default_price=500,
            image_url="https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800"
        ),
        CatalogItem(
            name="Dinner Buffet", 
            type="meal", 
            destination="All", 
            supplier="Various", 
            default_price=800,
            image_url="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"
        ),
    ]
    for item in catalog_items:
        await db.catalog.insert_one(item.dict())
    
    # Seed Admin Settings with defaults
    admin_settings = AdminSettings(
        privacy_policy="""
        PRIVACY POLICY
        
        At TravelCo, we are committed to protecting your privacy and personal information. This policy outlines how we collect, use, and safeguard your data.
        
        Information Collection:
        - We collect personal information such as name, email, phone number, and travel preferences when you create an account or make a booking.
        - Payment information is processed securely through our payment partners and is not stored on our servers.
        
        Use of Information:
        - Your information is used to process bookings, provide customer support, and improve our services.
        - We may send promotional emails with your consent, which you can opt out of at any time.
        
        Data Security:
        - We implement industry-standard security measures to protect your data.
        - Your information is encrypted during transmission and storage.
        
        Third-Party Sharing:
        - We do not sell your personal information to third parties.
        - We may share necessary information with travel partners (hotels, airlines) to fulfill your bookings.
        
        Your Rights:
        - You have the right to access, modify, or delete your personal information.
        - Contact us at privacy@travelco.com for any privacy-related concerns.
        
        Last Updated: January 2025
        """,
        terms_and_conditions="""
        TERMS AND CONDITIONS
        
        Welcome to TravelCo. By using our services, you agree to the following terms:
        
        1. BOOKING AND PAYMENT
        - All bookings require a 30% advance payment to confirm your reservation.
        - Full payment must be received 15 days before travel date.
        - Prices are subject to change until booking is confirmed with advance payment.
        
        2. CANCELLATION POLICY
        - Cancellations made 30+ days before travel: 90% refund
        - Cancellations made 15-29 days before travel: 50% refund
        - Cancellations made less than 15 days: No refund
        - Cancellation charges may vary for special packages (peak season, festivals, etc.)
        
        3. MODIFICATIONS
        - Changes to travel dates or itinerary are subject to availability and may incur additional charges.
        - Modifications must be requested at least 7 days before travel.
        
        4. TRAVEL DOCUMENTS
        - Valid government-issued ID is mandatory for all travelers.
        - International travel requires valid passport and visa (where applicable).
        - Travelers are responsible for ensuring all documents are in order.
        
        5. INCLUSIONS AND EXCLUSIONS
        - Services included are explicitly mentioned in your quotation.
        - Personal expenses, optional activities, and items not mentioned in inclusions are at traveler's expense.
        
        6. LIABILITY
        - TravelCo acts as an intermediary between travelers and service providers.
        - We are not liable for delays, cancellations, or changes made by airlines, hotels, or other service providers.
        - Travel insurance is strongly recommended.
        
        7. FORCE MAJEURE
        - We are not responsible for circumstances beyond our control (natural disasters, strikes, political unrest, pandemics).
        
        8. DISPUTES
        - Any disputes will be subject to jurisdiction of courts in Mumbai, India.
        
        For questions, contact us at support@travelco.com
        """,
        default_inclusions=[
            "Accommodation as per itinerary",
            "Daily breakfast",
            "All transfers and sightseeing by private vehicle",
            "Driver allowance and fuel charges",
            "Parking and toll charges",
            "All applicable hotel taxes"
        ],
        default_exclusions=[
            "Airfare / Train fare",
            "Lunch and dinner (unless specified)",
            "Entry fees to monuments and tourist attractions",
            "Personal expenses (laundry, telephone, tips)",
            "Travel insurance",
            "Any expenses arising due to unforeseen circumstances",
            "GST (Goods and Services Tax) - 5%",
            "Anything not mentioned in inclusions"
        ],
        testimonials=[
            Testimonial(
                name="Amit Patel",
                rating=5,
                text="Exceptional service! Our Manali trip was perfectly organized. The hotel was amazing and all transfers were smooth. Highly recommend TravelCo!"
            ),
            Testimonial(
                name="Priya Sharma",
                rating=5,
                text="Best honeymoon package ever! The team took care of every detail. The beach resort in Goa was paradise. Thank you TravelCo!"
            ),
            Testimonial(
                name="Rajesh Kumar",
                rating=5,
                text="Great experience with TravelCo. Professional service, competitive pricing, and excellent customer support throughout our family vacation."
            )
        ]
    )
    await db.admin_settings.insert_one(admin_settings.dict())
    
    # Seed requests
    requests = [
        TravelRequest(
            client_name="Rajesh Kumar",
            client_email="rajesh@example.com",
            client_phone="+919876543210",
            client_country_code="+91",
            title="Family Trip to Manali",
            people_count=4,
            budget_min=50000,
            budget_max=80000,
            travel_vibe=["hill", "adventure"],
            preferred_dates="15-20 Dec 2025",
            destination="Manali",
            status=RequestStatus.PENDING,
            assigned_salesperson_id="sales-001",
            assigned_salesperson_name="Sales Executive",
            created_by="sales-001",
            next_follow_up=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        ),
        TravelRequest(
            client_name="Priya Sharma",
            client_email="priya@example.com",
            client_phone="+919876543211",
            client_country_code="+91",
            title="Honeymoon Package - Goa",
            people_count=2,
            budget_min=60000,
            budget_max=100000,
            travel_vibe=["beach", "romantic"],
            preferred_dates="10-17 Jan 2026",
            destination="Goa",
            status=RequestStatus.QUOTED,
            assigned_salesperson_id="sales-001",
            assigned_salesperson_name="Sales Executive",
            created_by="sales-001"
        )
    ]
    
    for req in requests:
        await db.requests.insert_one(req.dict())
        
        # Create activity
        activity = Activity(
            request_id=req.id,
            actor_id="sales-001",
            actor_name="Sales Executive",
            actor_role="sales",
            action="created",
            notes=f"Request created for {req.client_name}"
        )
        await db.activities.insert_one(activity.dict())
    
    # Seed a quotation for the second request
    line_items_option_a = [
        LineItem(type="hotel", name="Luxury Hotel - Goa", supplier="Beach Resort", unit_price=8000, quantity=7, tax_percent=18.0),
        LineItem(type="transport", name="Private Cab - Sedan", supplier="Quick Cabs", unit_price=2000, quantity=1, tax_percent=18.0),
        LineItem(type="activity", name="Scuba Diving", supplier="Deep Blue", unit_price=4500, quantity=2, tax_percent=18.0),
        LineItem(type="meal", name="Breakfast Buffet", supplier="Various", unit_price=500, quantity=14, tax_percent=18.0),
    ]
    
    # Calculate totals
    for item in line_items_option_a:
        item_subtotal = item.unit_price * item.quantity
        item.total = item_subtotal + (item_subtotal * item.tax_percent / 100)
    
    option_a = QuotationOption(
        name="Option A - Premium Package",
        line_items=line_items_option_a,
        subtotal=sum(item.unit_price * item.quantity for item in line_items_option_a),
        tax_amount=sum(item.unit_price * item.quantity * item.tax_percent / 100 for item in line_items_option_a),
        total=sum(item.total for item in line_items_option_a),
        is_recommended=True
    )
    
    version = QuotationVersion(
        version_number=1,
        options=[option_a],
        created_by="ops-001",
        created_by_name="Operations Manager",
        change_notes="Initial quotation"
    )
    
    quotation = Quotation(
        request_id=requests[1].id,
        versions=[version],
        status=QuotationStatus.SENT,
        expiry_date=(datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
        published_at=datetime.now(timezone.utc).isoformat(),
        advance_percent=30.0,
        advance_amount=option_a.total * 0.3,
        grand_total=option_a.total
    )
    
    await db.quotations.insert_one(quotation.dict())
    
    # Create activity
    activity = Activity(
        request_id=requests[1].id,
        actor_id="ops-001",
        actor_name="Operations Manager",
        actor_role="operations",
        action="published",
        notes="Proforma published and sent to customer"
    )
    await db.activities.insert_one(activity.dict())
    
    return {"success": True, "message": "Mock data seeded successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)