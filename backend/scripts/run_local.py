"""
Invoke Lambda handler locally (tests fetch + optimize path).
"""

import importlib.util
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))
LAMBDA = BACKEND / "lambda"
sys.path.insert(0, str(LAMBDA))


def _load_lambda_handler():
    """Load `lambda/handler.py` without importing a package named `lambda`."""
    path = LAMBDA / "handler.py"
    spec = importlib.util.spec_from_file_location("fantasy_lambda_handler", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load lambda handler")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.lambda_handler


def main() -> None:
    """Print Lambda JSON response from local execution."""
    handler = _load_lambda_handler()
    result = handler({}, None)
    print(result)


if __name__ == "__main__":
    main()
