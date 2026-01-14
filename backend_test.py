#!/usr/bin/env python3
"""
Backend Testing Suite for Quotation PDF Payload Feature
Tests the new pdf_payload field in Quotation model and related endpoints
"""

import requests
import json
import uuid
from datetime import datetime, timezone
import sys

# Backend URL from environment
BACKEND_URL = "https://quote-json-builder.preview.emergentagent.com/api"

class QuotationPDFPayloadTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.created_quotation_id = None
        self.created_request_id = None
        
    def log_test(self, test_name, success, message="", details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "message": message,
            "details": details
        })
        print(f"{status}: {test_name}")
        if message:
            print(f"    {message}")
        if details and not success:
            print(f"    Details: {details}")
    
    def create_test_request(self):
        """Create a test travel request for quotation testing"""
        try:
            request_data = {
                "id": str(uuid.uuid4()),
                "client_name": "John Doe",
                "client_email": "john.doe@example.com",
                "client_phone": "9876543210",
                "client_country_code": "+1",
                "title": "Magical Manali Family Trip",
                "people_count": 4,
                "budget_min": 50000.0,
                "budget_max": 75000.0,
                "travel_vibe": ["hill", "adventure", "family"],
                "preferred_dates": "2024-03-15 to 2024-03-20",
                "destination": "Manali",
                "special_requirements": "Family trip with kids",
                "created_by": "test-customer-001",
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            response = self.session.post(f"{BACKEND_URL}/requests", json=request_data)
            
            if response.status_code == 200:
                self.created_request_id = request_data["id"]
                self.log_test("Create test travel request", True, f"Request ID: {self.created_request_id}")
                return True
            else:
                self.log_test("Create test travel request", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Create test travel request", False, f"Exception: {str(e)}")
            return False
    
    def test_quotation_model_with_pdf_payload(self):
        """Test 1: Create quotation with pdf_payload field"""
        try:
            # Sample PDF payload matching travel quotation JSON structure
            pdf_payload = {
                "tripTitle": "Magical Manali Adventure",
                "pricing": {
                    "subtotal": 60000.0,
                    "taxes": 10800.0,
                    "discount": 5000.0,
                    "total": 65800.0,
                    "perPerson": 16450.0,
                    "depositDue": 19740.0,
                    "currency": "INR"
                },
                "days": [
                    {
                        "dayNumber": 1,
                        "date": "2024-03-15",
                        "location": "Delhi to Manali",
                        "activities": [
                            {
                                "time": "06:00",
                                "title": "Departure from Delhi",
                                "description": "Start your journey to the beautiful hill station",
                                "meetingPoint": "Delhi Airport",
                                "type": "transport"
                            }
                        ]
                    },
                    {
                        "dayNumber": 2,
                        "date": "2024-03-16",
                        "location": "Manali Sightseeing",
                        "activities": [
                            {
                                "time": "09:00",
                                "title": "Hadimba Temple Visit",
                                "description": "Visit the famous wooden temple",
                                "meetingPoint": "Hotel Lobby",
                                "type": "sightseeing"
                            }
                        ]
                    }
                ],
                "terms": {
                    "cancellation": "Free cancellation up to 7 days before travel",
                    "payment": "30% advance required to confirm booking",
                    "inclusions": ["Accommodation", "Meals", "Transportation", "Guide"],
                    "exclusions": ["Personal expenses", "Tips", "Insurance"]
                },
                "testimonials": [
                    {
                        "name": "Sarah Johnson",
                        "rating": 5,
                        "comment": "Amazing experience! Highly recommended."
                    }
                ],
                "privacyPolicy": "Your data is safe with us. We follow strict privacy guidelines.",
                "bookingRef": "MAN2024001"
            }
            
            quotation_data = {
                "id": str(uuid.uuid4()),
                "request_id": self.created_request_id,
                "versions": [
                    {
                        "version": 1,
                        "line_items": [
                            {
                                "id": str(uuid.uuid4()),
                                "name": "Manali Hotel Package",
                                "supplier": "Hotel Paradise",
                                "unit_price": 5000.0,
                                "quantity": 4,
                                "total": 20000.0
                            },
                            {
                                "id": str(uuid.uuid4()),
                                "name": "Transportation",
                                "supplier": "Travel Express",
                                "unit_price": 15000.0,
                                "quantity": 1,
                                "total": 15000.0
                            }
                        ],
                        "subtotal": 35000.0,
                        "tax_amount": 6300.0,
                        "discount_amount": 1000.0,
                        "total_amount": 40300.0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                ],
                "status": "DRAFT",
                "advance_percent": 30.0,
                "advance_amount": 12090.0,
                "grand_total": 40300.0,
                "pdf_payload": pdf_payload,  # This is the key field we're testing
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            response = self.session.post(f"{BACKEND_URL}/quotations", json=quotation_data)
            
            if response.status_code == 200:
                created_quotation = response.json()
                self.created_quotation_id = created_quotation["id"]
                
                # Verify pdf_payload is present and matches
                if "pdf_payload" in created_quotation and created_quotation["pdf_payload"] == pdf_payload:
                    self.log_test("POST /api/quotations with pdf_payload", True, 
                                f"Quotation created with ID: {self.created_quotation_id}")
                    return True
                else:
                    self.log_test("POST /api/quotations with pdf_payload", False, 
                                "pdf_payload not stored correctly", created_quotation.get("pdf_payload"))
                    return False
            else:
                self.log_test("POST /api/quotations with pdf_payload", False, 
                            f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("POST /api/quotations with pdf_payload", False, f"Exception: {str(e)}")
            return False
    
    def test_get_quotation_with_pdf_payload(self):
        """Test 2: GET quotation by ID returns pdf_payload unchanged"""
        try:
            response = self.session.get(f"{BACKEND_URL}/quotations/{self.created_quotation_id}")
            
            if response.status_code == 200:
                quotation = response.json()
                
                # Verify pdf_payload is present and contains expected structure
                if "pdf_payload" in quotation and quotation["pdf_payload"]:
                    pdf_payload = quotation["pdf_payload"]
                    
                    # Check key fields exist
                    required_fields = ["tripTitle", "pricing", "days", "terms", "testimonials"]
                    missing_fields = [field for field in required_fields if field not in pdf_payload]
                    
                    if not missing_fields:
                        self.log_test("GET /api/quotations/{id} returns pdf_payload", True, 
                                    "pdf_payload retrieved with all required fields")
                        return True
                    else:
                        self.log_test("GET /api/quotations/{id} returns pdf_payload", False, 
                                    f"Missing fields: {missing_fields}")
                        return False
                else:
                    self.log_test("GET /api/quotations/{id} returns pdf_payload", False, 
                                "pdf_payload not found in response")
                    return False
            else:
                self.log_test("GET /api/quotations/{id} returns pdf_payload", False, 
                            f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("GET /api/quotations/{id} returns pdf_payload", False, f"Exception: {str(e)}")
            return False
    
    def test_get_all_quotations_with_pdf_payload(self):
        """Test 3: GET all quotations returns pdf_payload"""
        try:
            response = self.session.get(f"{BACKEND_URL}/quotations")
            
            if response.status_code == 200:
                quotations = response.json()
                
                # Find our test quotation
                test_quotation = None
                for q in quotations:
                    if q["id"] == self.created_quotation_id:
                        test_quotation = q
                        break
                
                if test_quotation and "pdf_payload" in test_quotation and test_quotation["pdf_payload"]:
                    self.log_test("GET /api/quotations returns pdf_payload", True, 
                                "pdf_payload present in quotations list")
                    return True
                else:
                    self.log_test("GET /api/quotations returns pdf_payload", False, 
                                "pdf_payload not found in quotations list")
                    return False
            else:
                self.log_test("GET /api/quotations returns pdf_payload", False, 
                            f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("GET /api/quotations returns pdf_payload", False, f"Exception: {str(e)}")
            return False
    
    def test_update_quotation_with_pdf_payload(self):
        """Test 4: PUT quotation updates pdf_payload correctly"""
        try:
            # First get the current quotation
            response = self.session.get(f"{BACKEND_URL}/quotations/{self.created_quotation_id}")
            if response.status_code != 200:
                self.log_test("PUT /api/quotations/{id} with pdf_payload", False, 
                            "Could not fetch quotation for update")
                return False
            
            quotation = response.json()
            
            # Update the pdf_payload
            updated_pdf_payload = quotation["pdf_payload"].copy()
            updated_pdf_payload["tripTitle"] = "Updated Magical Manali Adventure"
            updated_pdf_payload["pricing"]["total"] = 70000.0
            updated_pdf_payload["terms"]["cancellation"] = "Updated: Free cancellation up to 10 days before travel"
            
            quotation["pdf_payload"] = updated_pdf_payload
            quotation["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            # Update the quotation
            response = self.session.put(f"{BACKEND_URL}/quotations/{self.created_quotation_id}", json=quotation)
            
            if response.status_code == 200:
                updated_quotation = response.json()
                
                # Verify the pdf_payload was updated
                if (updated_quotation["pdf_payload"]["tripTitle"] == "Updated Magical Manali Adventure" and
                    updated_quotation["pdf_payload"]["pricing"]["total"] == 70000.0):
                    self.log_test("PUT /api/quotations/{id} with pdf_payload", True, 
                                "pdf_payload updated successfully")
                    return True
                else:
                    self.log_test("PUT /api/quotations/{id} with pdf_payload", False, 
                                "pdf_payload not updated correctly")
                    return False
            else:
                self.log_test("PUT /api/quotations/{id} with pdf_payload", False, 
                            f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("PUT /api/quotations/{id} with pdf_payload", False, f"Exception: {str(e)}")
            return False
    
    def test_quotation_without_pdf_payload(self):
        """Test 5: Create quotation without pdf_payload (regression test)"""
        try:
            quotation_data = {
                "id": str(uuid.uuid4()),
                "request_id": self.created_request_id,
                "versions": [
                    {
                        "version": 1,
                        "line_items": [
                            {
                                "id": str(uuid.uuid4()),
                                "name": "Basic Package",
                                "supplier": "Test Supplier",
                                "unit_price": 1000.0,
                                "quantity": 2,
                                "total": 2000.0
                            }
                        ],
                        "subtotal": 2000.0,
                        "tax_amount": 360.0,
                        "discount_amount": 0.0,
                        "total_amount": 2360.0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                ],
                "status": "DRAFT",
                "advance_percent": 30.0,
                "advance_amount": 708.0,
                "grand_total": 2360.0,
                # Note: No pdf_payload field
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            response = self.session.post(f"{BACKEND_URL}/quotations", json=quotation_data)
            
            if response.status_code == 200:
                created_quotation = response.json()
                
                # Verify pdf_payload is None or not present
                pdf_payload = created_quotation.get("pdf_payload")
                if pdf_payload is None:
                    self.log_test("Create quotation without pdf_payload (regression)", True, 
                                "Quotation created successfully without pdf_payload")
                    return True
                else:
                    self.log_test("Create quotation without pdf_payload (regression)", False, 
                                f"Unexpected pdf_payload: {pdf_payload}")
                    return False
            else:
                self.log_test("Create quotation without pdf_payload (regression)", False, 
                            f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Create quotation without pdf_payload (regression)", False, f"Exception: {str(e)}")
            return False
    
    def test_existing_quotation_endpoints(self):
        """Test 6: Verify existing quotation endpoints still work (regression)"""
        try:
            # Test publish quotation
            publish_data = {
                "expiry_date": "2024-04-15",
                "notes": "Test publication"
            }
            
            response = self.session.post(f"{BACKEND_URL}/quotations/{self.created_quotation_id}/publish", 
                                       json=publish_data)
            
            if response.status_code == 200:
                self.log_test("POST /api/quotations/{id}/publish (regression)", True, 
                            "Publish endpoint working correctly")
                
                # Test download proforma
                response = self.session.get(f"{BACKEND_URL}/quotations/{self.created_quotation_id}/download-proforma")
                
                if response.status_code == 200 and response.headers.get('content-type') == 'application/pdf':
                    self.log_test("GET /api/quotations/{id}/download-proforma (regression)", True, 
                                f"PDF generated successfully ({len(response.content)} bytes)")
                    return True
                else:
                    self.log_test("GET /api/quotations/{id}/download-proforma (regression)", False, 
                                f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
                    return False
            else:
                self.log_test("POST /api/quotations/{id}/publish (regression)", False, 
                            f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Existing quotation endpoints (regression)", False, f"Exception: {str(e)}")
            return False
    
    def test_generate_pdf_endpoint(self):
        """Test 7: Verify /api/generate-pdf endpoint still works with QuotationData"""
        try:
            # Sample QuotationData for PDF generation
            quotation_data = {
                "bookingRef": "TEST2024001",
                "tripTitle": "Test PDF Generation",
                "salesperson": {
                    "name": "Test Agent",
                    "phone": "+91-9876543210",
                    "email": "agent@travel.com",
                    "photo": "https://example.com/photo.jpg"
                },
                "summary": {
                    "duration": "5 Days 4 Nights",
                    "travelers": 2,
                    "rating": 4.8,
                    "highlights": ["Scenic Views", "Adventure Activities", "Cultural Experience"]
                },
                "pricing": {
                    "subtotal": 25000.0,
                    "taxes": 4500.0,
                    "discount": 2000.0,
                    "total": 27500.0,
                    "perPerson": 13750.0,
                    "depositDue": 8250.0,
                    "currency": "INR"
                },
                "days": [
                    {
                        "dayNumber": 1,
                        "date": "2024-03-15",
                        "location": "Test Location",
                        "activities": [
                            {
                                "time": "09:00",
                                "title": "Test Activity",
                                "description": "Test description",
                                "meetingPoint": "Test Point",
                                "type": "sightseeing"
                            }
                        ]
                    }
                ],
                "gallery": [
                    {
                        "url": "https://example.com/image1.jpg",
                        "caption": "Test Image"
                    }
                ],
                "terms": {
                    "cancellation": "Test cancellation policy",
                    "payment": "Test payment terms",
                    "inclusions": ["Test inclusion"],
                    "exclusions": ["Test exclusion"]
                },
                "testimonials": [
                    {
                        "name": "Test Customer",
                        "rating": 5,
                        "comment": "Test testimonial"
                    }
                ],
                "privacyPolicy": "Test privacy policy"
            }
            
            response = self.session.post(f"{BACKEND_URL}/generate-pdf", json=quotation_data)
            
            if response.status_code == 200 and response.headers.get('content-type') == 'application/pdf':
                self.log_test("POST /api/generate-pdf with QuotationData (regression)", True, 
                            f"PDF generated successfully ({len(response.content)} bytes)")
                return True
            else:
                self.log_test("POST /api/generate-pdf with QuotationData (regression)", False, 
                            f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/generate-pdf with QuotationData (regression)", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🧪 Starting Quotation PDF Payload Testing Suite")
        print("=" * 60)
        
        # Setup
        if not self.create_test_request():
            print("❌ Failed to create test request. Aborting tests.")
            return False
        
        # Core tests
        tests = [
            self.test_quotation_model_with_pdf_payload,
            self.test_get_quotation_with_pdf_payload,
            self.test_get_all_quotations_with_pdf_payload,
            self.test_update_quotation_with_pdf_payload,
            self.test_quotation_without_pdf_payload,
            self.test_existing_quotation_endpoints,
            self.test_generate_pdf_endpoint
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()  # Add spacing between tests
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['message']:
                print(f"    {result['message']}")
        
        print(f"\n🎯 OVERALL RESULT: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Quotation PDF payload feature is working correctly.")
            return True
        else:
            print(f"⚠️  {total - passed} tests failed. Please review the issues above.")
            return False

def main():
    """Main test runner"""
    tester = QuotationPDFPayloadTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()