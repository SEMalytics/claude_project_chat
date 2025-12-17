"""
Configuration module for Claude Project Chat Interface.

Loads environment variables and YAML configuration.
"""

import os
from typing import Any, Optional

import yaml
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Environment configuration from .env file."""

    ANTHROPIC_API_KEY: str = os.getenv('ANTHROPIC_API_KEY', '')
    CLAUDE_PROJECT_ID: str = os.getenv('CLAUDE_PROJECT_ID', '')

    # Server settings
    HOST: str = os.getenv('HOST', '127.0.0.1')
    PORT: int = int(os.getenv('PORT', '5000'))
    DEBUG: bool = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'

    # Upload limits
    MAX_FILE_SIZE: int = int(os.getenv('MAX_FILE_SIZE', str(10 * 1024 * 1024)))  # 10MB default

    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration."""
        if not cls.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required. Add it to .env file.")
        return True


class ProjectConfig:
    """Project-specific configuration from YAML file."""

    def __init__(self, config_path: str = 'project_config.yaml'):
        self.config_path = config_path
        self._config = self._load_config()

    def _load_config(self) -> dict:
        """Load configuration from YAML file."""
        try:
            with open(self.config_path, 'r') as f:
                config = yaml.safe_load(f)
                return config if config else {}
        except FileNotFoundError:
            print(f"Warning: {self.config_path} not found. Using defaults.")
            return self._default_config()

    def _default_config(self) -> dict:
        """Return default configuration."""
        return {
            'project': {
                'name': 'Claude Chat',
                'description': 'Claude Project Chat Interface'
            },
            'ui': {
                'title': 'Claude Chat',
                'subtitle': 'Powered by Anthropic',
                'primary_color': '#3b82f6'
            },
            'features': {
                'file_upload': True,
                'url_fetching': True,
                'multi_file': True,
                'conversation_history': True
            },
            'files': {
                'allowed_extensions': ['pdf', 'docx', 'txt', 'md'],
                'max_size_mb': 10,
                'max_files': 5
            },
            'prompts': [
                {
                    'id': 'general_chat',
                    'label': 'General Chat',
                    'template': '{user_input}',
                    'requires_files': False,
                    'requires_input': True,
                    'placeholder': 'Ask me anything...'
                }
            ]
        }

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value using dot notation.

        Args:
            key: Dot-separated path (e.g., 'ui.title')
            default: Default value if key not found

        Returns:
            Configuration value or default
        """
        keys = key.split('.')
        value = self._config

        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                return default

            if value is None:
                return default

        return value

    def get_prompts(self) -> list:
        """Get all configured prompts."""
        return self.get('prompts', [])

    def get_prompt_by_id(self, prompt_id: str) -> Optional[dict]:
        """Get a specific prompt by ID."""
        prompts = self.get_prompts()
        for prompt in prompts:
            if prompt.get('id') == prompt_id:
                return prompt
        return None

    def get_allowed_extensions(self) -> list:
        """Get list of allowed file extensions."""
        return self.get('files.allowed_extensions', ['pdf', 'docx', 'txt', 'md'])

    def get_max_file_size(self) -> int:
        """Get maximum file size in bytes."""
        mb = self.get('files.max_size_mb', 10)
        return mb * 1024 * 1024

    def get_max_files(self) -> int:
        """Get maximum number of files allowed."""
        return self.get('files.max_files', 5)

    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled."""
        return self.get(f'features.{feature}', False)

    def reload(self) -> None:
        """Reload configuration from file."""
        self._config = self._load_config()


# Global instances
config = Config()
project_config = ProjectConfig()
