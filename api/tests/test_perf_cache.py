import pytest
import time
from api.cache import cache_manager, cache_response
from api.models import User

def test_cache_manager_basic_operations():
    cache_manager.clear()
    
    # Get non-existent
    assert cache_manager.get("test_key") is None
    
    # Set and get
    cache_manager.set("test_key", "test_value", expire=10)
    assert cache_manager.get("test_key") == "test_value"
    
    # Delete
    cache_manager.delete("test_key")
    assert cache_manager.get("test_key") is None

def test_cache_expiry():
    cache_manager.clear()
    
    # Set with 1 second expiry
    cache_manager.set("test_key_expiry", "expired_val", expire=1)
    assert cache_manager.get("test_key_expiry") == "expired_val"
    
    # Wait for expiration
    time.sleep(1.1)
    assert cache_manager.get("test_key_expiry") is None

def test_cache_response_decorator_and_tenant_isolation():
    cache_manager.clear()
    
    call_count = 0
    
    @cache_response(expire=10)
    def dummy_route(param: str, current_user: User):
        nonlocal call_count
        call_count += 1
        return {"param": param, "tenant": current_user.tenant_id, "count": call_count}
        
    user_a = User(email="a@test.com", tenant_id="tenant-A")
    user_b = User(email="b@test.com", tenant_id="tenant-B")
    
    # 1. First call (User A, param="hello") -> Cache Miss
    res1 = dummy_route("hello", current_user=user_a)
    assert res1["count"] == 1
    assert call_count == 1
    
    # 2. Second call (User A, param="hello") -> Cache Hit
    res2 = dummy_route("hello", current_user=user_a)
    assert res2["count"] == 1
    assert call_count == 1  # call_count should not increase
    
    # 3. Third call (User B, param="hello") -> Cache Miss (Tenant B)
    res3 = dummy_route("hello", current_user=user_b)
    assert res3["count"] == 2
    assert call_count == 2  # call_count should increase due to tenant isolation
    
    # 4. Fourth call (User B, param="hello") -> Cache Hit (Tenant B)
    res4 = dummy_route("hello", current_user=user_b)
    assert res4["count"] == 2
    assert call_count == 2  # call_count should not increase
    
    # 5. Fifth call (User A, param="world") -> Cache Miss (different param)
    res5 = dummy_route("world", current_user=user_a)
    assert res5["count"] == 3
    assert call_count == 3

def test_frameworks_endpoint_caching(db_session):
    cache_manager.clear()
    from fastapi.testclient import TestClient
    from api.main import app
    from api.tests.test_compliance import create_authenticated_user
    
    client = TestClient(app)
    token_a = create_authenticated_user("cache_tester@securebank.com", "Viewer", tenant_id="tenant-CA")
    headers = {"Authorization": f"Bearer {token_a}"}
    
    # First request
    res1 = client.get("/api/controls/frameworks", headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1) == 3
    assert data1[0]["id"] == "SOC2"
    
    # Verify cached in cache_manager
    cache_key = "grc_cache:list_frameworks:tenant:tenant-CA"
    cached = cache_manager.get(cache_key)
    assert cached is not None
    
    # Second request
    res2 = client.get("/api/controls/frameworks", headers=headers)
    assert res2.status_code == 200
    assert res2.json() == data1

