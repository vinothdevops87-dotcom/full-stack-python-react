# Contributing Guide

## Development Setup

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install pytest pytest-cov black flake8

# Run tests
pytest

# Format code
black app.py

# Lint code
flake8 app.py
```

### Frontend Development

```bash
cd frontend
npm install
npm start

# Run tests
npm test

# Format code
npm run format

# Lint code
npm run lint
```

## Code Style

- **Python**: Follow PEP 8, use Black for formatting
- **JavaScript**: Use ESLint and Prettier
- **Git Commits**: Use conventional commits format

## Testing

All pull requests must include tests and maintain 80% code coverage.

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
6. Wait for review

## DevOps Assessment Guidelines

When adding new features for assessment purposes:
1. Ensure they demonstrate specific DevOps practices
2. Add documentation for deployment steps
3. Include monitoring and observability hooks
4. Consider multi-environment scenarios
