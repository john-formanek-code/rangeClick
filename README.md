# RangeClick

A real-time cryptocurrency betting game where players predict if the price will fall within specific ranges during each round.

## Overview

RangeClick is a fast-paced betting game where:
- **Players** place bets on price ranges for BTC, ETH, and other instruments
- **Rounds** last 5 minutes, with price continuously updating in real-time
- **Payouts** are based on range multipliers (higher ranges = higher odds)
- **Live pricing** aggregates data from multiple market sources for accuracy

## Features

- 🎯 Real-time price prediction betting
- 📊 Live price chart with technical analysis
- 💰 Configurable bet amounts and session limits
- 🔐 Secure wallet management and bet tracking
- 🌐 Multi-instrument support (BTC, ETH, etc.)
- 📈 Advanced game loop with settlement and reconciliation
- 🔄 WebSocket live updates
- 📋 Comprehensive bet history and metrics

## Tech Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Vite** - Build tool

### Backend
- **Fastify** - HTTP server framework
- **Node.js** - Runtime
- **PostgreSQL/SQLite** - Database
- **Knex** - Query builder & migrations
- **WebSockets** - Real-time updates

## Project Structure

```
rangeClick/
├── apps/
│   ├── backend/          # Fastify server, game logic, database
│   └── web/              # React frontend application
├── packages/
│   └── types/            # Shared TypeScript types
├── docs/                 # Documentation and specifications
└── package.json          # Monorepo configuration
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- PostgreSQL (or SQLite for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/john-formanek-code/rangeClick.git
cd rangeClick

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run migrate:latest
```

### Development

```bash
# Start both backend and frontend in parallel
npm run dev

# Frontend will be available at http://localhost:5173
# Backend will be available at http://localhost:3000
```

### Building for Production

```bash
npm run build
```

## Game Rules

1. **Rounds**: Each round lasts 5 minutes (configurable)
2. **Range Selection**: Players choose from 9 vertical price ranges
3. **Multipliers**: Each range has a multiplier based on probability
4. **Settlement**: When a round closes, the actual closing price determines winning bets
5. **Payouts**: Winning bets pay out based on the range's multiplier

## API Endpoints

Key endpoints include:
- `POST /api/login` - User authentication
- `POST /api/bets` - Place a new bet
- `GET /api/bets` - Get user's bet history
- `POST /api/deposit` - Add funds to wallet
- `GET /api/settings` - Get user configuration
- `WS /ws` - WebSocket connection for live updates

See [Backend Endpoints Documentation](docs/backend-endpoints.md) for full details.

## Architecture

The application follows a layered architecture:
- **Gateway**: WebSocket management and real-time updates
- **Game Loop**: Core betting round orchestration
- **Market Service**: Price feed aggregation and validation
- **Bet Service**: Bet placement and validation
- **Ledger Service**: Financial transaction tracking

See [Architecture Overview](docs/architecture-overview.md) for more information.

## Security

- Rate limiting on all API endpoints
- Idempotent bet placement with replay protection
- Market data validation from multiple sources
- User session management and wallet isolation
- Comprehensive audit logging

See [Security Checkpoints](docs/security-checkpoints.md) for detailed security measures.

## Database

### Migrations

```bash
# Create a new migration
npm run migrate:make migration_name

# Apply pending migrations
npm run migrate:latest

# Rollback the last batch
npm run migrate:rollback
```

Database schema includes:
- Users and wallets
- Betting rounds
- Bets and payouts
- Price history
- Audit logs

See [Data Models](docs/data-models.md) for schema details.

## Configuration

User configurable settings:
- **Max Bet Amount**: Per-session spending limit
- **Max Bets Per Round**: Burst rate limiting
- **Preferred Instruments**: Which crypto to track

## Metrics & Monitoring

The system tracks:
- Bet win rates and payouts
- Price feed accuracy
- Game loop latency
- Database performance
- User engagement metrics

See [Metrics Documentation](docs/metrics.md) for details.

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Documentation

- [Product Requirements](docs/RangeClick_PRD.md)
- [Implementation Guide](docs/RangeClick_Developer_Implementation_Guide.md)
- [Game Loop Details](docs/game-loop.md)
- [Frontend Interactions](docs/frontend-interactions.md)
- [Oracle Rules](docs/oracle-rules.md)

## License

This project is provided as-is for educational and commercial purposes.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Built with ❤️ by Jan Formánek
