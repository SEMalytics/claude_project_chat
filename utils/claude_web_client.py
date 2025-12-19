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

from utils.tool_handler import ClaudeToolHandler


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

        # Initialize tool handler for processing tool calls in responses
        self.tool_handler = ClaudeToolHandler({
            'allowed_tools': ['web_fetch', 'web_search'],
            'timeout': 30,
            # Google Custom Search (optional - falls back to DuckDuckGo if not set)
            'google_search_api_key': os.environ.get('GOOGLE_SEARCH_API_KEY'),
            'google_search_cx': os.environ.get('GOOGLE_SEARCH_CX')
        })

        # Track tool execution stats per request
        self.tool_stats = {'web_fetch': 0, 'web_search': 0, 'iterations': 0}

    def get_tool_stats(self) -> dict:
        """Get tool execution stats from the last request."""
        return self.tool_stats

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
        event_count = 0

        try:
            # Use iter_lines for SSE parsing - handles line buffering
            for line_bytes in response.iter_lines():
                if not line_bytes:
                    continue

                event_count += 1

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

        # Check for incomplete function calls - if we have opening tag but no closing
        if '<function_calls>' in result and '</function_calls>' not in result:
            # Try polling the conversation for the complete message
            for attempt in range(5):
                time.sleep(2)
                full_msg = self._get_last_message()
                if full_msg and '</function_calls>' in full_msg:
                    result = full_msg
                    break
                elif full_msg and len(full_msg) > len(result):
                    result = full_msg

        # Track tool execution stats
        self.tool_stats = {'web_fetch': 0, 'web_search': 0, 'iterations': 0}

        # Check for tool calls and handle them
        if self.tool_handler.has_tool_calls(result):
            result = self._handle_tool_calls(result)

        return result

    def _handle_tool_calls(self, response: str, max_iterations: int = 5) -> str:
        """
        Handle tool calls in Claude's response.

        Executes tools and sends results back until a final response is received.
        """
        accumulated_text = []
        current_response = response
        iterations = 0

        while iterations < max_iterations:
            iterations += 1
            self.tool_stats['iterations'] = iterations

            # Extract text before tool calls
            text_before = self.tool_handler.get_text_before_tools(current_response)
            if text_before:
                accumulated_text.append(text_before)

            # Parse and execute tools
            tool_calls = self.tool_handler.parse_tool_calls(current_response)

            if not tool_calls:
                # No more tool calls - get final cleaned response
                final_text = self.tool_handler.clean_response(current_response)
                if final_text and final_text not in accumulated_text:
                    accumulated_text.append(final_text)
                break

            # Track tool usage stats
            for tc in tool_calls:
                if tc.name in self.tool_stats:
                    self.tool_stats[tc.name] += 1

            # Execute all tools
            results = self.tool_handler.execute_all_tools(tool_calls)
            formatted_results = self.tool_handler.format_tool_results(results)

            # Send tool results back to Claude
            try:
                current_response = self._send_tool_results(formatted_results)

                # Check if new response has more tool calls
                if not self.tool_handler.has_tool_calls(current_response):
                    final_text = self.tool_handler.clean_response(current_response)
                    if final_text:
                        accumulated_text.append(final_text)
                    break

            except Exception as e:
                accumulated_text.append(f"\n[Tool execution error: {str(e)}]")
                break

        return '\n\n'.join(filter(None, accumulated_text))

    def _send_tool_results(self, results: str, timeout: int = 300) -> str:
        """Send tool execution results back to Claude."""
        conversation_id = self._get_or_create_conversation()
        url = f"https://claude.ai/api/organizations/{self.organization_id}/chat_conversations/{conversation_id}/completion"

        payload = {
            "prompt": results,
            "timezone": "America/Los_Angeles",
            "attachments": [],
            "files": []
        }

        headers = self._get_headers()
        headers['Accept'] = 'text/event-stream'

        response = requests.post(
            url,
            headers=headers,
            json=payload,
            impersonate="chrome120",
            timeout=timeout,
            stream=True
        )

        if response.status_code != 200:
            raise ValueError(f"API error: {response.status_code}")

        return self._parse_streaming_chunks(response)

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
            # Clear the original project_conversation_id so the new one is used
            self.project_conversation_id = None
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
