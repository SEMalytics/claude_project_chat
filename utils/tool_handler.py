"""
Claude.ai Tool Execution Handler.

Processes <function_calls> XML tags in Claude responses,
executes the requested tools, and continues the conversation
until a final response is received.
"""

import re
import json
import time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup


@dataclass
class ToolCall:
    """Represents a parsed tool call from Claude's response."""
    name: str
    parameters: Dict[str, str]
    raw_xml: str


@dataclass
class ToolResult:
    """Result from executing a tool."""
    success: bool
    content: str
    error: Optional[str] = None


class ClaudeToolHandler:
    """
    Handles tool execution for Claude.ai automation.

    Detects <function_calls> blocks in Claude responses,
    executes the tools, and returns results for continuation.
    """

    # Regex patterns for parsing
    FUNCTION_CALLS_PATTERN = re.compile(
        r'<function_calls>(.*?)</function_calls>',
        re.DOTALL
    )
    INVOKE_PATTERN = re.compile(
        r'<invoke\s+name=["\']([^"\']+)["\']>(.*?)</invoke>',
        re.DOTALL
    )
    PARAMETER_PATTERN = re.compile(
        r'<parameter\s+name=["\']([^"\']+)["\']>([^<]*)</parameter>',
        re.DOTALL
    )

    # Also match incomplete/streaming function calls
    INCOMPLETE_FUNCTION_CALL = re.compile(
        r'<function_calls>\s*<invoke\s+name=["\']([^"\']+)["\']>',
        re.DOTALL
    )

    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize the tool handler.

        Args:
            config: Optional configuration dict with:
                - timeout: Request timeout in seconds (default 30)
                - user_agent: User agent for web requests
                - allowed_tools: List of allowed tool names (None = all)
                - web_search_api_key: API key for web search (optional)
        """
        self.config = config or {}
        self.timeout = self.config.get('timeout', 30)
        self.user_agent = self.config.get(
            'user_agent',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        self.allowed_tools = self.config.get('allowed_tools', None)

        # Tool registry
        self.tools = {
            'web_fetch': self.execute_web_fetch,
            'web_search': self.execute_web_search,
            'str_replace': self.execute_str_replace,
            'view': self.execute_view,
            'create_file': self.execute_create_file,
            'bash_tool': self.execute_bash,
        }

    def has_tool_calls(self, response_text: str) -> bool:
        """Check if response contains tool calls (complete or incomplete)."""
        if self.FUNCTION_CALLS_PATTERN.search(response_text):
            return True
        if self.INCOMPLETE_FUNCTION_CALL.search(response_text):
            return True
        if '<function_calls>' in response_text:
            return True
        return False

    def has_incomplete_tool_calls(self, response_text: str) -> bool:
        """Check if response has incomplete/truncated tool calls."""
        # Has opening tag but no closing tag
        if '<function_calls>' in response_text and '</function_calls>' not in response_text:
            return True
        # Has invoke start but no end
        if '<invoke name=' in response_text and '</invoke>' not in response_text:
            return True
        return False

    def parse_tool_calls(self, response_text: str) -> List[ToolCall]:
        """
        Extract all tool calls from Claude's response.

        Args:
            response_text: The raw response text from Claude

        Returns:
            List of ToolCall objects
        """
        tool_calls = []

        # Find all function_calls blocks
        for block_match in self.FUNCTION_CALLS_PATTERN.finditer(response_text):
            block_content = block_match.group(1)
            block_xml = block_match.group(0)

            # Find all invoke tags within this block
            for invoke_match in self.INVOKE_PATTERN.finditer(block_content):
                tool_name = invoke_match.group(1)
                invoke_content = invoke_match.group(2)

                # Extract parameters
                parameters = {}
                for param_match in self.PARAMETER_PATTERN.finditer(invoke_content):
                    param_name = param_match.group(1)
                    param_value = param_match.group(2).strip()
                    parameters[param_name] = param_value

                tool_calls.append(ToolCall(
                    name=tool_name,
                    parameters=parameters,
                    raw_xml=block_xml
                ))

        return tool_calls

    def execute_tool(self, tool_call: ToolCall) -> ToolResult:
        """
        Execute a single tool call.

        Args:
            tool_call: The parsed tool call

        Returns:
            ToolResult with success status and content/error
        """
        tool_name = tool_call.name

        # Check if tool is allowed
        if self.allowed_tools and tool_name not in self.allowed_tools:
            return ToolResult(
                success=False,
                content='',
                error=f'Tool "{tool_name}" is not allowed'
            )

        # Get tool executor
        executor = self.tools.get(tool_name)
        if not executor:
            return ToolResult(
                success=False,
                content='',
                error=f'Unknown tool: {tool_name}'
            )

        try:
            return executor(tool_call.parameters)
        except Exception as e:
            return ToolResult(
                success=False,
                content='',
                error=f'Tool execution error: {str(e)}'
            )

    def execute_all_tools(self, tool_calls: List[ToolCall]) -> List[Tuple[ToolCall, ToolResult]]:
        """
        Execute all tool calls and return results.

        Args:
            tool_calls: List of parsed tool calls

        Returns:
            List of (ToolCall, ToolResult) tuples
        """
        results = []
        for tool_call in tool_calls:
            result = self.execute_tool(tool_call)
            results.append((tool_call, result))
        return results

    def format_tool_results(self, results: List[Tuple[ToolCall, ToolResult]]) -> str:
        """
        Format tool results as XML for sending back to Claude.

        Args:
            results: List of (ToolCall, ToolResult) tuples

        Returns:
            Formatted XML string
        """
        formatted_parts = []

        for tool_call, result in results:
            if result.success:
                formatted_parts.append(
                    f'<function_results>\n'
                    f'<result name="{tool_call.name}">\n'
                    f'{result.content}\n'
                    f'</result>\n'
                    f'</function_results>'
                )
            else:
                formatted_parts.append(
                    f'<function_results>\n'
                    f'<error name="{tool_call.name}">\n'
                    f'{result.error}\n'
                    f'</error>\n'
                    f'</function_results>'
                )

        return '\n'.join(formatted_parts)

    def clean_response(self, response_text: str) -> str:
        """
        Remove all tool-related XML from the response.

        Args:
            response_text: Raw response text

        Returns:
            Cleaned response with natural language only
        """
        # Remove complete function_calls blocks
        cleaned = self.FUNCTION_CALLS_PATTERN.sub('', response_text)

        # Remove function_results blocks
        cleaned = re.sub(
            r'<function_results>.*?</function_results>',
            '',
            cleaned,
            flags=re.DOTALL
        )

        # Remove any incomplete/partial tags
        cleaned = re.sub(r'<function_calls>.*$', '', cleaned, flags=re.DOTALL)
        cleaned = re.sub(r'<invoke\s+name=.*$', '', cleaned, flags=re.DOTALL)

        # Clean up extra whitespace
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
        cleaned = cleaned.strip()

        return cleaned

    def get_text_before_tools(self, response_text: str) -> str:
        """
        Extract the text that appears before any tool calls.

        Args:
            response_text: Raw response text

        Returns:
            Text before the first tool call
        """
        # Find the first function_calls tag
        match = re.search(r'<function_calls>', response_text)
        if match:
            return response_text[:match.start()].strip()
        return response_text.strip()

    # =========================================================================
    # Tool Implementations
    # =========================================================================

    def execute_web_fetch(self, params: Dict[str, str]) -> ToolResult:
        """
        Fetch content from a URL.

        Parameters:
            url: The URL to fetch
        """
        url = params.get('url', '')
        if not url:
            return ToolResult(False, '', 'No URL provided')

        # Add protocol if missing
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        try:
            headers = {'User-Agent': self.user_agent}
            response = requests.get(url, headers=headers, timeout=self.timeout)
            response.raise_for_status()

            # Parse HTML and extract text
            soup = BeautifulSoup(response.text, 'html.parser')

            # Remove script and style elements
            for element in soup(['script', 'style', 'nav', 'footer', 'header']):
                element.decompose()

            # Get text content
            text = soup.get_text(separator='\n', strip=True)

            # Truncate if too long
            max_length = 10000
            if len(text) > max_length:
                text = text[:max_length] + '\n\n[Content truncated...]'

            return ToolResult(True, f'Content from {url}:\n\n{text}')

        except requests.exceptions.RequestException as e:
            return ToolResult(False, '', f'Failed to fetch URL: {str(e)}')

    def execute_web_search(self, params: Dict[str, str]) -> ToolResult:
        """
        Search the web.

        Parameters:
            query: The search query
        """
        query = params.get('query', '')
        if not query:
            return ToolResult(False, '', 'No search query provided')

        # Check for API key
        api_key = self.config.get('web_search_api_key')

        if api_key:
            # Use a search API (e.g., SerpAPI, Bing, etc.)
            # This is a placeholder - implement based on your chosen API
            return ToolResult(
                False, '',
                'Web search API not implemented. Please configure web_search_api_key.'
            )
        else:
            # Fallback: Return a message that search isn't available
            return ToolResult(
                True,
                f'Web search for "{query}" is not available in this environment. '
                f'Please try using web_fetch with a specific URL instead.'
            )

    def execute_str_replace(self, params: Dict[str, str]) -> ToolResult:
        """
        Replace text in a file.

        Parameters:
            file_path: Path to the file
            old_str: String to replace
            new_str: Replacement string
        """
        # Security: Disabled by default for safety
        return ToolResult(
            False, '',
            'File editing is disabled in this environment for security.'
        )

    def execute_view(self, params: Dict[str, str]) -> ToolResult:
        """
        View file contents.

        Parameters:
            file_path: Path to the file
        """
        # Security: Disabled by default for safety
        return ToolResult(
            False, '',
            'File viewing is disabled in this environment for security.'
        )

    def execute_create_file(self, params: Dict[str, str]) -> ToolResult:
        """
        Create a file.

        Parameters:
            file_path: Path for the new file
            content: File contents
        """
        # Security: Disabled by default for safety
        return ToolResult(
            False, '',
            'File creation is disabled in this environment for security.'
        )

    def execute_bash(self, params: Dict[str, str]) -> ToolResult:
        """
        Execute a bash command.

        Parameters:
            command: The command to execute
        """
        # Security: Disabled by default for safety
        return ToolResult(
            False, '',
            'Command execution is disabled in this environment for security.'
        )


class ConversationToolLoop:
    """
    Manages the conversation loop with Claude when tools are involved.

    Handles the cycle of:
    1. Send message
    2. Receive response
    3. If tools requested, execute and send results
    4. Repeat until final response
    """

    def __init__(self, claude_client, tool_handler: ClaudeToolHandler):
        """
        Initialize the conversation loop handler.

        Args:
            claude_client: The ClaudeWebClient instance
            tool_handler: The ClaudeToolHandler instance
        """
        self.client = claude_client
        self.tool_handler = tool_handler
        self.max_iterations = 10  # Prevent infinite loops

    async def send_with_tool_handling(
        self,
        message: str,
        timeout: int = 300
    ) -> str:
        """
        Send a message and handle any tool calls until final response.

        Args:
            message: The user's message
            timeout: Maximum time to wait for response

        Returns:
            The final cleaned response from Claude
        """
        current_message = message
        iterations = 0
        accumulated_text = []

        while iterations < self.max_iterations:
            iterations += 1

            # Send message and get response
            response = self.client.send_message(current_message, timeout=timeout)

            # Check for tool calls
            if self.tool_handler.has_tool_calls(response):
                # Extract text before tool calls
                text_before = self.tool_handler.get_text_before_tools(response)
                if text_before:
                    accumulated_text.append(text_before)

                # Check if incomplete (streaming issue)
                if self.tool_handler.has_incomplete_tool_calls(response):
                    # Wait and poll for complete response
                    time.sleep(2)
                    continue

                # Parse and execute tools
                tool_calls = self.tool_handler.parse_tool_calls(response)
                if tool_calls:
                    results = self.tool_handler.execute_all_tools(tool_calls)
                    formatted_results = self.tool_handler.format_tool_results(results)

                    # Send tool results back as the next message
                    current_message = formatted_results
                    continue

            # No tool calls - this is the final response
            final_text = self.tool_handler.clean_response(response)
            accumulated_text.append(final_text)
            break

        return '\n\n'.join(filter(None, accumulated_text))
