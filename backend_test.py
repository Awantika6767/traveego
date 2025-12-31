#!/usr/bin/env python3
"""
Backend API Testing for Travel Management System
Tests the following APIs:
1. Open Requests API
2. Assign Request API with limit validation
3. Proforma Invoice PDF Download
4. Country Code in Registration
5. Country Code in Request Creation
"""

import requests
import json
import uuid
from datetime import datetime, timezone
import os
import sys

# Backend URL from environment
BACKEND_URL = "https://invoice-manager-251.preview.emergentagent.com/api"

# Test users for authentication
TEST_USERS = {
    "ops": {"email": "ops@travel.com", "password": "ops123"},
    "sales": {"email": "sales@travel.com", "password": "sales123"}
}

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_tokens = {}
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self, user_type):
        """Authenticate user and store token"""
        try:
            user_creds = TEST_USERS[user_type]
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json=user_creds,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.auth_tokens[user_type] = data.get("token")
                    self.log_result(
                        f"Authentication - {user_type}",
                        True,
                        f"Successfully authenticated {user_type} user"
                    )
                    return True
                else:
                    self.log_result(
                        f"Authentication - {user_type}",
                        False,
                        "Authentication failed - invalid response",
                        {"response": data}
                    )
                    return False
            else:
                self.log_result(
                    f"Authentication - {user_type}",
                    False,
                    f"Authentication failed - HTTP {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result(
                f"Authentication - {user_type}",
                False,
                f"Authentication error: {str(e)}"
            )
            return False
    
    def seed_test_data(self):
        """Seed test data using the seed endpoint"""
        try:
            response = self.session.post(f"{BACKEND_URL}/seed", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result(
                        "Seed Test Data",
                        True,
                        "Successfully seeded test data"
                    )
                    return True
                else:
                    self.log_result(
                        "Seed Test Data",
                        False,
                        "Failed to seed data - invalid response",
                        {"response": data}
                    )
                    return False
            else:
                self.log_result(
                    "Seed Test Data",
                    False,
                    f"Failed to seed data - HTTP {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Seed Test Data",
                False,
                f"Seed data error: {str(e)}"
            )
            return False
    
    def test_open_requests_api(self):
        """Test GET /api/requests/open/list"""
        try:
            response = self.session.get(f"{BACKEND_URL}/requests/open/list", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify it returns a list
                if isinstance(data, list):
                    # Check if requests have no assigned salesperson
                    valid_requests = True
                    for request in data:
                        if request.get("assigned_salesperson_id") not in [None, "", ""]:
                            valid_requests = False
                            break
                        if request.get("status") != "PENDING":
                            valid_requests = False
                            break
                    
                    if valid_requests:
                        self.log_result(
                            "Open Requests API",
                            True,
                            f"Successfully retrieved {len(data)} open requests",
                            {"count": len(data)}
                        )
                        return data
                    else:
                        self.log_result(
                            "Open Requests API",
                            False,
                            "API returned requests with assigned salesperson or non-PENDING status",
                            {"sample_request": data[0] if data else None}
                        )
                        return None
                else:
                    self.log_result(
                        "Open Requests API",
                        False,
                        "API did not return a list",
                        {"response_type": type(data).__name__}
                    )
                    return None
            else:
                self.log_result(
                    "Open Requests API",
                    False,
                    f"API failed - HTTP {response.status_code}",
                    {"response": response.text}
                )
                return None
                
        except Exception as e:
            self.log_result(
                "Open Requests API",
                False,
                f"API error: {str(e)}"
            )
            return None
    
    def test_assign_request_api(self, request_id=None):
        """Test POST /api/requests/{request_id}/assign-to-me"""
        try:
            # If no request_id provided, create an unassigned request for testing
            if not request_id:
                # Create an unassigned request for testing
                test_request_data = {
                    "id": str(uuid.uuid4()),
                    "client_name": "Test Assignment Client",
                    "client_email": "testassign@example.com",
                    "client_phone": "9876543210",
                    "client_country_code": "+91",
                    "title": "Test Assignment Request",
                    "people_count": 2,
                    "budget_min": 20000,
                    "budget_max": 40000,
                    "travel_vibe": ["beach"],
                    "preferred_dates": "2025-12-15 to 2025-12-20",
                    "destination": "Test Location",
                    "status": "PENDING",
                    "created_by": "sales-001"
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/requests",
                    json=test_request_data,
                    timeout=30
                )
                
                if response.status_code != 200:
                    self.log_result(
                        "Assign Request API",
                        False,
                        "Failed to create test request for assignment",
                        {"status_code": response.status_code}
                    )
                    return False
                
                request_id = test_request_data["id"]
            
            # Test assignment
            assign_data = {
                "salesperson_id": "sales-001",
                "salesperson_name": "Sales Executive"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/requests/{request_id}/assign-to-me",
                json=assign_data,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result(
                        "Assign Request API",
                        True,
                        "Successfully assigned request to salesperson"
                    )
                    
                    # Test the 10 request limit by creating multiple requests and assigning them
                    return self.test_assignment_limit()
                else:
                    self.log_result(
                        "Assign Request API",
                        False,
                        "Assignment failed - invalid response",
                        {"response": data}
                    )
                    return False
            else:
                self.log_result(
                    "Assign Request API",
                    False,
                    f"Assignment failed - HTTP {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Assign Request API",
                False,
                f"Assignment error: {str(e)}"
            )
            return False
    
    def test_assignment_limit(self):
        """Test the 10 request assignment limit"""
        try:
            # Create multiple test requests to test the limit
            created_requests = []
            
            for i in range(12):  # Create 12 requests to test the limit
                request_data = {
                    "id": str(uuid.uuid4()),
                    "client_name": f"Test Client {i+1}",
                    "client_email": f"testclient{i+1}@example.com",
                    "client_phone": f"987654321{i}",
                    "client_country_code": "+91",
                    "title": f"Test Trip {i+1}",
                    "people_count": 2,
                    "budget_min": 10000,
                    "budget_max": 20000,
                    "travel_vibe": ["beach"],
                    "preferred_dates": "2025-12-01 to 2025-12-07",
                    "destination": "Test Destination",
                    "status": "PENDING",
                    "created_by": "sales-001"
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/requests",
                    json=request_data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    created_requests.append(request_data["id"])
            
            # Now try to assign all requests to the same salesperson
            successful_assignments = 0
            limit_reached = False
            
            assign_data = {
                "salesperson_id": "sales-001",
                "salesperson_name": "Sales Executive"
            }
            
            for request_id in created_requests:
                response = self.session.post(
                    f"{BACKEND_URL}/requests/{request_id}/assign-to-me",
                    json=assign_data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    successful_assignments += 1
                elif response.status_code == 400:
                    # Check if it's the limit error
                    data = response.json()
                    if "maximum limit of 10" in data.get("detail", ""):
                        limit_reached = True
                        break
            
            if limit_reached and successful_assignments <= 10:
                self.log_result(
                    "Assignment Limit Validation",
                    True,
                    f"Limit validation working - {successful_assignments} assignments before limit reached"
                )
                return True
            else:
                self.log_result(
                    "Assignment Limit Validation",
                    False,
                    f"Limit validation failed - {successful_assignments} assignments, limit not enforced"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Assignment Limit Validation",
                False,
                f"Limit test error: {str(e)}"
            )
            return False
    
    def test_proforma_pdf_download(self):
        """Test GET /api/quotations/{quotation_id}/download-proforma"""
        try:
            # First get quotations to find one with SENT status
            response = self.session.get(f"{BACKEND_URL}/quotations", timeout=30)
            
            if response.status_code != 200:
                self.log_result(
                    "Proforma PDF Download",
                    False,
                    "Failed to get quotations list",
                    {"status_code": response.status_code}
                )
                return False
            
            quotations = response.json()
            sent_quotation = None
            
            for quotation in quotations:
                if quotation.get("status") == "SENT":
                    sent_quotation = quotation
                    break
            
            if not sent_quotation:
                self.log_result(
                    "Proforma PDF Download",
                    False,
                    "No SENT quotations found for PDF download test"
                )
                return False
            
            # Test PDF download
            quotation_id = sent_quotation["id"]
            response = self.session.get(
                f"{BACKEND_URL}/quotations/{quotation_id}/download-proforma",
                timeout=30
            )
            
            if response.status_code == 200:
                # Check if response is PDF
                content_type = response.headers.get("content-type", "")
                content_disposition = response.headers.get("content-disposition", "")
                
                if "application/pdf" in content_type and "attachment" in content_disposition:
                    # Check if content is actually PDF (starts with %PDF)
                    content = response.content
                    if content.startswith(b'%PDF'):
                        self.log_result(
                            "Proforma PDF Download",
                            True,
                            f"Successfully downloaded PDF ({len(content)} bytes)",
                            {"content_type": content_type, "size": len(content)}
                        )
                        return True
                    else:
                        self.log_result(
                            "Proforma PDF Download",
                            False,
                            "Response is not a valid PDF file",
                            {"content_start": content[:20]}
                        )
                        return False
                else:
                    self.log_result(
                        "Proforma PDF Download",
                        False,
                        "Response headers indicate non-PDF content",
                        {"content_type": content_type, "content_disposition": content_disposition}
                    )
                    return False
            else:
                self.log_result(
                    "Proforma PDF Download",
                    False,
                    f"PDF download failed - HTTP {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Proforma PDF Download",
                False,
                f"PDF download error: {str(e)}"
            )
            return False
    
    def test_country_code_registration(self):
        """Test POST /api/auth/register with country_code field"""
        try:
            # Test registration with country code
            registration_data = {
                "email": f"testuser_{uuid.uuid4().hex[:8]}@example.com",
                "name": "Test User",
                "phone": "9876543210",
                "country_code": "+1",  # US country code
                "password": "testpass123"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/register",
                json=registration_data,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result(
                        "Country Code Registration",
                        True,
                        "Successfully registered user with country code"
                    )
                    return True
                else:
                    self.log_result(
                        "Country Code Registration",
                        False,
                        "Registration failed - invalid response",
                        {"response": data}
                    )
                    return False
            else:
                self.log_result(
                    "Country Code Registration",
                    False,
                    f"Registration failed - HTTP {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Country Code Registration",
                False,
                f"Registration error: {str(e)}"
            )
            return False
    
    def test_country_code_request_creation(self):
        """Test POST /api/requests with client_country_code field"""
        try:
            # Test request creation with country code
            request_data = {
                "id": str(uuid.uuid4()),
                "client_name": "International Client",
                "client_email": "intlclient@example.com",
                "client_phone": "1234567890",
                "client_country_code": "+44",  # UK country code
                "title": "International Trip Request",
                "people_count": 3,
                "budget_min": 50000,
                "budget_max": 100000,
                "travel_vibe": ["adventure", "cultural"],
                "preferred_dates": "2025-06-01 to 2025-06-10",
                "destination": "India",
                "status": "PENDING",
                "created_by": "sales-001"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/requests",
                json=request_data,
                timeout=30
            )
            
            if response.status_code == 200:
                created_request = response.json()
                
                # Verify country code was stored correctly
                if created_request.get("client_country_code") == "+44":
                    self.log_result(
                        "Country Code Request Creation",
                        True,
                        "Successfully created request with country code"
                    )
                    return True
                else:
                    self.log_result(
                        "Country Code Request Creation",
                        False,
                        "Country code not stored correctly",
                        {"expected": "+44", "actual": created_request.get("client_country_code")}
                    )
                    return False
            else:
                self.log_result(
                    "Country Code Request Creation",
                    False,
                    f"Request creation failed - HTTP {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Country Code Request Creation",
                False,
                f"Request creation error: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests...")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Step 1: Seed test data
        if not self.seed_test_data():
            print("❌ Failed to seed test data. Stopping tests.")
            return False
        
        # Step 2: Authenticate users
        if not self.authenticate("ops"):
            print("❌ Failed to authenticate ops user. Stopping tests.")
            return False
            
        if not self.authenticate("sales"):
            print("❌ Failed to authenticate sales user. Stopping tests.")
            return False
        
        # Step 3: Run API tests
        print("\n📋 Testing Backend APIs...")
        
        # Test 1: Open Requests API
        self.test_open_requests_api()
        
        # Test 2: Assign Request API with limit validation
        self.test_assign_request_api()
        
        # Test 3: Proforma PDF Download
        self.test_proforma_pdf_download()
        
        # Test 4: Country Code Registration
        self.test_country_code_registration()
        
        # Test 5: Country Code Request Creation
        self.test_country_code_request_creation()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)