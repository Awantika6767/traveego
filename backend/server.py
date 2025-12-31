from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
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
from fastapi.responses import StreamingResponse
import io
import csv
import json



ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
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
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserLogin(BaseModel):
    email: str
    password: str

class TravelRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    client_email: EmailStr
    client_phone: str
    client_country_code: str = "+91"  # Default to India
    title: str
    people_count: int
    budget_min: float
    budget_max: float
    travel_vibe: List[str]  # ["hill", "beach", "adventure"]
    preferred_dates: str
    destination: Optional[str] = None
    special_requirements: Optional[str] = None
    status: RequestStatus = RequestStatus.PENDING
    assigned_salesperson_id: Optional[str] = None
    assigned_salesperson_name: Optional[str] = None
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    next_follow_up: Optional[str] = None
    sla_timer: Optional[str] = None

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
    name: str  # "Option A", "Option B"
    line_items: List[LineItem] = []
    subtotal: float = 0.0
    tax_amount: float = 0.0
    total: float = 0.0
    is_recommended: bool = False

class QuotationVersion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version_number: int
    options: List[QuotationOption] = []
    created_by: str
    created_by_name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    change_notes: Optional[str] = None
    is_current: bool = True

class Quotation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    versions: List[QuotationVersion] = []
    status: QuotationStatus = QuotationStatus.DRAFT
    expiry_date: Optional[str] = None
    published_at: Optional[str] = None
    advance_percent: float = 30.0
    advance_amount: float = 0.0
    grand_total: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    quotation_id: str
    request_id: str
    client_name: str
    client_email: str
    total_amount: float
    advance_amount: float
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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    is_read: bool = False
    link: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Mock users for login
MOCK_USERS = {
    "ops@travel.com": {"password": "ops123", "role": UserRole.OPERATIONS, "name": "Operations Manager", "id": "ops-001"},
    "sales@travel.com": {"password": "sales123", "role": UserRole.SALES, "name": "Sales Executive", "id": "sales-001"},
    "accountant@travel.com": {"password": "acc123", "role": UserRole.ACCOUNTANT, "name": "Accountant", "id": "acc-001"},
    "customer@travel.com": {"password": "customer123", "role": UserRole.CUSTOMER, "name": "John Customer", "id": "customer-001"},
}

# Auth endpoints
@api_router.post("/auth/register")
async def register_customer(user_data: Dict[str, str]):
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = {
        "id": str(uuid.uuid4()),
        "email": user_data["email"],
        "name": user_data["name"],
        "phone": user_data.get("phone", ""),
        "role": "customer",
        "password": user_data["password"],  # In production, hash this
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    return {"success": True, "message": "Account created successfully"}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    if credentials.email in MOCK_USERS:
        user_data = MOCK_USERS[credentials.email]
        if user_data["password"] == credentials.password:
            return {
                "success": True,
                "user": {
                    "id": user_data["id"],
                    "email": credentials.email,
                    "name": user_data["name"],
                    "role": user_data["role"]
                },
                "token": f"mock-token-{user_data['id']}"
            }
    raise HTTPException(status_code=401, detail="Invalid credentials")

# Request endpoints
@api_router.post("/requests", response_model=TravelRequest)
async def create_request(request: TravelRequest):
    request_dict = request.dict()
    await db.requests.insert_one(request_dict)
    
    # Create activity
    activity = Activity(
        request_id=request.id,
        actor_id=request.created_by,
        actor_name=request.assigned_salesperson_name or "System",
        actor_role="sales",
        action="created",
        notes=f"Request created for {request.client_name}"
    )
    await db.activities.insert_one(activity.dict())
    
    return request

@api_router.get("/requests", response_model=List[TravelRequest])
async def get_requests(status: Optional[str] = None, assigned_to: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_salesperson_id"] = assigned_to
    
    requests = await db.requests.find(query).to_list(1000)
    return [TravelRequest(**req) for req in requests]

@api_router.get("/requests/{request_id}", response_model=TravelRequest)
async def get_request(request_id: str):
    request = await db.requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return TravelRequest(**request)

@api_router.put("/requests/{request_id}", response_model=TravelRequest)
async def update_request(request_id: str, request: TravelRequest):
    request.updated_at = datetime.now(timezone.utc).isoformat()
    await db.requests.update_one({"id": request_id}, {"$set": request.dict()})
    return request

@api_router.post("/requests/{request_id}/cancel")
async def cancel_request(request_id: str, data: Dict[str, Any]):
    await db.requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": RequestStatus.REJECTED,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create activity
    activity = Activity(
        request_id=request_id,
        actor_id=data.get("actor_id", ""),
        actor_name=data.get("actor_name", ""),
        actor_role=data.get("actor_role", ""),
        action="cancelled",
        notes=data.get("reason", "Request cancelled")
    )
    await db.activities.insert_one(activity.dict())
    
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

# Quotation endpoints
@api_router.post("/quotations", response_model=Quotation)
async def create_quotation(quotation: Quotation):
    quotation_dict = quotation.dict()
    await db.quotations.insert_one(quotation_dict)
    
    # Update request status
    await db.requests.update_one(
        {"id": quotation.request_id},
        {"$set": {"status": RequestStatus.QUOTED, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return quotation

@api_router.get("/quotations", response_model=List[Quotation])
async def get_quotations(request_id: Optional[str] = None):
    query = {}
    if request_id:
        query["request_id"] = request_id
    
    quotations = await db.quotations.find(query).to_list(1000)
    return [Quotation(**quot) for quot in quotations]

@api_router.get("/quotations/{quotation_id}", response_model=Quotation)
async def get_quotation(quotation_id: str):
    quotation = await db.quotations.find_one({"id": quotation_id})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return Quotation(**quotation)

@api_router.put("/quotations/{quotation_id}", response_model=Quotation)
async def update_quotation(quotation_id: str, quotation: Quotation):
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

@api_router.post("/quotations/{quotation_id}/accept")
async def accept_quotation(quotation_id: str, data: Dict[str, Any]):
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
    invoice = Invoice(
        invoice_number=f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}",
        quotation_id=quotation_id,
        request_id=quotation["request_id"],
        client_name=request["client_name"],
        client_email=request["client_email"],
        total_amount=quotation["grand_total"],
        advance_amount=quotation["advance_amount"],
        due_date=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    )
    await db.invoices.insert_one(invoice.dict())
    
    # Create payment record
    payment = Payment(
        invoice_id=invoice.id,
        amount=invoice.advance_amount,
        method="pending"
    )
    await db.payments.insert_one(payment.dict())
    
    # Create activity
    activity = Activity(
        request_id=quotation["request_id"],
        actor_id=data.get("actor_id", "customer-001"),
        actor_name=data.get("actor_name", "Customer"),
        actor_role="customer",
        action="accepted",
        notes="Quotation accepted by customer"
    )
    await db.activities.insert_one(activity.dict())
    
    return {"success": True, "invoice_id": invoice.id}

# Invoice endpoints
@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(request_id: Optional[str] = None):
    query = {}
    if request_id:
        query["request_id"] = request_id
    
    invoices = await db.invoices.find(query).to_list(1000)
    return [Invoice(**inv) for inv in invoices]

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return Invoice(**invoice)

# Payment endpoints
@api_router.get("/payments", response_model=List[Payment])
async def get_payments(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    
    payments = await db.payments.find(query).to_list(1000)
    return [Payment(**pay) for pay in payments]

@api_router.get("/payments/{payment_id}", response_model=Payment)
async def get_payment(payment_id: str):
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return Payment(**payment)

@api_router.put("/payments/{payment_id}/mark-received")
async def mark_payment_received(payment_id: str, data: Dict[str, Any]):
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
    
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": status,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "ops_notes": data.get("notes", "")
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

# Notification endpoints
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(user_id: str, unread_only: bool = False):
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
async def get_dashboard_stats(role: str):
    stats = {}
    
    if role == "operations":
        # Expiring quotes
        expiring_count = await db.quotations.count_documents({
            "status": QuotationStatus.SENT,
            "expiry_date": {"$lte": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()}
        })
        
        # Pending payments
        pending_payments = await db.payments.count_documents({
            "status": {"$in": [PaymentStatus.PENDING, PaymentStatus.RECEIVED_BY_ACCOUNTANT]}
        })
        
        stats = {
            "expiring_quotes": expiring_count,
            "pending_payments": pending_payments,
            "active_requests": await db.requests.count_documents({"status": RequestStatus.PENDING}),
            "total_revenue": 0
        }
    
    elif role == "sales":
        stats = {
            "my_requests": await db.requests.count_documents({"assigned_salesperson_id": "sales-001"}),
            "pending_quotes": await db.quotations.count_documents({"status": QuotationStatus.SENT}),
            "accepted_quotes": await db.quotations.count_documents({"status": QuotationStatus.ACCEPTED})
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
            values = ', '.join(f"'{str(value).replace('\'', '\'\'')}'" for value in row.values())
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
    
    # Seed catalog
    catalog_items = [
        CatalogItem(name="Luxury Hotel - Manali", type="hotel", destination="Manali", supplier="Hotel Paradise", default_price=5000),
        CatalogItem(name="Budget Hotel - Manali", type="hotel", destination="Manali", supplier="Hotel Comfort", default_price=2000),
        CatalogItem(name="Luxury Hotel - Goa", type="hotel", destination="Goa", supplier="Beach Resort", default_price=8000),
        CatalogItem(name="Private Cab - SUV", type="transport", destination="All", supplier="Quick Cabs", default_price=3000),
        CatalogItem(name="Private Cab - Sedan", type="transport", destination="All", supplier="Quick Cabs", default_price=2000),
        CatalogItem(name="Paragliding", type="activity", destination="Manali", supplier="Adventure Co", default_price=2500),
        CatalogItem(name="River Rafting", type="activity", destination="Rishikesh", supplier="Rapids Inc", default_price=1500),
        CatalogItem(name="Scuba Diving", type="activity", destination="Goa", supplier="Deep Blue", default_price=4500),
        CatalogItem(name="Breakfast Buffet", type="meal", destination="All", supplier="Various", default_price=500),
        CatalogItem(name="Dinner Buffet", type="meal", destination="All", supplier="Various", default_price=800),
    ]
    for item in catalog_items:
        await db.catalog.insert_one(item.dict())
    
    # Seed requests
    requests = [
        TravelRequest(
            client_name="Rajesh Kumar",
            client_email="rajesh@example.com",
            client_phone="+919876543210",
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()