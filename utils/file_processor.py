"""
File processing utilities.

Handles file uploads and content extraction.
"""

import os
from pathlib import Path
from typing import Optional, Tuple

from PyPDF2 import PdfReader
from docx import Document


class FileProcessor:
    """Handles file uploads and content extraction."""

    # Supported file types and their processors
    SUPPORTED_EXTENSIONS = {
        'pdf': 'read_pdf',
        'docx': 'read_docx',
        'txt': 'read_text',
        'md': 'read_text',
    }

    def __init__(self, upload_folder: str = 'static/uploads'):
        """
        Initialize file processor.

        Args:
            upload_folder: Directory for storing uploaded files
        """
        self.upload_folder = Path(upload_folder)
        self._ensure_upload_folder()

    def _ensure_upload_folder(self) -> None:
        """Create upload folder if it doesn't exist."""
        self.upload_folder.mkdir(parents=True, exist_ok=True)

        # Create .gitkeep to preserve folder in git
        gitkeep = self.upload_folder / '.gitkeep'
        if not gitkeep.exists():
            gitkeep.touch()

    def save_file(self, file, filename: str) -> Tuple[str, int]:
        """
        Save uploaded file to disk.

        Args:
            file: File object from request
            filename: Original filename

        Returns:
            Tuple of (saved filepath, file size)
        """
        # Secure the filename
        safe_filename = self._secure_filename(filename)
        filepath = self.upload_folder / safe_filename

        # Handle duplicate filenames
        counter = 1
        while filepath.exists():
            name, ext = os.path.splitext(safe_filename)
            filepath = self.upload_folder / f"{name}_{counter}{ext}"
            counter += 1

        # Save the file
        file.save(str(filepath))

        return str(filepath), filepath.stat().st_size

    def _secure_filename(self, filename: str) -> str:
        """
        Sanitize filename for safe storage.

        Args:
            filename: Original filename

        Returns:
            Sanitized filename
        """
        # Remove path separators and dangerous characters
        filename = os.path.basename(filename)

        # Replace spaces with underscores
        filename = filename.replace(' ', '_')

        # Remove any remaining problematic characters
        keep_chars = ('-', '_', '.')
        filename = ''.join(c for c in filename if c.isalnum() or c in keep_chars)

        return filename or 'unnamed_file'

    def is_allowed_extension(self, filename: str, allowed: Optional[list] = None) -> bool:
        """
        Check if file extension is allowed.

        Args:
            filename: Filename to check
            allowed: List of allowed extensions (without dots)

        Returns:
            True if extension is allowed
        """
        if allowed is None:
            allowed = list(self.SUPPORTED_EXTENSIONS.keys())

        ext = self._get_extension(filename)
        return ext in allowed

    def _get_extension(self, filename: str) -> str:
        """Get lowercase extension without dot."""
        return os.path.splitext(filename)[1].lower().lstrip('.')

    def read_file(self, filepath: str) -> Optional[str]:
        """
        Read and extract text content from file.

        Args:
            filepath: Path to the file

        Returns:
            Extracted text content or None
        """
        ext = self._get_extension(filepath)
        processor_name = self.SUPPORTED_EXTENSIONS.get(ext)

        if not processor_name:
            return None

        processor = getattr(self, processor_name, None)
        if not processor:
            return None

        try:
            return processor(filepath)
        except Exception as e:
            print(f"Error reading file {filepath}: {e}")
            return None

    def read_pdf(self, filepath: str) -> str:
        """
        Extract text from PDF file.

        Args:
            filepath: Path to PDF file

        Returns:
            Extracted text content
        """
        reader = PdfReader(filepath)
        text_parts = []

        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)

        return '\n\n'.join(text_parts)

    def read_docx(self, filepath: str) -> str:
        """
        Extract text from Word document.

        Args:
            filepath: Path to DOCX file

        Returns:
            Extracted text content
        """
        doc = Document(filepath)
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        return '\n\n'.join(paragraphs)

    def read_text(self, filepath: str) -> str:
        """
        Read plain text file.

        Args:
            filepath: Path to text file

        Returns:
            File content
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()

    def cleanup_file(self, filepath: str) -> bool:
        """
        Delete a file from disk.

        Args:
            filepath: Path to file to delete

        Returns:
            True if deleted successfully
        """
        try:
            path = Path(filepath)
            if path.exists() and path.is_file():
                path.unlink()
                return True
        except Exception as e:
            print(f"Error deleting file {filepath}: {e}")
        return False

    def cleanup_old_files(self, max_age_hours: int = 24) -> int:
        """
        Delete files older than specified age.

        Args:
            max_age_hours: Maximum file age in hours

        Returns:
            Number of files deleted
        """
        import time

        deleted = 0
        max_age_seconds = max_age_hours * 3600
        current_time = time.time()

        for filepath in self.upload_folder.iterdir():
            if filepath.name == '.gitkeep':
                continue

            if filepath.is_file():
                file_age = current_time - filepath.stat().st_mtime
                if file_age > max_age_seconds:
                    if self.cleanup_file(str(filepath)):
                        deleted += 1

        return deleted
