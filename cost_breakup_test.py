#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Cost Breakup Visibility Control Feature
Tests all Admin Control APIs for managing salesperson cost breakup permissions
"""

import requests
import json
from datetime import datetime, timedelta
import uuid

# Configuration
BASE_URL = "https://detail-quotation.preview.emergentagent.com/api"

# Test credentials from the review request
TEST_CREDENTIALS = {
    "admin": {"email": "admin@travel.com", "password": "admin123", "id": "admin-001", "name": "Admin User"},
    "sales": {"email": "sales@travel.com", "password": "sales123", "id": "sales-001", "name": "Sales Executive"},
    "operations": {"email": "ops@travel.com", "password": "ops123", "id": "ops-001", "name": "Operations Manager"},
    "customer": {"email": "customer@travel.com", "password": "customer123", "id": "customer-001", "name": "John Customer"}
}

class CostBreakupTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.auth_tokens = {}
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status}: {test_name}")
        if details:
            self.test_results.append(f"    Details: {details}")
        print(f"{status}: {test_name}")
        if details:
            print(f"    Details: {details}")
    
    def login_user(self, user_type):
        """Login and return user data with token"""
        user = TEST_CREDENTIALS[user_type]
        response = self.session.post(f"{BASE_URL}/auth/login", json={
            "email": user["email"],
            "password": user["password"]
        })
        
        if response.status_code == 200:
            data = response.json()
            self.auth_tokens[user_type] = data["token"]
            return data["user"], data["token"]
        else:
            raise Exception(f"Failed to login {user_type}: {response.text}")
    
    def get_auth_headers(self, user_type):
        """Get authorization headers for a user"""
        if user_type not in self.auth_tokens:
            self.login_user(user_type)
        return {"Authorization": f"Bearer {self.auth_tokens[user_type]}"}
    
    def test_admin_authentication(self):
        """Test 1: Admin Authentication & Authorization"""
        print("\n=== Testing Admin Authentication & Authorization ===")
        
        try:
            # Test admin login
            admin_user, admin_token = self.login_user("admin")
            
            # Verify admin login returns can_see_cost_breakup field
            if "can_see_cost_breakup" in admin_user:
                self.log_test("Admin login returns can_see_cost_breakup field", True, 
                             f"can_see_cost_breakup: {admin_user['can_see_cost_breakup']}")
            else:
                self.log_test("Admin login returns can_see_cost_breakup field", False, 
                             "can_see_cost_breakup field missing from admin user object")
            
            # Verify admin role
            if admin_user.get("role") == "admin":
                self.log_test("Admin user has correct role", True, f"Role: {admin_user['role']}")
            else:
                self.log_test("Admin user has correct role", False, f"Expected 'admin', got '{admin_user.get('role')}'")
                
        except Exception as e:
            self.log_test("Admin authentication", False, str(e))
    
    def test_non_admin_user_login(self):
        """Test login for non-admin users to verify can_see_cost_breakup field"""
        print("\n=== Testing Non-Admin User Login ===")
        
        # Test sales user login
        try:
            sales_user, sales_token = self.login_user("sales")
            
            if "can_see_cost_breakup" in sales_user:
                expected_value = False  # Default should be False for sales
                actual_value = sales_user["can_see_cost_breakup"]
                if actual_value == expected_value:
                    self.log_test("Sales user can_see_cost_breakup default value", True, 
                                 f"can_see_cost_breakup: {actual_value} (correct default)")
                else:
                    self.log_test("Sales user can_see_cost_breakup default value", False, 
                                 f"Expected {expected_value}, got {actual_value}")
            else:
                self.log_test("Sales user login returns can_see_cost_breakup field", False, 
                             "can_see_cost_breakup field missing")
                
        except Exception as e:
            self.log_test("Sales user login", False, str(e))
        
        # Test operations user login
        try:
            ops_user, ops_token = self.login_user("operations")
            
            if "can_see_cost_breakup" in ops_user:
                expected_value = True  # Operations should see cost breakup
                actual_value = ops_user["can_see_cost_breakup"]
                if actual_value == expected_value:
                    self.log_test("Operations user can_see_cost_breakup value", True, 
                                 f"can_see_cost_breakup: {actual_value} (operations can see)")
                else:
                    self.log_test("Operations user can_see_cost_breakup value", False, 
                                 f"Expected {expected_value}, got {actual_value}")
            else:
                self.log_test("Operations user login returns can_see_cost_breakup field", False, 
                             "can_see_cost_breakup field missing")
                
        except Exception as e:
            self.log_test("Operations user login", False, str(e))
        
        # Test customer user login
        try:
            customer_user, customer_token = self.login_user("customer")
            
            if "can_see_cost_breakup" in customer_user:
                expected_value = False  # Customer should never see cost breakup
                actual_value = customer_user["can_see_cost_breakup"]
                if actual_value == expected_value:
                    self.log_test("Customer user can_see_cost_breakup value", True, 
                                 f"can_see_cost_breakup: {actual_value} (customer cannot see)")
                else:
                    self.log_test("Customer user can_see_cost_breakup value", False, 
                                 f"Expected {expected_value}, got {actual_value}")
            else:
                self.log_test("Customer user login returns can_see_cost_breakup field", False, 
                             "can_see_cost_breakup field missing")
                
        except Exception as e:
            self.log_test("Customer user login", False, str(e))
    
    def test_admin_get_salespeople_endpoint(self):
        """Test 2: GET /api/admin/salespeople"""
        print("\n=== Testing GET /api/admin/salespeople ===")
        
        # Test as admin user
        try:
            admin_headers = self.get_auth_headers("admin")
            response = self.session.get(f"{BASE_URL}/admin/salespeople", headers=admin_headers)
            
            if response.status_code == 200:
                salespeople = response.json()
                self.log_test("Admin can access salespeople endpoint", True, 
                             f"Retrieved {len(salespeople)} salespeople")
                
                # Verify response structure
                if salespeople and len(salespeople) > 0:
                    first_person = salespeople[0]
                    required_fields = ["id", "name", "email", "phone", "can_see_cost_breakup", "created_at"]
                    missing_fields = [field for field in required_fields if field not in first_person]
                    
                    if not missing_fields:
                        self.log_test("Salespeople response contains required fields", True, 
                                     f"All required fields present: {required_fields}")
                    else:
                        self.log_test("Salespeople response contains required fields", False, 
                                     f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Salespeople response structure", False, "No salespeople returned")
                    
            else:
                self.log_test("Admin access to salespeople endpoint", False, 
                             f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Admin access to salespeople endpoint", False, str(e))
        
        # Test as non-admin user (should return 403)
        try:
            sales_headers = self.get_auth_headers("sales")
            response = self.session.get(f"{BASE_URL}/admin/salespeople", headers=sales_headers)
            
            if response.status_code == 403:
                self.log_test("Non-admin cannot access salespeople endpoint", True, 
                             "Correctly returned 403 Forbidden")
            else:
                self.log_test("Non-admin cannot access salespeople endpoint", False, 
                             f"Expected 403, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Non-admin access restriction", False, str(e))
    
    def test_admin_toggle_permission_endpoint(self):
        """Test 3: PUT /api/admin/salespeople/{user_id}/cost-breakup-permission"""
        print("\n=== Testing PUT /api/admin/salespeople/{user_id}/cost-breakup-permission ===")
        
        sales_user_id = "sales-001"
        
        # Test enabling cost breakup permission as admin
        try:
            admin_headers = self.get_auth_headers("admin")
            
            # Enable permission
            enable_data = {"can_see_cost_breakup": True}
            response = self.session.put(
                f"{BASE_URL}/admin/salespeople/{sales_user_id}/cost-breakup-permission",
                headers=admin_headers,
                json=enable_data
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("can_see_cost_breakup") == True:
                    self.log_test("Admin can enable cost breakup permission", True, 
                                 "Permission enabled successfully")
                else:
                    self.log_test("Admin can enable cost breakup permission", False, 
                                 f"Unexpected response: {result}")
            else:
                self.log_test("Admin can enable cost breakup permission", False, 
                             f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Admin enable cost breakup permission", False, str(e))
        
        # Test disabling cost breakup permission as admin
        try:
            admin_headers = self.get_auth_headers("admin")
            
            # Disable permission
            disable_data = {"can_see_cost_breakup": False}
            response = self.session.put(
                f"{BASE_URL}/admin/salespeople/{sales_user_id}/cost-breakup-permission",
                headers=admin_headers,
                json=disable_data
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("can_see_cost_breakup") == False:
                    self.log_test("Admin can disable cost breakup permission", True, 
                                 "Permission disabled successfully")
                else:
                    self.log_test("Admin can disable cost breakup permission", False, 
                                 f"Unexpected response: {result}")
            else:
                self.log_test("Admin can disable cost breakup permission", False, 
                             f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Admin disable cost breakup permission", False, str(e))
        
        # Test as non-admin user (should return 403)
        try:
            sales_headers = self.get_auth_headers("sales")
            
            toggle_data = {"can_see_cost_breakup": True}
            response = self.session.put(
                f"{BASE_URL}/admin/salespeople/{sales_user_id}/cost-breakup-permission",
                headers=sales_headers,
                json=toggle_data
            )
            
            if response.status_code == 403:
                self.log_test("Non-admin cannot toggle permissions", True, 
                             "Correctly returned 403 Forbidden")
            else:
                self.log_test("Non-admin cannot toggle permissions", False, 
                             f"Expected 403, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Non-admin permission toggle restriction", False, str(e))
        
        # Test with invalid user_id (should return 404)
        try:
            admin_headers = self.get_auth_headers("admin")
            
            invalid_user_id = "invalid-user-123"
            toggle_data = {"can_see_cost_breakup": True}
            response = self.session.put(
                f"{BASE_URL}/admin/salespeople/{invalid_user_id}/cost-breakup-permission",
                headers=admin_headers,
                json=toggle_data
            )
            
            if response.status_code == 404:
                self.log_test("Invalid user_id returns 404", True, 
                             "Correctly returned 404 Not Found")
            else:
                self.log_test("Invalid user_id returns 404", False, 
                             f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid user_id handling", False, str(e))
        
        # Test with non-salesperson user (should return 400)
        try:
            admin_headers = self.get_auth_headers("admin")
            
            ops_user_id = "ops-001"  # Operations user, not sales
            toggle_data = {"can_see_cost_breakup": True}
            response = self.session.put(
                f"{BASE_URL}/admin/salespeople/{ops_user_id}/cost-breakup-permission",
                headers=admin_headers,
                json=toggle_data
            )
            
            if response.status_code == 400:
                self.log_test("Non-salesperson user returns 400", True, 
                             "Correctly returned 400 Bad Request")
            else:
                self.log_test("Non-salesperson user returns 400", False, 
                             f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Non-salesperson user handling", False, str(e))
    
    def test_permission_persistence(self):
        """Test 4: Verify permission changes persist"""
        print("\n=== Testing Permission Persistence ===")
        
        sales_user_id = "sales-001"
        
        try:
            admin_headers = self.get_auth_headers("admin")
            
            # Step 1: Enable permission
            enable_data = {"can_see_cost_breakup": True}
            response = self.session.put(
                f"{BASE_URL}/admin/salespeople/{sales_user_id}/cost-breakup-permission",
                headers=admin_headers,
                json=enable_data
            )
            
            if response.status_code == 200:
                # Step 2: Fetch salespeople list to verify change
                list_response = self.session.get(f"{BASE_URL}/admin/salespeople", headers=admin_headers)
                
                if list_response.status_code == 200:
                    salespeople = list_response.json()
                    sales_person = next((sp for sp in salespeople if sp["id"] == sales_user_id), None)
                    
                    if sales_person and sales_person.get("can_see_cost_breakup") == True:
                        self.log_test("Permission change persists in database", True, 
                                     "Enabled permission verified in salespeople list")
                    else:
                        self.log_test("Permission change persists in database", False, 
                                     "Permission change not reflected in salespeople list")
                else:
                    self.log_test("Permission persistence verification", False, 
                                 f"Could not fetch salespeople list: {list_response.status_code}")
            else:
                self.log_test("Permission persistence setup", False, 
                             f"Could not enable permission: {response.status_code}")
                
        except Exception as e:
            self.log_test("Permission persistence test", False, str(e))
    
    def test_login_after_permission_change(self):
        """Test 5: Verify login reflects updated permission"""
        print("\n=== Testing Login After Permission Change ===")
        
        try:
            admin_headers = self.get_auth_headers("admin")
            sales_user_id = "sales-001"
            
            # Step 1: Enable permission for sales user
            enable_data = {"can_see_cost_breakup": True}
            response = self.session.put(
                f"{BASE_URL}/admin/salespeople/{sales_user_id}/cost-breakup-permission",
                headers=admin_headers,
                json=enable_data
            )
            
            if response.status_code == 200:
                # Step 2: Login as sales user again to verify updated value
                sales_user, sales_token = self.login_user("sales")
                
                if sales_user.get("can_see_cost_breakup") == True:
                    self.log_test("Login reflects updated permission (enabled)", True, 
                                 "Sales user login shows can_see_cost_breakup: true")
                else:
                    self.log_test("Login reflects updated permission (enabled)", False, 
                                 f"Expected true, got {sales_user.get('can_see_cost_breakup')}")
                
                # Step 3: Disable permission
                disable_data = {"can_see_cost_breakup": False}
                response = self.session.put(
                    f"{BASE_URL}/admin/salespeople/{sales_user_id}/cost-breakup-permission",
                    headers=admin_headers,
                    json=disable_data
                )
                
                if response.status_code == 200:
                    # Step 4: Login again to verify disabled permission
                    sales_user, sales_token = self.login_user("sales")
                    
                    if sales_user.get("can_see_cost_breakup") == False:
                        self.log_test("Login reflects updated permission (disabled)", True, 
                                     "Sales user login shows can_see_cost_breakup: false")
                    else:
                        self.log_test("Login reflects updated permission (disabled)", False, 
                                     f"Expected false, got {sales_user.get('can_see_cost_breakup')}")
                else:
                    self.log_test("Permission disable for login test", False, 
                                 f"Could not disable permission: {response.status_code}")
            else:
                self.log_test("Permission enable for login test", False, 
                             f"Could not enable permission: {response.status_code}")
                
        except Exception as e:
            self.log_test("Login after permission change test", False, str(e))
    
    def test_activity_logging(self):
        """Test 6: Verify activity logs are created for permission changes"""
        print("\n=== Testing Activity Logging ===")
        
        try:
            admin_headers = self.get_auth_headers("admin")
            sales_user_id = "sales-001"
            
            # Get activities count before change
            activities_before_response = self.session.get(f"{BASE_URL}/activities")
            activities_before_count = len(activities_before_response.json()) if activities_before_response.status_code == 200 else 0
            
            # Make permission change
            toggle_data = {"can_see_cost_breakup": True}
            response = self.session.put(
                f"{BASE_URL}/admin/salespeople/{sales_user_id}/cost-breakup-permission",
                headers=admin_headers,
                json=toggle_data
            )
            
            if response.status_code == 200:
                # Get activities count after change
                activities_after_response = self.session.get(f"{BASE_URL}/activities")
                
                if activities_after_response.status_code == 200:
                    activities_after = activities_after_response.json()
                    activities_after_count = len(activities_after)
                    
                    if activities_after_count > activities_before_count:
                        # Check if recent activity is related to permission change
                        recent_activities = activities_after[:5]  # Check last 5 activities
                        permission_activity = any(
                            "cost breakup" in activity.get("action", "").lower() or 
                            "permission" in activity.get("action", "").lower()
                            for activity in recent_activities
                        )
                        
                        if permission_activity:
                            self.log_test("Activity log created for permission change", True, 
                                         "Found permission-related activity in recent logs")
                        else:
                            self.log_test("Activity log created for permission change", False, 
                                         "No permission-related activity found in recent logs")
                    else:
                        self.log_test("Activity log created for permission change", False, 
                                     "No new activities created after permission change")
                else:
                    self.log_test("Activity logging verification", False, 
                                 f"Could not fetch activities: {activities_after_response.status_code}")
            else:
                self.log_test("Activity logging setup", False, 
                             f"Could not make permission change: {response.status_code}")
                
        except Exception as e:
            self.log_test("Activity logging test", False, str(e))
    
    def run_all_tests(self):
        """Run all Cost Breakup Visibility Control tests"""
        print("🚀 Starting Cost Breakup Visibility Control Backend Testing")
        print("=" * 70)
        
        try:
            # Test all Cost Breakup Control APIs
            self.test_admin_authentication()
            self.test_non_admin_user_login()
            self.test_admin_get_salespeople_endpoint()
            self.test_admin_toggle_permission_endpoint()
            self.test_permission_persistence()
            self.test_login_after_permission_change()
            self.test_activity_logging()
            
        except Exception as e:
            self.log_test("Test execution", False, f"Critical error: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 70)
        print("🎯 COST BREAKUP VISIBILITY CONTROL TESTING SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result)
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result)
        
        print(f"Total Tests: {passed + failed}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/(passed+failed)*100):.1f}%" if (passed+failed) > 0 else "0%")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            print(result)
        
        return passed, failed

if __name__ == "__main__":
    tester = CostBreakupTester()
    passed, failed = tester.run_all_tests()
    
    if failed == 0:
        print("\n🎉 ALL COST BREAKUP VISIBILITY TESTS PASSED!")
    else:
        print(f"\n⚠️  {failed} TESTS FAILED - See details above")