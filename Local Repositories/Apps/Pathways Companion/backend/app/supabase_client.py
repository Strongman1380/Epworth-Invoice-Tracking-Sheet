"""
Supabase client configuration for Pathways Companion backend.
"""
import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create the Supabase client singleton.

    Returns:
        Client: Configured Supabase client instance

    Raises:
        ValueError: If required environment variables are missing
    """
    global _supabase_client

    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")

        if not url or not key:
            raise ValueError(
                "Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY. "
                "Copy .env.example to .env and fill in your Supabase credentials."
            )

        _supabase_client = create_client(url, key)

    return _supabase_client


# Convenience export
supabase = get_supabase_client
