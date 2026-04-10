from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.media_util import delete_local_file_if_exists
from app.models.media_asset import ExerciseMedia, MediaAsset


async def delete_asset_if_unreferenced(db: AsyncSession, asset_id: int) -> None:
    cnt = await db.scalar(
        select(func.count()).select_from(ExerciseMedia).where(ExerciseMedia.media_asset_id == asset_id)
    )
    if cnt and cnt > 0:
        return
    res = await db.execute(select(MediaAsset).where(MediaAsset.id == asset_id))
    asset = res.scalar_one_or_none()
    if not asset:
        return
    if asset.storage_provider == "local":
        delete_local_file_if_exists(asset.storage_path)
    await db.delete(asset)
