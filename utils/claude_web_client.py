"""
Claude.ai Web Client.

Uses direct API calls with curl_cffi to interact with claude.ai,
enabling access to Claude Projects with their knowledge bases and instructions.
"""

import json
import os
import re
import time
import uuid as uuid_module
from typing import List, Optional

from curl_cffi import requests


class ClaudeWebClient:
    """
    Client for Claude.ai web API.

    This client connects directly to claude.ai using browser cookies,
    allowing interaction with Claude Projects.
    """

    def __init__(self, cookie: str, project_conversation_id: Optional[str] = None):
        """
        Initialize the Claude web client.

        Args:
            cookie: Claude.ai session cookie from browser
            project_conversation_id: Optional conversation ID within a project
        """
        self.cookie = cookie
        self.project_conversation_id = project_conversation_id
        self._conversation_id = None
        self.organization_id = self._get_organization_id()

    def _get_headers(self) -> dict:
        """Get common headers for API requests."""
        return {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://claude.ai/',
            'Content-Type': 'application/json',
            'Origin': 'https://claude.ai',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Connection': 'keep-alive',
            'Cookie': self.cookie
        }

    def _get_organization_id(self) -> str:
        """Get the organization ID from the API."""
        url = "https://claude.ai/api/organizations"
        response = requests.get(url, headers=self._get_headers(), impersonate="chrome120")
        if response.status_code != 200:
            raise ValueError(f"Failed to get organization: {response.status_code}")
        data = response.json()
        return data[0]['uuid']

    def _get_or_create_conversation(self) -> str:
        """Get existing conversation ID or create a new one."""
        if self.project_conversation_id:
            return self.project_conversation_id
        if self._conversation_id:
            return self._conversation_id
        result = self.create_new_conversation()
        return result

    def list_conversations(self) -> List[dict]:
        """
        List all conversations.

        Returns:
            List of conversation dictionaries with uuid, name, etc.
        """
        url = f"https://claude.ai/api/organizations/{self.organization_id}/chat_conversations"
        response = requests.get(url, headers=self._get_headers(), impersonate="chrome120")
        if response.status_code == 200:
            return response.json()
        return []

    def send_message(
        self,
        message: str,
        files: Optional[List[str]] = None,
        conversation_history: Optional[List[dict]] = None,
        system_context: Optional[str] = None,
        timeout: int = 300
    ) -> str:
        """
        Send a message to Claude via claude.ai.

        Args:
            message: User message text
            files: Optional list of file paths to attach
            conversation_history: Ignored (history maintained by claude.ai)
            system_context: Ignored (uses project's system context)
            timeout: Request timeout in seconds (default 300 for tool use)

        Returns:
            Claude's response text
        """
        conversation_id = self._get_or_create_conversation()

        # Use the streaming completion endpoint
        url = f"https://claude.ai/api/organizations/{self.organization_id}/chat_conversations/{conversation_id}/completion"

        payload = {
            "prompt": message,
            "timezone": "America/Los_Angeles",
            "attachments": [],
            "files": []
        }

        headers = self._get_headers()
        headers['Accept'] = 'text/event-stream'

        try:
            # Use streaming mode to handle long-running tool operations
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                impersonate="chrome120",
                timeout=timeout,
                stream=True  # Enable streaming for tool use
            )

            if response.status_code == 403:
                raise ValueError(
                    "Access denied (403). Your cookie may have expired. "
                    "Please get a fresh cookie from claude.ai browser session."
                )

            if response.status_code != 200:
                # Try to get error message from response
                error_text = response.text[:500] if response.text else "No error message"
                raise ValueError(f"API error: {response.status_code} - {error_text}")

            # Parse streaming response by iterating over chunks
            return self._parse_streaming_chunks(response)

        except requests.exceptions.Timeout:
            raise ValueError(
                "Request timed out. Claude may be using tools that take a while. "
                "The response will continue in the conversation - try sending a follow-up message."
            )
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Network error: {str(e)}")

    def _parse_streaming_chunks(self, response) -> str:
        """Parse streaming SSE response by iterating over lines."""
        completions = []

        try:
            # Use iter_lines for SSE parsing - handles line buffering
            for line_bytes in response.iter_lines():
                if not line_bytes:
                    continue

                # Decode bytes to string
                try:
                    line = line_bytes.decode('utf-8').strip()
                except UnicodeDecodeError:
                    line = line_bytes.decode('latin-1').strip()

                if line.startswith('data:'):
                    json_str = line[5:].strip()
                    if json_str and json_str != '[DONE]':
                        try:
                            data = json.loads(json_str)
                            text = self._extract_text_from_event(data)
                            if text:
                                completions.append(text)
                        except json.JSONDecodeError:
                            continue

        except Exception as e:
            # If streaming fails, try to get what we have
            if completions:
                return ''.join(completions)
            raise ValueError(f"Stream parsing error: {str(e)}")

        result = ''.join(completions) if completions else "No response received"
        return result

    def _get_last_message(self) -> Optional[str]:
        """Get the last assistant message from the current conversation."""
        try:
            history = self.get_conversation_history(self._conversation_id)
            messages = history.get('chat_messages', [])
            if messages:
                # Get the last assistant message
                for msg in reversed(messages):
                    if msg.get('sender') == 'assistant':
                        return msg.get('text', '')
        except Exception:
            pass
        return None

    def _parse_streaming_response(self, response_text: str) -> str:
        """Parse the streaming SSE response from Claude (non-streaming fallback)."""
        completions = []

        for line in response_text.split('\n'):
            line = line.strip()
            if line.startswith('data:'):
                json_str = line[5:].strip()
                if json_str and json_str != '[DONE]':
                    try:
                        data = json.loads(json_str)
                        text = self._extract_text_from_event(data)
                        if text:
                            completions.append(text)
                    except json.JSONDecodeError:
                        continue

        if completions:
            return ''.join(completions)

        # If no SSE format found, try parsing as plain JSON
        try:
            data = json.loads(response_text)
            text = self._extract_text_from_event(data)
            if text:
                return text
        except json.JSONDecodeError:
            pass

        return response_text if response_text else "No response received"

    def _extract_text_from_event(self, data: dict) -> Optional[str]:
        """Extract text content from various SSE event formats."""
        # Direct completion field
        if 'completion' in data:
            return data['completion']

        # Content field (may be string or list of blocks)
        if 'content' in data:
            content = data['content']
            if isinstance(content, str):
                return content
            elif isinstance(content, list):
                # Handle content blocks array
                texts = []
                for block in content:
                    if isinstance(block, dict):
                        if block.get('type') == 'text':
                            texts.append(block.get('text', ''))
                        elif block.get('type') == 'tool_use':
                            # Tool calls - include them in output for debugging
                            tool_name = block.get('name', 'unknown')
                            texts.append(f"\n[Using tool: {tool_name}...]\n")
                        elif block.get('type') == 'tool_result':
                            # Tool results
                            texts.append(block.get('content', ''))
                        elif 'text' in block:
                            texts.append(block['text'])
                return ''.join(texts) if texts else None

        # Delta field (streaming format)
        if 'delta' in data:
            delta = data['delta']
            if isinstance(delta, dict):
                if 'text' in delta:
                    return delta['text']
                if 'content' in delta:
                    return delta['content']
                if 'type' in delta:
                    # Handle delta type indicators
                    if delta.get('type') == 'text_delta':
                        return delta.get('text', '')
            elif isinstance(delta, str):
                return delta

        # Direct text field
        if 'text' in data:
            return data['text']

        # Message wrapper format
        if 'message' in data and isinstance(data['message'], dict):
            return self._extract_text_from_event(data['message'])

        # Handle message_start, content_block_start, etc.
        if 'type' in data:
            event_type = data['type']
            if event_type == 'content_block_delta':
                delta = data.get('delta', {})
                return delta.get('text', '')
            elif event_type == 'message_delta':
                delta = data.get('delta', {})
                return delta.get('text', '')

        return None

    def get_conversation_history(self, conversation_id: Optional[str] = None) -> dict:
        """
        Get conversation history from claude.ai.

        Args:
            conversation_id: Optional conversation ID (uses current if not provided)

        Returns:
            Conversation history dict
        """
        conv_id = conversation_id or self._conversation_id or self.project_conversation_id
        if not conv_id:
            return {}

        url = f"https://claude.ai/api/organizations/{self.organization_id}/chat_conversations/{conv_id}"
        response = requests.get(url, headers=self._get_headers(), impersonate="chrome120")
        if response.status_code == 200:
            return response.json()
        return {}

    def set_conversation(self, conversation_id: Optional[str]):
        """
        Set the conversation to use.

        Use this to switch to a specific project conversation.
        Pass None to clear the conversation (a new one will be created on next message).

        Args:
            conversation_id: The conversation UUID to use, or None to clear
        """
        self._conversation_id = conversation_id
        # Also clear project conversation if setting to None
        if conversation_id is None:
            self.project_conversation_id = None

    def create_new_conversation(self, project_uuid: Optional[str] = None) -> str:
        """
        Create a new conversation.

        Args:
            project_uuid: Optional project UUID to create conversation within

        Returns:
            The new conversation UUID
        """
        url = f"https://claude.ai/api/organizations/{self.organization_id}/chat_conversations"
        new_uuid = str(uuid_module.uuid4())

        payload = {"uuid": new_uuid, "name": ""}

        # If project specified, include it in the payload
        if project_uuid:
            payload["project_uuid"] = project_uuid

        response = requests.post(
            url,
            headers=self._get_headers(),
            json=payload,
            impersonate="chrome120"
        )

        # Accept both 200 and 201 as success
        if response.status_code in (200, 201):
            result = response.json()
            self._conversation_id = result.get('uuid', new_uuid)
            return self._conversation_id
        else:
            raise ValueError(f"Failed to create conversation: {response.status_code}")

    def delete_conversation(self, conversation_id: Optional[str] = None) -> bool:
        """
        Delete a conversation.

        Args:
            conversation_id: Optional conversation ID (uses current if not provided)

        Returns:
            True if successful
        """
        conv_id = conversation_id or self._conversation_id
        if not conv_id:
            return False

        url = f"https://claude.ai/api/organizations/{self.organization_id}/chat_conversations/{conv_id}"
        response = requests.delete(url, headers=self._get_headers(), impersonate="chrome120")
        return response.status_code == 204


def get_claude_web_client() -> Optional[ClaudeWebClient]:
    """
    Factory function to create a Claude web client from environment variables.

    Environment variables:
        CLAUDE_COOKIE: Session cookie from claude.ai browser session
        CLAUDE_CONVERSATION_ID: Optional conversation ID within a project

    Returns:
        ClaudeWebClient instance or None if cookie not set
    """
    cookie = os.getenv('CLAUDE_COOKIE')
    if not cookie:
        return None

    conversation_id = os.getenv('CLAUDE_CONVERSATION_ID')
    return ClaudeWebClient(cookie, conversation_id)
