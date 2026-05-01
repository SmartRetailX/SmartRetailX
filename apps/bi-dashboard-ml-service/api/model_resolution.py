"""Helpers for resolving ML artifacts across catalog and legacy product keys."""

from functools import lru_cache
from pathlib import Path
from typing import Optional, Tuple
import json


@lru_cache(maxsize=1)
def _load_product_catalog() -> list[dict]:
    catalog_path = Path(__file__).resolve().parent.parent / 'data' / 'product-catalog.json'

    if not catalog_path.exists():
        return []

    with catalog_path.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def _resolve_catalog_entry(requested_key: str) -> tuple[Optional[int], Optional[str]]:
    catalog = _load_product_catalog()

    for index, product in enumerate(catalog):
        aliases = {
            str(product.get('itemID', '')),
            str(product.get('itemCode', '')),
        }

        if requested_key in aliases:
            return index, str(product['itemID'])

    return None, None


def resolve_model_artifact(model_path: str, product_id: str, model_type: str) -> Tuple[Path, str]:
    """Resolve a model artifact, falling back to legacy PROD### filenames."""

    model_dir = Path(model_path)
    requested_key = str(product_id)

    exact_path = model_dir / f'{requested_key}_{model_type}.pkl'
    if exact_path.exists():
        return exact_path, requested_key

    catalog_index, canonical_key = _resolve_catalog_entry(requested_key)
    if catalog_index is None:
        raise FileNotFoundError(
            f'No trained {model_type} model found for {requested_key}.'
        )

    canonical_path = model_dir / f'{canonical_key}_{model_type}.pkl'
    if canonical_path.exists():
        return canonical_path, canonical_key

    legacy_path = model_dir / f'PROD{catalog_index + 1:03d}_{model_type}.pkl'
    if legacy_path.exists():
        return legacy_path, legacy_path.stem.removesuffix(f'_{model_type}')

    legacy_candidates = sorted(model_dir.glob(f'PROD*_{model_type}.pkl'))
    if len(legacy_candidates) > catalog_index:
        candidate = legacy_candidates[catalog_index]
        return candidate, candidate.stem.removesuffix(f'_{model_type}')

    raise FileNotFoundError(
        f'No trained {model_type} model found for {requested_key}. '
        f'Expected {exact_path.name} or a matching legacy PROD### artifact.'
    )