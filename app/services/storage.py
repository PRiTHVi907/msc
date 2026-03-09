import asyncio
import boto3
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.sts = boto3.client("sts", aws_access_key_id=settings.AWS_ACCESS_KEY_ID, aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY, region_name=settings.AWS_REGION)

    async def generate_presigned_upload_url(self, interview_id: str, file_name: str, content_type: str) -> dict:
        """Generate presigned POST URL for S3 with 900-second (15-minute) expiration."""
        def _sync_gen() -> dict:
            cred = self.sts.assume_role(RoleArn=settings.AWS_ROLE_ARN, RoleSessionName=f"UploadSession_{interview_id}")["Credentials"]
            s3 = boto3.client("s3", aws_access_key_id=cred["AccessKeyId"], aws_secret_access_key=cred["SecretAccessKey"], aws_session_token=cred["SessionToken"], region_name=settings.AWS_REGION)
            key = f"interviews/{interview_id}/{file_name}"
            u = s3.generate_presigned_url("put_object", Params={"Bucket": settings.S3_BUCKET_NAME, "Key": key, "ContentType": content_type}, ExpiresIn=900)
            return {"upload_url": u, "resource_url": f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"}
        return await asyncio.to_thread(_sync_gen)

storage_service = StorageService()
