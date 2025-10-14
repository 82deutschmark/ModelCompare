# Single Responsibility Principle (SRP) and DRY Violations Analysis

This file is a **massive violation** of both SRP and DRY principles. Here's why:

## SRP Violations

This single file handles **at least 15 different responsibilities**:

1. **Authentication** (OAuth, device auth, logout)
2. **User management** (credits, profiles)
3. **Payment processing** (Stripe integration)
4. **Model catalog** (listing AI models)
5. **Model comparison** (parallel model calls)
6. **Creative combat** (legacy game mode)
7. **Debate system** (structured debates)
8. **Battle system** (model vs model)
9. **Template management** (markdown templates)
10. **Variable resolution** (prompt variables)
11. **Session persistence** (Vixra sessions)
12. **ARC-AGI metrics** (fake benchmark data)
13. **Audit logging** (prompt audits)
14. **Health checks** (monitoring endpoints)
15. **Request validation** (Zod schemas)

Each of these should be its own module with focused responsibilities.

## DRY Violations

### 1. **Repeated Error Handling Pattern**
```typescript
// Appears 20+ times throughout the file
try {
  // ... logic
} catch (error) {
  console.error("Some error:", error);
  res.status(500).json({ error: "Failed to do something" });
}
```

### 2. **Repeated Authentication Checks**
```typescript
// Device user check duplicated
const deviceId = req.headers['x-device-id'] as string;
if (deviceId) {
  const storage = await getStorage();
  const user = await storage.ensureDeviceUser(deviceId);
}
```

### 3. **Repeated Storage Pattern**
```typescript
const storage = await getStorage();
// Appears in nearly every endpoint
```

### 4. **Repeated Response Formatting**
```typescript
// Model response structure duplicated 5+ times
{
  content: result.content,
  reasoning: result.reasoning,
  responseTime: result.responseTime,
  tokenUsage: result.tokenUsage,
  cost: result.cost,
  modelConfig: result.modelConfig,
  status: 'success'
}
```

### 5. **Repeated Variable Resolution Logic**
```typescript
// Variable engine setup duplicated 3+ times
const variableEngine = new VariableEngine({ policy: 'error' });
const resolution = variableEngine.renderFinal(template, variables);
```

---

## Simple Refactoring Plan

### **Phase 1: Extract Route Handlers (Week 1)**

Create separate route files under `server/routes/`:

```
server/routes/
├── auth.routes.ts          # All authentication endpoints
├── credits.routes.ts        # Credit management & Stripe
├── models.routes.ts         # Model catalog & comparison
├── generate.routes.ts       # Unified generate endpoint
├── creative.routes.ts       # Creative combat (deprecated)
├── debate.routes.ts         # Debate system
├── templates.routes.ts      # Template API
├── sessions.routes.ts       # Vixra sessions
├── audits.routes.ts         # Audit logs
├── health.routes.ts         # Health checks
└── arc-agi.routes.ts       # ARC-AGI endpoints
```

### **Phase 2: Extract Middleware (Week 1)**

Create `server/middleware/`:

```typescript
// server/middleware/error-handler.ts
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err, req, res, next) => {
  contextError('Request error:', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error'
  });
};

// server/middleware/validation.ts
export const validateRequest = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Validation failed', details: error.errors });
  }
};
```

### **Phase 3: Extract Service Layer (Week 2)**

Create `server/services/`:

```typescript
// server/services/model.service.ts
export class ModelService {
  async compareModels(prompt: string, modelIds: string[]) {
    const responses = {};
    await Promise.all(
      modelIds.map(async (modelId) => {
        responses[modelId] = await this.callModel(prompt, modelId);
      })
    );
    return responses;
  }

  private formatModelResponse(result) {
    return {
      content: result.content,
      reasoning: result.reasoning,
      responseTime: result.responseTime,
      tokenUsage: result.tokenUsage,
      cost: result.cost,
      modelConfig: result.modelConfig,
      status: 'success'
    };
  }
}

// server/services/variable.service.ts
export class VariableService {
  resolveVariables(template: string, variables: Record<string, any>, mode: string) {
    const engine = new VariableEngine({ policy: 'error' });
    return engine.renderFinal(template, variables);
  }
}
```

### **Phase 4: Create Response Utilities (Week 2)**

```typescript
// server/utils/response.ts
export class ApiResponse {
  static success(res, data, statusCode = 200) {
    return res.status(statusCode).json(data);
  }

  static error(res, message, statusCode = 500, details?) {
    return res.status(statusCode).json({
      error: message,
      ...(details && { details })
    });
  }

  static modelResponse(res, result) {
    return res.json({
      content: result.content,
      reasoning: result.reasoning,
      responseTime: result.responseTime,
      tokenUsage: result.tokenUsage,
      cost: result.cost,
      modelConfig: result.modelConfig
    });
  }
}
```

### **Phase 5: Simplified Main File (Week 3)**

```typescript
// server/routes.ts (AFTER refactoring)
import type { Express } from "express";
import { createServer, type Server } from "http";
import { errorHandler } from "./middleware/error-handler";
import { authRoutes } from "./routes/auth.routes";
import { creditsRoutes } from "./routes/credits.routes";
import { modelsRoutes } from "./routes/models.routes";
import { generateRoutes } from "./routes/generate.routes";
import { templatesRoutes } from "./routes/templates.routes";
import { healthRoutes } from "./routes/health.routes";
// ... other imports

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all route modules
  app.use('/api/auth', authRoutes);
  app.use('/api/credits', creditsRoutes);
  app.use('/api/models', modelsRoutes);
  app.use('/api/generate', generateRoutes);
  app.use('/api/templates', templatesRoutes);
  app.use('/health', healthRoutes);
  // ... other routes

  // Global error handler
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
```

---

## Benefits of This Refactoring

1. **Testability**: Each route handler can be tested in isolation
2. **Maintainability**: Changes to one feature don't affect others
3. **Reusability**: Shared logic (error handling, validation) is centralized
4. **Readability**: Each file has a clear, single purpose
5. **Scalability**: New features can be added without touching existing code
6. **Code Review**: Smaller, focused files are easier to review

## Quick Win: Start Here

**Day 1**: Extract `asyncHandler` and `errorHandler` middleware → Immediate DRY improvement

**Day 2**: Move auth routes to `auth.routes.ts` → Demonstrates the pattern

**Day 3**: Extract `ModelService` → Shows service layer benefits

This incremental approach allows you to refactor without breaking existing functionality, following the [Strangler Fig pattern]