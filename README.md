<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DLX Co-Pilot 4.0 - Enterprise AI Development Platform

An enterprise-grade self-hosted AI development platform with multi-model support, advanced collaboration tools, comprehensive analytics, and security features.

**🆕 Version 4.0** introduces enterprise capabilities including multi-model AI, team collaboration, advanced analytics, security & audit logging, and performance monitoring.

View your app in AI Studio: https://ai.studio/apps/drive/1hU4eEF3UH7M7Ur00KFXP-Zn2PSeSOZVQ

## ✨ What's New in v4.0

### 🚀 Major Enterprise Features

- **🤖 Multi-Model AI Platform**: Compare and use Gemini, GPT-4, Claude, and local models
- **📊 Advanced Analytics Dashboard**: Real-time metrics, cost tracking, and comprehensive reporting
- **🔐 Enterprise Security**: Audit logging, API key management, and rate limiting
- **👥 Team Collaboration**: Shared projects, code reviews, and real-time comments
- **⚡ Performance Monitoring**: Web vitals, response time tracking, and optimization insights

### 📈 Value Proposition

DLX Co-Pilot 4.0 delivers enterprise-grade capabilities that justify premium pricing:

- **5 New Major Systems** with ~40,000 lines of production code
- **Multi-Provider AI** reduces vendor lock-in and optimizes costs
- **Business Intelligence** with comprehensive analytics and export
- **Team Features** enable collaboration at scale
- **Security & Compliance** with full audit trails and key rotation

## 🎯 Core Features

### 9 Integrated Modules

1. **Dashboard** - Command center with quick actions and feature overview
2. **Chat Assistant** - Multi-modal AI chat with multiple models
3. **Vision Lab** - Image and video analysis with AI
4. **Asset Forge** - AI-powered asset generation (logos, images, videos)
5. **Project Forge** - Full-stack web development with Monaco editor
6. **Story Writer** - Decision logging and documentation system
7. **Live Conversation** - Real-time audio AI interaction
8. **Local Studio** - Local LLM integration and management
9. **Analytics** ⭐ NEW - Comprehensive metrics and business intelligence

### Enterprise Capabilities

#### 🔐 Security & Audit
- Comprehensive audit logging with severity levels
- API key lifecycle management with auto-rotation
- Rate limiting and resource management
- Compliance-ready data export (JSON/CSV)
- Real-time security alerts

#### 🤖 Multi-Model AI
- Support for Gemini, OpenAI, Anthropic, and local models
- Side-by-side model comparison
- Intelligent prompt caching (30min TTL)
- Real-time cost tracking and optimization
- Detailed usage statistics per model

#### 👥 Collaboration Suite
- Role-based access control (Owner, Admin, Editor, Viewer)
- Code review workflows with status tracking
- In-line comments with file and line numbers
- Activity logs for all project events
- Team member management

#### 📊 Analytics & Insights
- AI usage and cost metrics
- Performance monitoring (P50, P95, P99 latency)
- Success rate tracking
- Memory and resource monitoring
- Multi-format data export

#### ⚡ Performance Monitoring
- Core Web Vitals tracking
- Long task detection
- Paint and resource timing
- Custom metric recording
- Percentile-based analysis

## 🚀 Run Locally

**Prerequisites:** Node.js 18+


1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
   ```bash
   echo "GEMINI_API_KEY=your-api-key-here" > .env.local
   ```

3. (Optional) Configure additional AI providers:
   ```bash
   echo "OPENAI_API_KEY=your-openai-key" >> .env.local
   echo "ANTHROPIC_API_KEY=your-anthropic-key" >> .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

6. Build for production:
   ```bash
   npm run build
   npm run preview
   ```

## 📚 Quick Start Guide

### First-Time Setup

1. **Explore the Dashboard**: View all features and quick actions
2. **Configure API Keys**: Go to Analytics → Security Overview to manage API keys
3. **Try Multi-Model AI**: Use Chat Assistant to compare different AI models
4. **Start a Project**: Use Project Forge to create and collaborate on code
5. **Monitor Performance**: Check Analytics for usage metrics and costs

### Key Workflows

#### Multi-Model AI Comparison
```typescript
// Compare multiple models on the same prompt
import { multiModelService } from './services/multiModelService';

const results = await multiModelService.compareModels(
  ['gemini-flash', 'gpt-4-turbo', 'claude-sonnet'],
  'Explain quantum computing'
);
```

#### Team Collaboration
```typescript
// Create a shared project
import { collaborationService } from './services/collaborationService';

const project = collaborationService.createSharedProject(
  'My App',
  'user-id',
  'team'
);

// Add team member
collaborationService.addTeamMember(project.id, {
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'editor'
});
```

#### Security & Audit
```typescript
// Track API key usage and rotation
import { securityService } from './services/securityService';

const keysNeedingRotation = securityService.checkKeyRotationNeeded();
const auditLogs = securityService.getAuditLogs({ severity: 'critical' });
```

## 🏗️ Architecture

### Service Layer
- **geminiService**: Gemini AI integration
- **multiModelService**: Multi-provider AI orchestration ⭐ NEW
- **collaborationService**: Team features and code review ⭐ NEW
- **securityService**: Audit, keys, and rate limiting ⭐ NEW
- **performanceMonitoringService**: Metrics and analytics ⭐ NEW
- **featureFlagService**: Feature management
- **telemetryService**: Event tracking

### Component Architecture
- React 19 with TypeScript
- Lazy-loaded modules for optimal performance
- Monaco Editor for code editing
- Tailwind CSS for styling

## 🔒 Security Features

- **Audit Logging**: All actions tracked with timestamps and user IDs
- **API Key Rotation**: Automatic rotation schedules and usage limits
- **Rate Limiting**: Configurable per-endpoint limits
- **Data Export**: GDPR-compliant audit log exports
- **Role-Based Access**: Fine-grained permission control

### Security Considerations

**For Self-Hosted Deployments:**
- API keys are stored in browser localStorage for convenience in self-hosted scenarios
- Users control the browser environment and security
- Consider using environment variables for production deployments
- Implement encryption at rest for sensitive multi-user deployments
- Use secure key management systems (e.g., HashiCorp Vault) for enterprise scale

**Best Practices:**
1. Run DLX Co-Pilot 4.0 on a secure, trusted device
2. Use HTTPS for all connections
3. Regularly rotate API keys (automated reminders included)
4. Review audit logs for suspicious activity
5. Export and backup audit trails regularly

## 📊 Analytics & Reporting

### Available Metrics
- AI model usage and costs
- Response time percentiles (P50, P95, P99)
- Success rates and error tracking
- Memory usage monitoring
- Team activity and collaboration stats

### Export Formats
- JSON: Full data export for programmatic access
- CSV: Business intelligence and spreadsheet analysis
- Real-time: Live dashboard updates

## 🤝 Collaboration Features

- **Shared Projects**: Multi-user project management
- **Code Reviews**: Approval workflows with inline comments
- **Activity Tracking**: Complete audit trail of changes
- **Team Roles**: Owner, Admin, Editor, Viewer permissions

## 💰 Cost Optimization

### Multi-Model Strategy
- Compare costs across providers
- Intelligent prompt caching reduces redundant calls
- Usage limits prevent overruns
- Real-time cost tracking

### Estimated Savings
- **Prompt Caching**: Up to 50% reduction in API calls
- **Model Selection**: Choose optimal model for each task
- **Usage Monitoring**: Identify and optimize high-cost operations

## 📖 Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### Version 4.0.0 Highlights
- 5 new enterprise services
- Multi-model AI support (Gemini, OpenAI, Anthropic, Local)
- Team collaboration suite
- Advanced analytics dashboard
- Enterprise security features
- ~40,000 lines of new code

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📄 License

Private - Enterprise Edition

## 🆘 Support

For enterprise support, training, or custom development:
- Documentation: See inline code documentation
- Issues: Report via GitHub issues
- Analytics: Use built-in analytics dashboard for troubleshooting

## 🎯 Roadmap

Future enhancements planned:
- Real-time collaborative editing
- Advanced deployment pipelines
- Database schema designer
- API documentation generator
- Mobile app companion

---

**DLX Co-Pilot 4.0** - Enterprise AI Development Platform
Built with React, TypeScript, and cutting-edge AI technologies.
