import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Kita buat sistem pengecekan yang sangat ketat 
if os.getenv("RAILWAY_ENVIRONMENT"):
    SQLALCHEMY_DATABASE_URL = "postgresql://postgres.zzcedmweuokpoeoynfrl:#Mj9mL6W5.f8b.D@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
else:
    # SAAT DI LAPTOP LOKAL: Tetap pakai Docker localhost kamu
    SQLALCHEMY_DATABASE_URL = "postgresql://postgres:pastibisa@localhost:5432/epson_qc"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Fungsi untuk mendapatkan sesi database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()