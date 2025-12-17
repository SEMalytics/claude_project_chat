"""
Claude API client wrapper.

Handles communication with the Anthropic API for Claude Projects.
"""

import base64
import mimetypes
from pathlib import Path
from typing import List, Optional

from anthropic import Anthropic


class ClaudeClient:
    """Wrapper for Anthropic Claude API."""

    # Supported file types for document content blocks
    SUPPORTED_MIME_TYPES = {
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.md': 'text/plain',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }

    def __init__(self, api_key: str, project_id: Optional[str] = None):
        """
        Initialize Claude client.

        Args:
            api_key: Anthropic API key
            project_id: Optional Claude Project UUID
        """
        self.client = Anthropic(api_key=api_key)
        self.project_id = project_id
        self.model = "claude-sonnet-4-20250514"
        self.max_tokens = 4096

    def send_message(
        self,
        message: str,
        files: Optional[List[str]] = None,
        conversation_history: Optional[List[dict]] = None,
        system_context: Optional[str] = None
    ) -> str:
        """
        Send a message to Claude.

        Args:
            message: User message text
            files: Optional list of file paths to include
            conversation_history: Optional list of previous messages
            system_context: Optional system prompt

        Returns:
            Claude's response text
        """
        # Build content blocks
        content = []

        # Add file content if provided
        if files:
            for file_path in files:
                file_content = self._prepare_file_content(file_path)
                if file_content:
                    content.append(file_content)

        # Add the user's text message
        content.append({"type": "text", "text": message})

        # Build messages list
        messages = list(conversation_history) if conversation_history else []
        messages.append({"role": "user", "content": content})

        # Make API call
        kwargs = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "messages": messages
        }

        if system_context:
            kwargs["system"] = system_context

        response = self.client.messages.create(**kwargs)

        return response.content[0].text

    def _prepare_file_content(self, file_path: str) -> Optional[dict]:
        """
        Prepare file content for API request.

        Args:
            file_path: Path to the file

        Returns:
            Content block dict or None if unsupported
        """
        path = Path(file_path)

        if not path.exists():
            return None

        suffix = path.suffix.lower()
        mime_type = self.SUPPORTED_MIME_TYPES.get(suffix)

        if not mime_type:
            # Try to get mime type from system
            mime_type, _ = mimetypes.guess_type(str(path))

        if not mime_type:
            return None

        # Read and encode file
        with open(path, 'rb') as f:
            file_data = base64.standard_b64encode(f.read()).decode('utf-8')

        return {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": mime_type,
                "data": file_data
            }
        }

    def _get_mime_type(self, file_path: str) -> str:
        """Get MIME type for a file."""
        path = Path(file_path)
        suffix = path.suffix.lower()

        if suffix in self.SUPPORTED_MIME_TYPES:
            return self.SUPPORTED_MIME_TYPES[suffix]

        mime_type, _ = mimetypes.guess_type(str(path))
        return mime_type or 'application/octet-stream'
