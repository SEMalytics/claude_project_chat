"""
URL content fetching utilities.

Fetches and extracts content from web pages.
"""

from typing import Optional, Tuple
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup


class URLFetcher:
    """Fetches and extracts content from URLs."""

    DEFAULT_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }

    def __init__(self, timeout: int = 30):
        """
        Initialize URL fetcher.

        Args:
            timeout: Request timeout in seconds
        """
        self.timeout = timeout

    def fetch(self, url: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Fetch content from URL.

        Args:
            url: URL to fetch

        Returns:
            Tuple of (content text, error message)
        """
        # Validate URL
        if not self._is_valid_url(url):
            return None, "Invalid URL format"

        try:
            response = requests.get(
                url,
                headers=self.DEFAULT_HEADERS,
                timeout=self.timeout,
                allow_redirects=True
            )
            response.raise_for_status()

            # Extract text content
            content = self._extract_text(response.text, url)
            return content, None

        except requests.exceptions.Timeout:
            return None, "Request timed out"
        except requests.exceptions.ConnectionError:
            return None, "Could not connect to URL"
        except requests.exceptions.HTTPError as e:
            return None, f"HTTP error: {e.response.status_code}"
        except Exception as e:
            return None, f"Error fetching URL: {str(e)}"

    def _is_valid_url(self, url: str) -> bool:
        """
        Check if URL is valid.

        Args:
            url: URL to validate

        Returns:
            True if valid
        """
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False

    def _extract_text(self, html: str, url: str) -> str:
        """
        Extract readable text from HTML.

        Args:
            html: HTML content
            url: Source URL (for context)

        Returns:
            Extracted text content
        """
        soup = BeautifulSoup(html, 'html.parser')

        # Remove script and style elements
        for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            element.decompose()

        # Get title
        title = ''
        if soup.title:
            title = soup.title.string or ''

        # Try to find main content
        main_content = (
            soup.find('main') or
            soup.find('article') or
            soup.find('div', {'class': ['content', 'main', 'article']}) or
            soup.find('div', {'id': ['content', 'main', 'article']}) or
            soup.body
        )

        if main_content:
            text = main_content.get_text(separator='\n', strip=True)
        else:
            text = soup.get_text(separator='\n', strip=True)

        # Clean up text
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)

        # Build result with metadata
        result_parts = []

        if title:
            result_parts.append(f"Title: {title}")
        result_parts.append(f"URL: {url}")
        result_parts.append("")
        result_parts.append(text)

        return '\n'.join(result_parts)

    def fetch_multiple(self, urls: list) -> list:
        """
        Fetch content from multiple URLs.

        Args:
            urls: List of URLs to fetch

        Returns:
            List of tuples (url, content, error)
        """
        results = []
        for url in urls:
            content, error = self.fetch(url)
            results.append((url, content, error))
        return results
