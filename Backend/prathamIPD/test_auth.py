import asyncio
import certifi
import motor.motor_asyncio
from auth import MONGO_URI, get_password_hash, create_access_token

async def test():
    print("Testing DB connection...")
    try:
        client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
        db = client.VyamSaathiUsers
        res = await asyncio.wait_for(db.users.find_one({"email": "test@test.com"}), timeout=5.0)
        print("db result:", res)
    except Exception as e:
        print("DB ERROR:", repr(e))

asyncio.run(test())
