import pytest
from app.core.auth import create_access_token
from passlib.hash import bcrypt

@pytest.mark.asyncio
async def test_auth_login_success(async_client, db_session):
    from app.models.models import User
    # Setup test user
    hashed_pwd = bcrypt.hash("securepassword")
    user = User(email="test@candidate.com", full_name="Test Candidate", password_hash=hashed_pwd)
    db_session.add(user)
    await db_session.commit()
    
    response = await async_client.post("/api/v1/auth/login", json={
        "email": "test@candidate.com",
        "password": "securepassword",
        "role": "candidate"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["email"] == "test@candidate.com"

@pytest.mark.asyncio
async def test_auth_login_failure_unauthorized(async_client):
    response = await async_client.post("/api/v1/auth/login", json={
        "email": "wrong@candidate.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_protected_route_missing_header(async_client):
    response = await async_client.get("/api/v1/interviews") # Protected endpoint
    assert response.status_code in [401, 403]

@pytest.mark.asyncio
async def test_protected_route_invalid_signature(async_client):
    headers = {"Authorization": "Bearer totally_fake_token_string"}
    response = await async_client.get("/api/v1/interviews", headers=headers)
    assert response.status_code in [401, 403]

@pytest.mark.asyncio
async def test_protected_route_expired_token(async_client):
    # Create an artificially expired token using utility function
    expired_token = create_access_token(data={"sub": "123", "exp": 0})
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = await async_client.get("/api/v1/interviews", headers=headers)
    assert response.status_code in [401, 403]
