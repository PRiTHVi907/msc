import asyncio
import bcrypt
from sqlalchemy import select, update, insert
from app.core.database import engine
from app.models.models import User, Base

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    users_to_seed = [
        {
            "email": "admin@test.com",
            "full_name": "Admin User",
            "password": "password123",
            "is_active": True
        },
        {
            "email": "candidate@test.com",
            "full_name": "Candidate User",
            "password": "password123",
            "is_active": True
        }
    ]

    async with engine.connect() as conn:
        for user_data in users_to_seed:
            email = user_data["email"]
            # bcrypt.hashpw expects bytes
            salt = bcrypt.gensalt()
            pwd_hash = bcrypt.hashpw(user_data["password"].encode('utf-8'), salt).decode('utf-8')
            
            result = await conn.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            
            if user:
                print(f"Updating user: {email}")
                await conn.execute(
                    update(User)
                    .where(User.email == email)
                    .values(password_hash=pwd_hash)
                )
            else:
                print(f"Creating user: {email}")
                await conn.execute(
                    insert(User).values(
                        email=email,
                        full_name=user_data["full_name"],
                        password_hash=pwd_hash,
                        is_active=user_data["is_active"]
                    )
                )
        await conn.commit()
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed())
