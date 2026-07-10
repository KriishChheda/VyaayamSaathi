from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import bcrypt
from jose import jwt
from datetime import datetime, timedelta
import motor.motor_asyncio
import os
import certifi
from dotenv import load_dotenv

load_dotenv()

# Security Configuration
SECRET_KEY = os.getenv("SECRET_KEY") 
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
db = client.VyamSaathiUsers

class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str
    age: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    experience: Optional[str] = None
    goals: List[str] = []
    injuries: Optional[str] = None
    workout_dates: Optional[List[str]] = []
    workout_notes: Optional[dict] = {}
    notification_time: Optional[str] = "09:00"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    age: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    experience: Optional[str] = None
    goals: Optional[List[str]] = None
    injuries: Optional[str] = None
    workout_dates: Optional[List[str]] = None
    workout_notes: Optional[dict] = None
    notification_time: Optional[str] = None

# this function takes the user password as input and returns the hashed password
def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8') # this function takes the password and encodes it into bytes because bcrypt works with bytes
    salt = bcrypt.gensalt() # this function adds a salt to the password
    hashed = bcrypt.hashpw(pwd_bytes, salt) #this function takes the byte encoded password and the salt and returns the hashed password
    return hashed.decode('utf-8') # this function takes the hashed password and decodes it into a string

# this function takes the plain password and the hashed password as input and checks if the two match or not
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def create_access_token(data: dict):
    to_encode = data.copy() # we copy the input dictionary so that we don't modify the original dictionary
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES) # we add 24 hours to the current date
    to_encode.update({"exp": expire}) # we update the dictionary with the expiration time
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/signup")
async def signup(user: UserSignup):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_data = user.dict()
    user_data["password"] = hashed_password
    
    await db.users.insert_one(user_data)
    
    # Remove _id and password before returning
    if "_id" in user_data:
        del user_data["_id"]
    if "password" in user_data:
        del user_data["password"]
    
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user_data}

@router.post("/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Convert ObjectId to string or remove it
    if "_id" in user:
        user["_id"] = str(user["_id"])
    if "password" in user:
        del user["password"]
    
    token = create_access_token(data={"sub": credentials.email})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.put("/update-profile")
async def update_profile(user_update: UserProfileUpdate):
    update_data = user_update.dict(exclude_unset=True)
    email = update_data.pop("email")
    if not update_data:
        return {"status": "no update needed"}
        
    result = await db.users.update_one(
        {"email": email},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"status": "success"}


# ─── Calibration ───────────────────────────────────────────────────────────────

CALIBRATION_EXPIRY_DAYS = 15

class CalibrationData(BaseModel):
    email: EmailStr
    exercise: str  # e.g. "shoulder_press"
    thresholds: dict  # e.g. {"ANGLE_TOP": 142, "ANGLE_BOTTOM": 88, ...}

@router.post("/calibration")
async def save_calibration(data: CalibrationData):
    """Save per-user calibration thresholds for a specific exercise."""
    now = datetime.utcnow()
    expires = now + timedelta(days=CALIBRATION_EXPIRY_DAYS)

    calibration_doc = {
        "thresholds": data.thresholds,
        "calibrated_at": now.isoformat(),
        "expires_at": expires.isoformat(),
    }

    result = await db.users.update_one(
        {"email": data.email},
        {"$set": {f"calibration.{data.exercise}": calibration_doc}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "status": "success",
        "calibrated_at": now.isoformat(),
        "expires_at": expires.isoformat(),
    }


@router.get("/calibration/{email}")
async def get_calibration(email: str):
    """Retrieve all calibration data for a user."""
    user = await db.users.find_one({"email": email}, {"calibration": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    calibration = user.get("calibration", {})
    now = datetime.utcnow()

    # Mark each exercise calibration as expired or valid
    result = {}
    for exercise, cal_data in calibration.items():
        expires_at = datetime.fromisoformat(cal_data["expires_at"])
        result[exercise] = {
            **cal_data,
            "is_expired": now > expires_at,
        }

    return {"calibration": result}