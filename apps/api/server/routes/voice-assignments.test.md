# Voice Assignments API - Test Documentation

## API Endpoints

### 1. Create Voice Assignment Manifest
**POST** `/api/voice-assignments`

Creates a new voice assignment manifest.

**Request Body:**
```json
{
  "name": "NPC Voice Assignments",
  "description": "Voice assignments for NPCs",
  "ownerId": "uuid-of-owner",
  "projectId": "uuid-of-project",  // Optional
  "assignments": [
    {
      "npcId": "npc-guard-001",
      "voiceId": "voice-123",
      "voiceName": "Deep Male Voice"
    },
    {
      "npcId": "npc-merchant-001",
      "voiceId": "voice-456",
      "voiceName": "Friendly Female Voice"
    }
  ]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Voice assignments created successfully",
  "manifestId": "uuid-of-created-manifest",
  "assignments": [...],
  "createdAt": "2025-10-26T09:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid data
- `500 Internal Server Error` - Database or server error

---

### 2. Get Voice Assignment Manifest
**GET** `/api/voice-assignments/:manifestId`

Retrieves a specific voice assignment manifest.

**URL Parameters:**
- `manifestId` - UUID of the manifest

**Success Response (200):**
```json
{
  "manifestId": "uuid",
  "name": "NPC Voice Assignments",
  "description": "Voice assignments for NPCs",
  "assignments": [
    {
      "npcId": "npc-guard-001",
      "voiceId": "voice-123",
      "voiceName": "Deep Male Voice"
    }
  ],
  "version": 1,
  "updatedAt": "2025-10-26T09:00:00.000Z",
  "createdAt": "2025-10-26T09:00:00.000Z"
}
```

**Error Responses:**
- `404 Not Found` - Manifest not found
- `500 Internal Server Error` - Database or server error

---

### 3. Update Voice Assignment Manifest
**PUT** `/api/voice-assignments/:manifestId`

Updates an existing voice assignment manifest.

**URL Parameters:**
- `manifestId` - UUID of the manifest

**Request Body:**
```json
{
  "name": "Updated NPC Voice Assignments",        // Optional
  "description": "Updated description",            // Optional
  "assignments": [                                 // Optional
    {
      "npcId": "npc-guard-001",
      "voiceId": "voice-789",
      "voiceName": "Different Voice"
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Voice assignments updated successfully",
  "manifestId": "uuid",
  "assignments": [...],
  "version": 2,
  "updatedAt": "2025-10-26T09:10:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid data or no fields to update
- `404 Not Found` - Manifest not found
- `500 Internal Server Error` - Database or server error

---

### 4. Delete Voice Assignment Manifest
**DELETE** `/api/voice-assignments/:manifestId`

Deletes a voice assignment manifest.

**URL Parameters:**
- `manifestId` - UUID of the manifest

**Success Response (200):**
```json
{
  "success": true,
  "message": "Voice assignments deleted successfully",
  "manifestId": "uuid"
}
```

**Error Responses:**
- `404 Not Found` - Manifest not found
- `500 Internal Server Error` - Database or server error

---

### 5. Get Voice Assignments by Owner
**GET** `/api/voice-assignments/by-owner/:ownerId`

Retrieves all voice assignment manifests for a specific owner.

**URL Parameters:**
- `ownerId` - UUID of the owner

**Success Response (200):**
```json
{
  "count": 2,
  "manifests": [
    {
      "manifestId": "uuid-1",
      "name": "NPC Voice Assignments",
      "description": "Voice assignments for NPCs",
      "assignments": [...],
      "version": 1,
      "isActive": true,
      "createdAt": "2025-10-26T09:00:00.000Z",
      "updatedAt": "2025-10-26T09:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `500 Internal Server Error` - Database or server error

---

### 6. Get Voice Assignments by Project
**GET** `/api/voice-assignments/by-project/:projectId`

Retrieves all voice assignment manifests for a specific project.

**URL Parameters:**
- `projectId` - UUID of the project

**Success Response (200):**
```json
{
  "count": 1,
  "manifests": [...]
}
```

**Error Responses:**
- `500 Internal Server Error` - Database or server error

---

## Testing Instructions

### Prerequisites
1. PostgreSQL database must be running (via docker-compose)
2. API server must be running on port 3004

### Start Services
```bash
# Start database
docker-compose up -d postgres

# Start API server
cd apps/api
npm run dev
```

### Test with cURL

#### 1. Create a Voice Assignment
```bash
curl -X POST http://localhost:3004/api/voice-assignments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Voice Assignments",
    "description": "Testing voice assignment API",
    "ownerId": "00000000-0000-0000-0000-000000000001",
    "assignments": [
      {
        "npcId": "npc-guard-001",
        "voiceId": "voice-123",
        "voiceName": "Deep Male Voice"
      }
    ]
  }'
```

#### 2. Get a Voice Assignment
```bash
# Replace {manifestId} with the ID returned from create
curl http://localhost:3004/api/voice-assignments/{manifestId}
```

#### 3. Update a Voice Assignment
```bash
curl -X PUT http://localhost:3004/api/voice-assignments/{manifestId} \
  -H "Content-Type: application/json" \
  -d '{
    "assignments": [
      {
        "npcId": "npc-guard-001",
        "voiceId": "voice-789",
        "voiceName": "Updated Voice"
      }
    ]
  }'
```

#### 4. Get Voice Assignments by Owner
```bash
curl http://localhost:3004/api/voice-assignments/by-owner/00000000-0000-0000-0000-000000000001
```

#### 5. Delete a Voice Assignment
```bash
curl -X DELETE http://localhost:3004/api/voice-assignments/{manifestId}
```

---

## Database Schema

The voice assignments are stored in the `voice_manifests` table:

```sql
CREATE TABLE voice_manifests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voice_assignments JSONB NOT NULL,
  manifest_data JSONB,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Voice Assignments JSONB Structure
```json
[
  {
    "npcId": "string",
    "voiceId": "string",
    "voiceName": "string"
  }
]
```

---

## Integration with Frontend

The frontend uses the `useVoiceGenerationStore` to interact with this API:

```typescript
// Save voice assignments
await saveVoiceAssignments(
  manifestId,
  assignments,
  "Manifest Name",
  "Description"
)

// Load voice assignments
const assignments = await loadVoiceAssignments(manifestId)
```

The ManifestVoiceAssignmentPage component provides the UI for:
- Browsing NPCs/Mobs from manifests
- Assigning voices to entities
- Saving assignments to the database
- Loading previously saved assignments

---

## Error Handling

All endpoints include comprehensive error handling:

1. **Validation Errors** (400) - Invalid or missing required fields
2. **Not Found Errors** (404) - Requested resource doesn't exist
3. **Server Errors** (500) - Database connection or query errors

Error responses include:
```json
{
  "error": "Human-readable error message",
  "details": "Technical error details"
}
```

---

## Notes

- All UUIDs should be valid UUID v4 format
- The `version` field auto-increments on updates
- The `updated_at` timestamp is automatically updated
- Assignments are stored as JSONB for efficient querying
- The API validates assignment structure before saving
