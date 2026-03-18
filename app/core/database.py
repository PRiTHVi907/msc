from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Configure pool parameters only if not using SQLite memory/file paths
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
pool_kwargs = {} if "sqlite" in settings.DATABASE_URL else {
    "pool_size": 10,
    "max_overflow": 5,
    "pool_pre_ping": True
}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    **pool_kwargs
)
AsyncSessionLocal = async_sessionmaker(
    engine, 
    expire_on_commit=False, 
    class_=AsyncSession
)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
