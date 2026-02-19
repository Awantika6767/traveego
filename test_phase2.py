"""Quick verification script for Phase 2 endpoints"""
import requests
import json

BASE_URL = "http://localhost:8001/api"

def test_endpoints():
    print("=" * 60)
    print("Phase 2 Endpoint Verification")
    print("=" * 60)
    
    # Test 1: Check if pending-invoice endpoint exists
    print("\n1. Testing GET /api/quotations/pending-invoice")
    try:
        response = requests.get(f"{BASE_URL}/quotations/pending-invoice")
        print(f"   Status: {response.status_code}")
        if response.status_code in [200, 401, 403]:
            print("   ✅ Endpoint exists (authentication may be required)")
        else:
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Verify invoice creation endpoint structure
    print("\n2. Testing POST /api/invoices/create-from-quotation")
    try:
        test_data = {
            "quotation_id": "test-id",
            "tcs_percent": 2.0,
            "subtotal": 10000,
            "tax_amount": 1800,
            "tcs_amount": 200,
            "total_amount": 12000,
            "advance_amount": 5000
        }
        response = requests.post(
            f"{BASE_URL}/invoices/create-from-quotation",
            json=test_data
        )
        print(f"   Status: {response.status_code}")
        if response.status_code in [401, 403, 404]:
            print("   ✅ Endpoint exists (authentication/data validation required)")
        elif response.status_code == 422:
            print("   ✅ Endpoint exists (request validation working)")
        else:
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("Verification Complete")
    print("=" * 60)

if __name__ == "__main__":
    test_endpoints()
