# PostgreSQL Database Setup - Complete

## Overview
Asset Forge now has a fully configured PostgreSQL database with comprehensive schema supporting all application features.

## Database Configuration

### Docker Container
- **Container Name**: `asset-forge-postgres`
- **PostgreSQL Version**: 16
- **Port**: 5433 (host) → 5432 (container)
- **Database Name**: `asset_forge`
- **User**: `asset_forge`
- **Password**: `asset_forge_dev_password_2024`

### Connection Details
```
Host: localhost
Port: 5433
Database: asset_forge
User: asset_forge
Password: asset_forge_dev_password_2024
```

## Database Schema

### Created Tables (19 total)

#### Core Tables
1. **users** - User accounts and authentication
2. **teams** - Team management
3. **team_members** - Team membership relationships
4. **team_invitations** - Team invitation tracking
5. **projects** - Project organization

#### Asset Management
6. **assets** - 3D assets and generated content
7. **rigging_metadata** - Rigging configuration for assets
8. **fitting_sessions** - Armor/equipment fitting data

#### Game Content
9. **quests** - Quest definitions
10. **npcs** - NPC characters
11. **lore_entries** - Lore and world-building content
12. **npc_scripts** - NPC behavior scripts

#### Voice & Audio
13. **voice_generations** - Voice generation history
14. **voice_manifests** - Voice assignment manifests

#### Game Data
15. **game_manifests** - Game data manifests

#### Testing & Tracking
16. **quest_tracking_sessions** - Quest playtesting data
17. **ai_playtesters** - AI playtester configurations

#### System
18. **entity_relationships** - Cross-entity relationships
19. **activity_log** - Audit trail
20. **notifications** - User notifications
21. **file_uploads** - File upload tracking
22. **api_keys** - API key management

## Features

### Automatic Timestamp Management
- All tables with `updated_at` have automatic triggers
- Created with `create_at` defaults

### UUID Primary Keys
- All tables use UUID for primary keys
- Uses `uuid-ossp` extension

### Relationships
- Foreign key constraints for data integrity
- Cascade deletes where appropriate
- Proper indexing for performance

### Indexes
- Primary key indexes
- Foreign key indexes
- Full-text search indexes on tags (GIN)
- Activity log indexes for audit queries

## API Endpoints Created

### Projects API (`/api/projects`)
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (soft delete)

### Teams API (`/api/teams`)
- `GET /api/teams` - List all teams
- `GET /api/teams/:id` - Get single team
- `POST /api/teams` - Create team
- `PATCH /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `POST /api/teams/:id/invite` - Invite member to team

## Files Created

### Database
- `apps/api/database/schema.sql` - Complete database schema
- `apps/api/server/database/db.mjs` - Database connection pool

### API Routes
- `apps/api/server/routes/projects.mjs` - Projects CRUD endpoints
- `apps/api/server/routes/teams.mjs` - Teams CRUD endpoints

### Frontend Stores
- `apps/asset-forge/src/store/useProjectsStore.ts` - Projects state management
- `apps/asset-forge/src/store/useTeamsStore.ts` - Teams state management

### Configuration
- `apps/api/.env` - Updated with database credentials

## Starting the Services

### Start PostgreSQL Container
```bash
docker start asset-forge-postgres
```

### Check Container Status
```bash
docker ps | grep asset-forge-postgres
```

### Connect to Database
```bash
docker exec -it asset-forge-postgres psql -U asset_forge -d asset_forge
```

### View Tables
```sql
\dt
```

### View Schema for a Table
```sql
\d users
```

## Testing

### Test Database Connection
```bash
docker exec asset-forge-postgres pg_isready -U asset_forge
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3004/api/health

# Get projects
curl http://localhost:3004/api/projects

# Get teams
curl http://localhost:3004/api/teams
```

## Backup & Restore

### Create Backup
```bash
docker exec asset-forge-postgres pg_dump -U asset_forge asset_forge > backup.sql
```

### Restore Backup
```bash
docker exec -i asset-forge-postgres psql -U asset_forge -d asset_forge < backup.sql
```

## Migration Path

For future schema changes:

1. Create migration SQL file in `apps/api/database/migrations/`
2. Name with timestamp: `YYYY-MM-DD-description.sql`
3. Run migration:
```bash
docker exec -i asset-forge-postgres psql -U asset_forge -d asset_forge < apps/api/database/migrations/YOUR_MIGRATION.sql
```

## Security Notes

- **Development Password**: Current password is for development only
- **Production**: Change password and use environment variables
- **SSL**: Enable SSL in production
- **Firewall**: Restrict PostgreSQL port access in production

## Next Steps

### Ready to Implement
The database is now ready for:
1. **User Authentication** - Privy integration with user table
2. **Asset Storage** - Full 3D asset management
3. **Team Collaboration** - Multi-user project workflows
4. **Quest System** - Full quest creation and tracking
5. **NPC Management** - Character and dialogue systems
6. **Voice Generation** - Audio content management
7. **Lore Management** - World-building content
8. **Playtesting** - AI-driven quest testing

### Frontend Integration
All frontend stores (Projects, Teams) are configured to use the new PostgreSQL API endpoints.

## Container Management

### Stop Container
```bash
docker stop asset-forge-postgres
```

### Start Container
```bash
docker start asset-forge-postgres
```

### View Logs
```bash
docker logs asset-forge-postgres
```

### Remove Container (CAUTION)
```bash
docker stop asset-forge-postgres
docker rm asset-forge-postgres
docker volume rm asset-forge-db-data
```

## Status

✅ **Database Setup**: Complete
✅ **Schema Creation**: All 22 tables created
✅ **API Integration**: Projects & Teams endpoints active
✅ **Frontend Integration**: Stores connected to API
✅ **Database Connection**: Verified and tested
✅ **Docker Container**: Running on port 5433

**Database is production-ready for development environment.**
