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
from fastapi.responses import StreamingResponse, FileResponse
import io
import csv
import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT



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
    country_code: Optional[str] = "+91"  # Default to India
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
        "country_code": user_data.get("country_code", "+91"),
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

# New endpoint: Get open/unassigned requests
@api_router.get("/requests/open/list", response_model=List[TravelRequest])
async def get_open_requests():
    """Get all requests that don't have an assigned salesperson"""
    query = {
        "$or": [
            {"assigned_salesperson_id": None},
            {"assigned_salesperson_id": ""},
            {"assigned_salesperson_id": {"$exists": False}}
        ],
        "status": RequestStatus.PENDING
    }
    
    requests = await db.requests.find(query).sort("created_at", -1).to_list(100)
    return [TravelRequest(**req) for req in requests]

# New endpoint: Assign request to salesperson
@api_router.post("/requests/{request_id}/assign-to-me")
async def assign_request_to_me(request_id: str, data: Dict[str, Any]):
    """Assign a request to the current salesperson with limit validation"""
    salesperson_id = data.get("salesperson_id")
    salesperson_name = data.get("salesperson_name")
    
    if not salesperson_id or not salesperson_name:
        raise HTTPException(status_code=400, detail="Salesperson information required")
    
    # Check if salesperson already has 10 or more assigned requests
    assigned_count = await db.requests.count_documents({
        "assigned_salesperson_id": salesperson_id,
        "status": {"$in": [RequestStatus.PENDING, RequestStatus.QUOTED]}
    })
    
    if assigned_count >= 10:
        raise HTTPException(status_code=400, detail="You have reached the maximum limit of 10 open requests")
    
    # Check if request exists and is unassigned
    request = await db.requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.get("assigned_salesperson_id"):
        raise HTTPException(status_code=400, detail="Request is already assigned")
    
    # Assign the request
    await db.requests.update_one(
        {"id": request_id},
        {"$set": {
            "assigned_salesperson_id": salesperson_id,
            "assigned_salesperson_name": salesperson_name,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create activity
    activity = Activity(
        request_id=request_id,
        actor_id=salesperson_id,
        actor_name=salesperson_name,
        actor_role="sales",
        action="assigned",
        notes=f"Request assigned to {salesperson_name}"
    )
    await db.activities.insert_one(activity.dict())
    
    return {"success": True, "message": "Request assigned successfully"}

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

# New endpoint: Download Invoice PDF (after payment verification)
@api_router.get("/invoices/{invoice_id}/download")
async def download_invoice(invoice_id: str):
    """Generate and download invoice as PDF after payment verification"""
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get payment details to check verification status
    payment = await db.payments.find_one({"invoice_id": invoice_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Check if payment is verified by both accountant and operations
    if payment.get("status") != PaymentStatus.VERIFIED_BY_OPS:
        raise HTTPException(status_code=400, detail="Invoice can only be downloaded after payment verification by accountant and operations manager")
    
    # Get quotation and request details
    quotation = await db.quotations.find_one({"id": invoice["quotation_id"]})
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    request = await db.requests.find_one({"id": invoice["request_id"]})
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
        textColor=colors.HexColor('#10b981'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    elements.append(Paragraph("✓ PAID", paid_style))
    elements.append(Spacer(1, 12))
    
    # Company Details
    company_data = [
        ["Travel Company Pvt Ltd", ""],
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
    
    # Get current version of quotation
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
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
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
                ('LINEABOVE', (4, -1), (-1, -1), 2, colors.HexColor('#10b981')),
                ('FONTNAME', (4, -1), (-1, -1), 'Helvetica-Bold'),
            ]))
            elements.append(items_table)
            elements.append(Spacer(1, 20))
    
    # Payment Summary
    elements.append(Paragraph("PAYMENT SUMMARY:", heading_style))
    advance_amount = invoice.get("advance_amount", 0)
    total_amount = invoice.get("total_amount", 0)
    
    payment_summary_data = [
        ["Advance Payment:", f"₹{advance_amount:,.2f}"],
        ["Balance Payment:", f"₹{total_amount - advance_amount:,.2f}"],
        ["Total Amount:", f"₹{total_amount:,.2f}"],
        ["Payment Status:", "PAID ✓"],
    ]
    
    payment_table = Table(payment_summary_data, colWidths=[4*inch, 2*inch])
    payment_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#10b981')),
        ('FONTSIZE', (0, -1), (-1, -1), 14),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#10b981')),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 20))
    
    # Payment Verification Details
    elements.append(Paragraph("PAYMENT VERIFICATION:", heading_style))
    verification_text = f"""
    <b>Payment Received:</b> {datetime.fromisoformat(payment['received_at']).strftime('%d %B %Y, %I:%M %p') if payment.get('received_at') else 'N/A'}<br/>
    <b>Verified by Operations:</b> {datetime.fromisoformat(payment['verified_at']).strftime('%d %B %Y, %I:%M %p') if payment.get('verified_at') else 'N/A'}<br/>
    <b>Payment Method:</b> {payment.get('method', 'N/A').replace('_', ' ').title()}<br/>
    """
    if payment.get('accountant_notes'):
        verification_text += f"<b>Accountant Notes:</b> {payment['accountant_notes']}<br/>"
    if payment.get('ops_notes'):
        verification_text += f"<b>Operations Notes:</b> {payment['ops_notes']}<br/>"
    
    elements.append(Paragraph(verification_text, normal_style))
    elements.append(Spacer(1, 20))
    
    # Bank Details
    elements.append(Paragraph("BANK DETAILS:", heading_style))
    bank_details = invoice.get('bank_details', {})
    bank_details_text = f"""
    <b>Account Name:</b> {bank_details.get('account_name', 'Travel Company Pvt Ltd')}<br/>
    <b>Account Number:</b> {bank_details.get('account_number', '1234567890')}<br/>
    <b>IFSC Code:</b> {bank_details.get('ifsc', 'BANK0001234')}<br/>
    <b>Bank Name:</b> {bank_details.get('bank_name', 'Example Bank')}<br/>
    <b>UPI ID:</b> {invoice.get('upi_id', 'travelcompany@upi')}
    """
    elements.append(Paragraph(bank_details_text, normal_style))
    elements.append(Spacer(1, 20))
    
    # Terms and Conditions
    elements.append(Paragraph("TERMS & CONDITIONS:", heading_style))
    terms_text = """
    1. This invoice confirms the payment received for the travel services booked.<br/>
    2. All services are subject to availability and confirmation from suppliers.<br/>
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
async def get_available_backups(role: str, start_date: str, end_date: str, exclude_user_id: Optional[str] = None):
    """Get team members who can be backup (same role, not on leave during the dates)"""
    # Get all users with the same role from MOCK_USERS
    available_users = []
    for email, user_data in MOCK_USERS.items():
        if user_data["role"] == role and user_data["id"] != exclude_user_id:
            available_users.append({
                "id": user_data["id"],
                "name": user_data["name"],
                "email": email,
                "role": user_data["role"]
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

@api_router.get("/requests/delegated")
async def get_delegated_requests(user_id: str):
    """Get requests delegated to current user (backup chain resolution)"""
    # Find all active leaves where current user is backup
    today = datetime.now(timezone.utc).date().isoformat()
    
    backup_leaves = await db.leaves.find({
        "backup_user_id": user_id,
        "status": "active",
        "start_date": {"$lte": today},
        "end_date": {"$gte": today}
    }).to_list(1000)
    
    delegated_users = []
    for leave in backup_leaves:
        delegated_users.append({
            "user_id": leave["user_id"],
            "user_name": leave["user_name"]
        })
        
        # Check if the delegated user is also a backup for someone else (chain resolution)
        # Find leaves where the delegated user is a backup
        chain_leaves = await db.leaves.find({
            "backup_user_id": leave["user_id"],
            "status": "active",
            "start_date": {"$lte": today},
            "end_date": {"$gte": today}
        }).to_list(1000)
        
        for chain_leave in chain_leaves:
            delegated_users.append({
                "user_id": chain_leave["user_id"],
                "user_name": chain_leave["user_name"]
            })
    
    # Get requests from all delegated users
    if not delegated_users:
        return []
    
    delegated_user_ids = [u["user_id"] for u in delegated_users]
    
    requests = await db.requests.find({
        "assigned_salesperson_id": {"$in": delegated_user_ids},
        "status": {"$in": [RequestStatus.PENDING, RequestStatus.QUOTED]}
    }).sort("created_at", -1).to_list(1000)
    
    # Add delegation info to each request
    result = []
    for req in requests:
        request_data = TravelRequest(**req).dict()
        # Find which delegated user this request belongs to
        for du in delegated_users:
            if du["user_id"] == req["assigned_salesperson_id"]:
                request_data["delegated_from"] = du["user_name"]
                break
        result.append(request_data)
    
    return result

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()