import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ═══════════════════════════════════════════════════════════════
// Role-Specific Technical Topic Mapping
// Maps each IT role to must-ask topics, coding focus, and
// system-design scenarios so the AI never generates generic Qs.
// ═══════════════════════════════════════════════════════════════
const ROLE_TOPIC_MAP = {
  'Frontend Developer': {
    coreTechnical: ['HTML5 semantic elements', 'CSS Flexbox/Grid layout', 'JavaScript closures & event loop', 'DOM manipulation & virtual DOM', 'Responsive design & media queries', 'Browser rendering pipeline & critical render path', 'Web accessibility (ARIA, WCAG)', 'Cross-browser compatibility', 'Performance optimization (lazy loading, code splitting, tree shaking)', 'State management patterns'],
    codingFocus: ['DOM manipulation', 'async/await & Promises', 'array/object transformations', 'debounce/throttle implementation', 'recursive component rendering'],
    systemDesign: ['Design a real-time collaborative text editor', 'Design a dashboard with live updating charts', 'Design a component library architecture'],
    curveball: 'You claim proficiency in CSS — explain the stacking context rules and how z-index actually works with nested positioning contexts.',
  },
  'React Developer': {
    coreTechnical: ['React hooks (useState, useEffect, useCallback, useMemo, useRef)', 'React fiber architecture & reconciliation', 'Virtual DOM diffing algorithm', 'Component lifecycle & re-rendering optimization', 'Context API vs Redux vs Zustand', 'Server-side rendering (SSR) vs Static Site Generation (SSG)', 'React Server Components', 'Custom hooks design patterns', 'Error boundaries & Suspense', 'React performance profiling (React DevTools)'],
    codingFocus: ['custom hook implementation', 'memoization patterns', 'state machine with useReducer', 'debounced search with useEffect cleanup', 'recursive tree component'],
    systemDesign: ['Design an infinite scroll feed like Twitter/Instagram', 'Design a form builder with dynamic validation', 'Design a micro-frontend architecture'],
    curveball: 'Explain exactly what happens between calling setState and the DOM updating — walk through the entire React reconciliation process.',
  },
  'Backend Developer': {
    coreTechnical: ['RESTful API design & best practices', 'Authentication (JWT, OAuth2, session-based)', 'Database design (normalization, indexing, query optimization)', 'Caching strategies (Redis, CDN, in-memory)', 'Message queues (RabbitMQ, Kafka, SQS)', 'Microservices vs monolith architecture', 'API rate limiting & security', 'CORS, CSRF, XSS prevention', 'Database transactions & ACID properties', 'Connection pooling & load balancing'],
    codingFocus: ['API endpoint design', 'database query optimization', 'middleware implementation', 'rate limiter algorithm', 'pub/sub pattern implementation'],
    systemDesign: ['Design a URL shortener like bit.ly', 'Design a notification system', 'Design a payment processing pipeline'],
    curveball: 'Your database query is taking 30 seconds in production but runs fine locally — walk me through your exact debugging process step by step.',
  },
  'Full Stack Developer': {
    coreTechnical: ['Frontend-backend data flow', 'REST vs GraphQL', 'Authentication & authorization (JWT, OAuth)', 'Database design (SQL + NoSQL)', 'Caching layers (browser, CDN, server, database)', 'CI/CD pipelines', 'Docker & containerization', 'State management across full stack', 'WebSockets & real-time features', 'Performance optimization end-to-end'],
    codingFocus: ['full CRUD API with validation', 'WebSocket chat implementation', 'authentication middleware', 'database schema design', 'frontend-backend integration'],
    systemDesign: ['Design a social media platform (full stack)', 'Design an e-commerce checkout flow end-to-end', 'Design a real-time analytics dashboard'],
    curveball: 'A user reports that your app is slow — it could be frontend, backend, database, or network. Walk me through how you systematically isolate the bottleneck.',
  },
  'Node.js Developer': {
    coreTechnical: ['Event loop & non-blocking I/O', 'Streams & buffers', 'Cluster module & worker threads', 'Express/Fastify middleware patterns', 'Error handling in async code', 'Memory leaks in Node.js', 'Package management & module system (CommonJS vs ESM)', 'Process management (PM2, forever)', 'libuv and the thread pool', 'Garbage collection in V8'],
    codingFocus: ['stream processing pipeline', 'custom EventEmitter', 'async error handling patterns', 'rate limiter with sliding window', 'promise pool for concurrent requests'],
    systemDesign: ['Design a real-time chat with Socket.io', 'Design a file upload service handling 10GB files', 'Design a job queue processor'],
    curveball: 'Node.js is single-threaded — explain how it handles 10,000 concurrent connections without blocking. What exactly is the role of libuv?',
  },
  'Python Developer': {
    coreTechnical: ['Python decorators & metaclasses', 'GIL (Global Interpreter Lock)', 'Generators & iterators', 'Context managers', 'Type hints & mypy', 'async/await (asyncio)', 'Memory management & garbage collection', 'List comprehensions vs generator expressions', 'Virtual environments & dependency management', 'Testing (pytest, unittest, mocking)'],
    codingFocus: ['decorator implementation', 'generator-based data pipeline', 'context manager for resource management', 'async web scraper', 'OOP design with SOLID principles'],
    systemDesign: ['Design a web scraper that handles millions of pages', 'Design a data pipeline with ETL', 'Design a REST API with FastAPI/Django'],
    curveball: 'The GIL prevents true parallelism in CPython — when would you still use threading over multiprocessing, and when would you use asyncio instead of both?',
  },
  'Java Developer': {
    coreTechnical: ['JVM memory model (heap, stack, metaspace)', 'Garbage collection algorithms (G1, ZGC)', 'Multithreading & concurrency (synchronized, locks, ExecutorService)', 'Spring Boot dependency injection', 'Java Stream API & functional programming', 'Design patterns (Singleton, Factory, Observer, Strategy)', 'JDBC & ORM (Hibernate/JPA)', 'Exception handling best practices', 'Generics & type erasure', 'Java modules (JPMS)'],
    codingFocus: ['thread-safe singleton', 'concurrent data structure implementation', 'stream pipeline processing', 'custom annotation processor', 'builder pattern with validation'],
    systemDesign: ['Design an order management system', 'Design a distributed caching layer', 'Design a microservice with circuit breaker'],
    curveball: 'Explain what happens from the moment you call `new Object()` to when the object is garbage collected — cover classloading, heap allocation, and GC roots.',
  },
  'Data Scientist': {
    coreTechnical: ['Statistical hypothesis testing (p-values, confidence intervals)', 'Regression analysis (linear, logistic, polynomial)', 'Feature engineering & selection', 'Cross-validation & hyperparameter tuning', 'Bias-variance tradeoff', 'Handling imbalanced datasets (SMOTE, class weights)', 'Dimensionality reduction (PCA, t-SNE, UMAP)', 'A/B testing methodology', 'Time series analysis', 'Bayesian vs frequentist approaches'],
    codingFocus: ['pandas data transformation pipeline', 'custom cross-validation implementation', 'feature engineering functions', 'EDA visualization with matplotlib/seaborn', 'SQL window functions for analytics'],
    systemDesign: ['Design a recommendation engine', 'Design an A/B testing platform', 'Design a customer churn prediction pipeline'],
    curveball: 'Your model has 99% accuracy on a binary classification problem — explain why this might be terrible and what metrics you would actually use.',
  },
  'ML Engineer': {
    coreTechnical: ['Model training pipelines (data → training → evaluation → deployment)', 'Feature stores & feature engineering at scale', 'Model serving & inference optimization', 'MLOps (MLflow, Kubeflow, model versioning)', 'Gradient descent variants (SGD, Adam, RMSprop)', 'Regularization techniques (L1/L2, dropout, batch normalization)', 'Transfer learning & fine-tuning', 'Distributed training (data parallelism, model parallelism)', 'Model monitoring & drift detection', 'Neural network architectures (CNN, RNN, Transformer)'],
    codingFocus: ['custom loss function implementation', 'data pipeline with generators', 'model evaluation script with multiple metrics', 'feature preprocessing pipeline', 'training loop with checkpointing'],
    systemDesign: ['Design a real-time fraud detection system', 'Design an ML model serving platform', 'Design a content moderation pipeline using ML'],
    curveball: 'Your production model started performing 15% worse this week — walk me through your debugging process. How do you distinguish between data drift, concept drift, and a pipeline bug?',
  },
  'AI Engineer': {
    coreTechnical: ['Large Language Models (architecture, tokenization, attention)', 'Prompt engineering & chain-of-thought', 'RAG (Retrieval-Augmented Generation)', 'Fine-tuning vs in-context learning', 'Vector databases (Pinecone, ChromaDB, Weaviate)', 'Embedding models & semantic search', 'AI safety & alignment', 'Hallucination mitigation strategies', 'Agent frameworks (LangChain, AutoGen)', 'Evaluation metrics for generative AI (BLEU, ROUGE, human eval)'],
    codingFocus: ['RAG pipeline implementation', 'custom prompt template engine', 'embedding similarity search', 'API integration with LLM providers', 'streaming response handler'],
    systemDesign: ['Design a chatbot with memory and context management', 'Design a document Q&A system at scale', 'Design a multi-agent system for code generation'],
    curveball: 'Your RAG system returns technically correct but outdated information — how would you architect a solution that guarantees freshness without re-indexing your entire knowledge base?',
  },
  'DevOps Engineer': {
    coreTechnical: ['CI/CD pipeline design (GitHub Actions, Jenkins, GitLab CI)', 'Docker & container orchestration (Kubernetes)', 'Infrastructure as Code (Terraform, Ansible, Pulumi)', 'Monitoring & observability (Prometheus, Grafana, ELK)', 'Cloud services (AWS/GCP/Azure — compute, storage, networking)', 'Linux administration & shell scripting', 'Networking (DNS, load balancers, reverse proxies, CDN)', 'Security (secrets management, IAM, network policies)', 'Incident response & postmortem culture', 'GitOps & deployment strategies (blue-green, canary, rolling)'],
    codingFocus: ['Dockerfile optimization', 'CI/CD pipeline YAML configuration', 'shell scripting for automation', 'Terraform module design', 'health check & monitoring script'],
    systemDesign: ['Design a zero-downtime deployment pipeline', 'Design a multi-region disaster recovery setup', 'Design a centralized logging & alerting system'],
    curveball: 'It\'s 3AM and your on-call pager fires — production is down. You have access to logs, metrics, and kubectl. Walk me through your first 10 minutes.',
  },
  'Cloud Architect': {
    coreTechnical: ['Multi-cloud strategy & vendor lock-in avoidance', 'Serverless architecture (Lambda, Cloud Functions)', 'Cloud networking (VPC, subnets, peering, Transit Gateway)', 'Auto-scaling strategies (horizontal, vertical, predictive)', 'Cloud cost optimization', 'Data sovereignty & compliance (GDPR, HIPAA)', 'Disaster recovery (RPO/RTO)', 'Service mesh (Istio, Envoy)', 'Event-driven architecture', 'Cloud-native security (Zero Trust, WAF, DDoS protection)'],
    codingFocus: ['serverless function handler', 'IaC module with Terraform', 'CloudFormation template', 'API Gateway configuration', 'cost estimation script'],
    systemDesign: ['Design a globally distributed e-commerce platform', 'Design a data lake architecture', 'Design a multi-tenant SaaS platform'],
    curveball: 'Your monthly cloud bill jumped 300% overnight — walk me through exactly how you would investigate and resolve this.',
  },
  'Site Reliability Engineer': {
    coreTechnical: ['SLIs, SLOs, and SLAs', 'Error budgets & burn rates', 'Distributed tracing (Jaeger, Zipkin)', 'Chaos engineering principles', 'Capacity planning & load testing', 'Incident management & postmortem process', 'Toil reduction and automation', 'On-call best practices', 'Runbook documentation', 'Reliability patterns (circuit breaker, bulkhead, retry with backoff)'],
    codingFocus: ['health check endpoint implementation', 'exponential backoff with jitter', 'SLI calculation from logs', 'automated incident triage script', 'chaos testing script'],
    systemDesign: ['Design a system for 99.99% uptime', 'Design an automated incident response pipeline', 'Design an observability platform'],
    curveball: 'Your error budget is at 5% remaining with 2 weeks left in the quarter, but the PM wants to ship a big feature. How do you handle this?',
  },
  'Mobile Developer (React Native)': {
    coreTechnical: ['React Native bridge architecture', 'Native module integration (iOS/Android)', 'Navigation (React Navigation, deep linking)', 'State management in mobile context', 'Performance optimization (FlatList, memoization, Hermes)', 'Offline-first architecture & data persistence', 'Push notifications (FCM, APNs)', 'App security (certificate pinning, secure storage)', 'Hot reload vs live reload vs OTA updates', 'Testing (Detox, Jest, E2E)'],
    codingFocus: ['custom native module bridge', 'infinite scroll FlatList optimization', 'offline-first sync mechanism', 'deep link handler', 'custom animated component'],
    systemDesign: ['Design a mobile banking app architecture', 'Design offline-capable note-taking app', 'Design a real-time location tracking app'],
    curveball: 'Your React Native app has a 2-second white screen on startup on low-end Android devices — walk me through your profiling and optimization process.',
  },
  'Mobile Developer (Flutter)': {
    coreTechnical: ['Flutter widget tree & rendering pipeline', 'State management (Provider, BLoC, Riverpod)', 'Dart isolates & concurrency', 'Platform channels (method channel, event channel)', 'Custom painting & animations', 'Navigation 2.0 & GoRouter', 'Dart null safety & sound typing', 'Flutter DevTools & performance profiling', 'Firebase integration', 'Widget testing & integration testing'],
    codingFocus: ['custom widget with CustomPainter', 'BLoC pattern implementation', 'platform channel for native feature', 'animated page transition', 'responsive layout builder'],
    systemDesign: ['Design a cross-platform chat app', 'Design a media streaming app with caching', 'Design a plugin architecture for Flutter app'],
    curveball: 'Explain the Flutter rendering pipeline — from widget rebuild to pixel painting. When would you use RepaintBoundary and why?',
  },
  'iOS Developer': {
    coreTechnical: ['Swift protocol-oriented programming', 'UIKit vs SwiftUI architecture', 'Memory management (ARC, retain cycles, weak/unowned)', 'Concurrency (async/await, Actors, GCD, OperationQueue)', 'Core Data vs SwiftData', 'App lifecycle & scene management', 'Combine framework & reactive programming', 'App Store guidelines & review process', 'Push notifications (APNs, silent push)', 'Instruments profiling (memory leaks, energy, time profiler)'],
    codingFocus: ['protocol-oriented design', 'async/await data fetching', 'custom UIView with animations', 'Core Data CRUD operations', 'Combine publisher chains'],
    systemDesign: ['Design an iOS photo editing app architecture', 'Design offline-first sync for a notes app', 'Design a modular iOS app with Swift Packages'],
    curveball: 'You have a retain cycle in production causing memory leaks — how would you find it using Instruments, and what patterns would you use to prevent it?',
  },
  'Android Developer': {
    coreTechnical: ['Android Jetpack components (ViewModel, LiveData, Room)', 'Jetpack Compose vs XML layouts', 'Activity/Fragment lifecycle', 'Kotlin coroutines & Flow', 'Dependency injection (Hilt/Dagger)', 'Navigation component & deep linking', 'WorkManager for background tasks', 'App performance (startup, rendering, memory)', 'Material Design 3 implementation', 'Android security (ProGuard, encrypted SharedPreferences)'],
    codingFocus: ['ViewModel with repository pattern', 'Composable UI with state hoisting', 'Kotlin coroutine with error handling', 'Room database with migrations', 'custom view with Canvas'],
    systemDesign: ['Design a music streaming app with offline mode', 'Design a multi-module Android architecture', 'Design a push notification handling system'],
    curveball: 'Your app has janky scrolling in a RecyclerView with 10,000 items — walk me through your debugging and optimization process.',
  },
  'QA / Test Engineer': {
    coreTechnical: ['Test pyramid (unit, integration, E2E)', 'TDD & BDD methodology', 'Automation frameworks (Selenium, Cypress, Playwright)', 'API testing (Postman, REST Assured)', 'Performance testing (JMeter, k6, Locust)', 'Security testing basics (OWASP Top 10)', 'CI/CD integration for testing', 'Test coverage metrics & analysis', 'Mobile testing strategies', 'Shift-left testing philosophy'],
    codingFocus: ['page object model implementation', 'API test suite design', 'data-driven test framework', 'custom assertion library', 'performance test script'],
    systemDesign: ['Design a test automation framework from scratch', 'Design a CI/CD testing pipeline', 'Design a test data management system'],
    curveball: 'You have 500 test cases but only time to run 50 before release — how do you decide which ones to run? What is risk-based testing?',
  },
  'Cybersecurity Analyst': {
    coreTechnical: ['OWASP Top 10 vulnerabilities', 'Network security (firewalls, IDS/IPS, VPN)', 'Encryption (symmetric, asymmetric, hashing)', 'Authentication & authorization models (RBAC, ABAC)', 'Security incident response process', 'Penetration testing methodology', 'SIEM & log analysis', 'Container security', 'Zero Trust architecture', 'Compliance frameworks (SOC2, ISO 27001, PCI DSS)'],
    codingFocus: ['vulnerability scanning script', 'log analysis parser', 'encryption/decryption implementation', 'JWT validation & security', 'network packet analysis'],
    systemDesign: ['Design a secure authentication system', 'Design a SIEM pipeline', 'Design a secrets management solution'],
    curveball: 'You discover a SQL injection vulnerability in production that has been there for 6 months — walk me through your immediate response, investigation, and remediation.',
  },
  'Data Engineer': {
    coreTechnical: ['ETL/ELT pipeline design', 'Data warehousing (star schema, snowflake schema)', 'Batch vs stream processing (Spark, Flink, Kafka Streams)', 'Data quality & validation', 'Data partitioning & sharding strategies', 'Data lake vs data warehouse vs data lakehouse', 'Orchestration (Airflow, Dagster, Prefect)', 'CDC (Change Data Capture)', 'Schema evolution & versioning', 'Data governance & cataloging (Hive Metastore, DataHub)'],
    codingFocus: ['Spark transformation pipeline', 'Airflow DAG design', 'SQL window functions', 'data validation framework', 'incremental load logic'],
    systemDesign: ['Design a real-time analytics pipeline', 'Design a data lakehouse architecture', 'Design a data quality monitoring system'],
    curveball: 'Your daily ETL pipeline that processes 100M rows suddenly starts taking 4x longer — walk me through how you diagnose whether it is a data issue, a compute issue, or a configuration issue.',
  },
  'Database Administrator': {
    coreTechnical: ['Query optimization & execution plans', 'Indexing strategies (B-tree, hash, GIN, GiST)', 'Replication (master-slave, multi-master, logical)', 'Backup & disaster recovery strategies', 'Connection pooling & resource management', 'Database security (encryption at rest, in transit, audit logs)', 'Partitioning strategies (range, hash, list)', 'Lock management & deadlock resolution', 'Monitoring & performance tuning', 'Migration strategies (zero-downtime migrations)'],
    codingFocus: ['complex SQL query optimization', 'stored procedure design', 'index analysis script', 'migration script with rollback', 'monitoring query for deadlocks'],
    systemDesign: ['Design a multi-region database architecture', 'Design a database migration strategy for a live system', 'Design a caching layer with database sync'],
    curveball: 'A SELECT query that was fast yesterday is now slow and locking tables — the table grew from 1M to 100M rows overnight. Walk me through your diagnosis.',
  },
  'Blockchain Developer': {
    coreTechnical: ['Consensus mechanisms (PoW, PoS, DPoS, PBFT)', 'Smart contract development (Solidity, Rust)', 'EVM architecture & gas optimization', 'DeFi concepts (AMM, liquidity pools, flash loans)', 'Web3 integration (ethers.js, web3.js)', 'Token standards (ERC-20, ERC-721, ERC-1155)', 'Layer 2 solutions (rollups, sidechains, state channels)', 'Security (reentrancy, front-running, oracle manipulation)', 'IPFS & decentralized storage', 'Cross-chain bridges & interoperability'],
    codingFocus: ['ERC-20 token contract', 'reentrancy-safe withdrawal', 'gas-optimized data structures', 'Merkle tree implementation', 'multi-signature wallet'],
    systemDesign: ['Design a decentralized exchange (DEX)', 'Design an NFT marketplace', 'Design a cross-chain bridge'],
    curveball: 'You deployed a smart contract with a critical bug — but contracts are immutable. Walk me through your upgrade strategy and how you would prevent this.',
  },
  'Software Engineer': {
    coreTechnical: ['Data structures (arrays, linked lists, trees, graphs, hash maps)', 'Algorithms (sorting, searching, graph traversal, dynamic programming)', 'Object-oriented design (SOLID principles, design patterns)', 'System design fundamentals (load balancing, caching, CDN)', 'Databases (SQL joins, indexing, NoSQL trade-offs)', 'Version control (Git branching strategies, merge vs rebase)', 'Testing strategies (unit, integration, E2E)', 'API design (REST, GraphQL, gRPC)', 'Concurrency & parallelism', 'Software development lifecycle & Agile'],
    codingFocus: ['algorithm optimization', 'data structure implementation', 'OOP design problem', 'system utility script', 'concurrent programming'],
    systemDesign: ['Design a chat application like Slack', 'Design a file storage system like Google Drive', 'Design a rate limiter'],
    curveball: 'You wrote code that works perfectly in development but fails intermittently in production — describe the most common cause categories and how you would debug each.',
  },
  'Solutions Architect': {
    coreTechnical: ['Architecture patterns (microservices, event-driven, CQRS, saga)', 'Cloud-native design principles', 'API gateway & service mesh', 'Data consistency in distributed systems (CAP theorem, eventual consistency)', 'Performance & scalability planning', 'Security architecture (defense in depth)', 'Cost modeling & TCO analysis', 'Integration patterns (sync, async, event-driven)', 'Migration strategies (strangler fig, parallel run)', 'Compliance & regulatory requirements'],
    codingFocus: ['architecture decision record (ADR)', 'proof of concept implementation', 'integration adapter pattern', 'event schema design', 'API contract design'],
    systemDesign: ['Design a migration from monolith to microservices', 'Design a multi-tenant SaaS platform', 'Design a global real-time data synchronization system'],
    curveball: 'Your client wants microservices but they are a 5-person team with a single product — would you talk them out of it? How would you make the case while maintaining the client relationship?',
  },
  'Technical Lead': {
    coreTechnical: ['Technical decision-making frameworks', 'Code review best practices', 'Architecture documentation (C4, ADRs)', 'Technical debt management', 'Team velocity & sprint planning', 'Mentoring & knowledge sharing', 'Cross-team collaboration', 'Risk assessment & mitigation', 'Performance monitoring & SLAs', 'Build vs buy decisions'],
    codingFocus: ['code review feedback exercise', 'architecture decision document', 'refactoring legacy code', 'testing strategy design', 'CI/CD pipeline optimization'],
    systemDesign: ['Design a platform engineering strategy', 'Design a code quality & review process', 'Design a technical onboarding program'],
    curveball: 'Your best engineer wants to rewrite the entire backend in Rust. The current Python codebase works but has performance issues. How do you evaluate and respond to this proposal?',
  },
  'Engineering Manager': {
    coreTechnical: ['Team structure & org design', 'Hiring & interview process design', 'Performance management (1:1s, feedback, PIPs)', 'Agile/Scrum at scale (SAFe, LeSS)', 'Cross-functional collaboration (PM, Design, Eng)', 'Technical strategy & roadmapping', 'Incident management & postmortems', 'Developer experience & productivity metrics', 'Budgeting & resource allocation', 'Diversity & inclusion in engineering'],
    codingFocus: ['technical assessment design', 'metrics dashboard specification', 'process automation script', 'RFC/design doc template', 'sprint retrospective analysis'],
    systemDesign: ['Design a developer productivity platform', 'Design an engineering hiring pipeline', 'Design a team scaling strategy for 3x growth'],
    curveball: 'Two of your senior engineers fundamentally disagree on the architecture for a critical project, and it is blocking the team. How do you resolve this without picking a side?',
  },
  'Product Manager (Technical)': {
    coreTechnical: ['Product discovery & validation', 'PRD (Product Requirements Document) writing', 'Technical feasibility assessment', 'Data-driven decision making (metrics, analytics)', 'A/B testing & experiment design', 'Roadmap prioritization frameworks (RICE, MoSCoW, Kano)', 'API & technical documentation understanding', 'User story writing & acceptance criteria', 'Stakeholder management', 'Agile ceremonies & backlog management'],
    codingFocus: ['SQL query for product analytics', 'A/B test analysis script', 'user funnel analysis', 'feature flag configuration', 'product metrics dashboard spec'],
    systemDesign: ['Design a product analytics pipeline', 'Design a feature flagging system', 'Design a user feedback collection platform'],
    curveball: 'Engineering tells you a feature will take 3 months. You believe it can be done in 3 weeks with a different approach. How do you handle this without undermining the engineering team?',
  },
  'UI/UX Designer': {
    coreTechnical: ['Design systems & component libraries', 'User research methods (interviews, surveys, usability testing)', 'Information architecture & wireframing', 'Prototyping tools (Figma, Sketch, Adobe XD)', 'Accessibility standards (WCAG 2.1 AA)', 'Responsive & adaptive design principles', 'Design tokens & handoff to engineering', 'Micro-interactions & animation principles', 'Heuristic evaluation (Nielsen\'s heuristics)', 'Design thinking methodology'],
    codingFocus: ['CSS animation implementation', 'responsive layout with CSS Grid', 'accessibility audit script', 'design token to CSS custom properties', 'interactive prototype (HTML/CSS/JS)'],
    systemDesign: ['Design a design system for a large organization', 'Design a user onboarding flow for a complex SaaS product', 'Design a notification system UX across platforms'],
    curveball: 'A stakeholder wants to add 5 more features to an already cluttered page. Walk me through how you push back with data and design principles while maintaining the relationship.',
  },
  'System Administrator': {
    coreTechnical: ['Linux/Windows server administration', 'Networking (TCP/IP, DNS, DHCP, subnetting)', 'Shell scripting (Bash, PowerShell)', 'Virtualization (VMware, Hyper-V, KVM)', 'Backup & disaster recovery', 'User & access management (LDAP, Active Directory)', 'Monitoring (Nagios, Zabbix, SNMP)', 'Patch management & security hardening', 'Storage management (SAN, NAS, RAID)', 'Firewall & VPN configuration'],
    codingFocus: ['Bash/PowerShell automation scripts', 'log rotation and cleanup script', 'user provisioning automation', 'health check monitoring script', 'backup automation with verification'],
    systemDesign: ['Design a centralized log management system', 'Design a high-availability server cluster', 'Design an automated patch management pipeline'],
    curveball: 'A server running a critical service has 100% disk usage and you cannot SSH into it — walk me through your recovery steps.',
  },
};

// Fallback for roles not in the map
const DEFAULT_TOPICS = {
  coreTechnical: ['Data structures & algorithms', 'Object-oriented programming', 'Database fundamentals', 'API design', 'Version control', 'Testing methodologies', 'Problem-solving approach', 'System design basics', 'Code quality & best practices', 'Debugging strategies'],
  codingFocus: ['algorithm implementation', 'data structure usage', 'string manipulation', 'array processing', 'OOP design'],
  systemDesign: ['Design a URL shortener', 'Design a task management system', 'Design a notification service'],
  curveball: 'Describe a technical concept you think most candidates get wrong in interviews — and explain it correctly.',
};

export async function POST(request) {
  try {
    const { resumeAnalysis, resumeText, targetRole, difficulty, targetCompany, interviewType } = await request.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const difficultyGuide = {
      junior: 'Entry-level questions (0-2 years). Focus on fundamentals, basic concepts, eagerness to learn. Coding: simple data structure problems, string manipulation, basic algorithms. Do NOT ask about system design at scale or deep architecture.',
      mid: 'Mid-level questions (2-5 years). Include system design basics, problem-solving, deeper technical concepts. Coding: medium difficulty — algorithms, optimization, design patterns. Expect hands-on experience.',
      senior: 'Senior-level questions (5+ years). Focus on architecture, leadership, trade-offs, mentoring, complex system design. Coding: complex algorithmic problems, system-level thinking. Probe deeply into WHY behind every decision.',
      lead: 'Lead/Principal-level questions (8+ years). Focus on strategic thinking, team building, cross-functional leadership, architectural vision. Coding: system design + code architecture. Ask about team and organizational impact.',
    };

    // Get role-specific topics
    const roleTopics = ROLE_TOPIC_MAP[targetRole] || DEFAULT_TOPICS;

    // Determine primary programming language for coding questions
    const primaryLang = resumeAnalysis.programmingLanguages?.find(l => l.proficiency === 'primary')?.name
      || resumeAnalysis.programmingLanguages?.[0]?.name
      || resumeAnalysis.skills?.technical?.find(s => ['python', 'java', 'javascript', 'c++', 'c#', 'typescript', 'go', 'rust', 'ruby', 'php', 'kotlin', 'swift'].includes(s.toLowerCase()))
      || 'Python';

    // Company-specific interview style guidance
    let companyStyle = '';
    if (targetCompany) {
      const companyLower = targetCompany.toLowerCase();
      if (['google', 'alphabet'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Google. Style: Heavy focus on algorithms, data structures, system design, and Googleyness (collaboration, intellectual humility). Ask at least one algorithmic coding question. Behavioral questions should probe for collaboration and innovation.`;
      } else if (['amazon', 'aws'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Amazon. Style: Frame behavioral questions around Amazon's Leadership Principles (Customer Obsession, Ownership, Bias for Action, Dive Deep, Earn Trust). Technical questions should focus on scalability and distributed systems.`;
      } else if (['microsoft'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Microsoft. Style: Mix of coding, system design, and behavioral. Emphasize growth mindset, collaboration, and impact. Technical questions should cover both breadth and depth.`;
      } else if (['meta', 'facebook'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Meta. Style: Heavy coding focus with system design for senior roles. Questions should emphasize scale (billions of users), product thinking, and move-fast mentality. Behavioral around impact and collaboration.`;
      } else if (['apple'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Apple. Style: Focus on attention to detail, craftsmanship, passion for the product. Technical depth matters. Ask about design decisions and trade-offs extensively.`;
      } else if (['tcs', 'infosys', 'wipro', 'hcl', 'cognizant', 'tech mahindra', 'capgemini'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: ${targetCompany} (Indian IT Services). Style: Focus on fundamentals — OOP, DBMS, SQL, networking basics, and language proficiency. Behavioral questions about teamwork and client handling. Less system design, more core CS fundamentals. Ask questions about SDLC, Agile methodology.`;
      } else if (['startup', 'early stage', 'seed'].some(c => companyLower.includes(c))) {
        companyStyle = `Company: Startup. Style: Emphasize breadth over depth, ownership, wearing multiple hats, moving fast. Ask about building things from scratch, handling ambiguity, and making trade-offs with limited resources.`;
      } else {
        companyStyle = `Company: ${targetCompany}. Tailor questions to match professional standards expected at this company. Mix technical depth with practical problem-solving.`;
      }
    }

    // Build resume gaps/focus areas for emphasis
    const gapsAndFocusAreas = [
      ...(resumeAnalysis.gaps || []),
      ...(resumeAnalysis.interviewFocusAreas || []),
      ...(resumeAnalysis.interestingAspects || []),
    ];

    // Determine question counts based on interview type
    let phaseInstructions = '';
    const isFullInterview = !interviewType || interviewType === 'full';
    const isResumeOnly = interviewType === 'resume';
    const isTechnicalOnly = interviewType === 'technical';
    const isCodingFocus = interviewType === 'coding';

    if (isResumeOnly) {
      phaseInstructions = `Generate exactly 10 questions. ALL should be resume category, deeply probing every aspect of the candidate's resume — projects, experience, internships, skills, gaps.`;
    } else if (isTechnicalOnly) {
      phaseInstructions = `Generate exactly 12 questions:
- 2 resume questions (ice-breaker + one project question)
- 6 technical questions (deep domain knowledge for ${targetRole}). USE THESE ROLE-SPECIFIC TOPICS: ${roleTopics.coreTechnical.join(', ')}
- 2 coding challenges (in ${primaryLang}). CODING FOCUS AREAS: ${roleTopics.codingFocus.join(', ')}
- 2 system design / architecture questions. PICK FROM: ${roleTopics.systemDesign.join(' | ')}`;
    } else if (isCodingFocus) {
      phaseInstructions = `Generate exactly 10 questions:
- 1 resume ice-breaker
- 2 technical concept questions from: ${roleTopics.coreTechnical.slice(0, 5).join(', ')}
- 5 coding challenges of increasing difficulty (all in ${primaryLang}). FOCUS ON: ${roleTopics.codingFocus.join(', ')}
- 2 code review / optimization questions`;
    } else {
      // Full interview
      phaseInstructions = `Generate exactly 20 interview questions in this EXACT order:

**PHASE 1 — Resume Introduction (2 Qs, category: "resume")**
Q1: Ice-breaker — "Tell me about yourself and your journey into tech..." — BUT make it SPECIFIC. Reference their actual background (${resumeAnalysis.name || 'the candidate'}, their education at ${resumeAnalysis.education?.[0]?.institution || 'their university'}, their domain in ${resumeAnalysis.domainExpertise?.join(', ') || 'technology'}).
Q2: Career motivation — Why ${targetRole} specifically? Reference their actual trajectory. If they come from a different background, ask about the transition. If they've been in the same track, ask what excites them about the next step.

**PHASE 2 — Project Deep-Dive (4 Qs, category: "project")**
For the candidate's most impressive/relevant projects (${(resumeAnalysis.projects || []).map(p => p.name).join(', ') || 'their projects'}):
Q3: "Walk me through [ACTUAL PROJECT NAME from resume]. What problem were you solving and what was your approach?"
Q4: "Why did you choose [ACTUAL TECH from project] for [ACTUAL PROJECT NAME]? Did you consider [SPECIFIC ALTERNATIVE — for example if they used React, ask about Vue/Angular/Svelte; if MongoDB, ask about PostgreSQL/DynamoDB]? What were the trade-offs?"
Q5: "What was the biggest challenge you faced in [ACTUAL PROJECT NAME] and how did you overcome it?"
Q6: "If you could rebuild [ACTUAL PROJECT NAME] today with unlimited time and resources, what would you do differently? What would you add?"

**PHASE 3 — Experience & Internship Deep-Dive (3 Qs, category: "experience")**
Q7: About their most recent/relevant work experience — "At [ACTUAL COMPANY from resume], what were your main responsibilities? What's something you're particularly proud of delivering?"
Q8: ${(resumeAnalysis.internships || []).length > 0 
  ? `About their internship — "During your internship at [ACTUAL INTERNSHIP COMPANY], what did you learn about working in a professional environment? What was the most impactful thing you contributed?"`
  : `About self-learning — "I notice you don't have formal internship experience listed. How have you gained practical, hands-on skills outside of coursework? Walk me through your self-learning approach."`}
Q9: Probe a GAP or INTERESTING ASPECT from the resume analysis. Possible areas: ${gapsAndFocusAreas.slice(0, 3).join('; ') || 'notable aspects of their background'}.

**PHASE 4 — Technical Knowledge (4 Qs, category: "technical")**
MANDATORY: Use these ROLE-SPECIFIC topics for ${targetRole}. Pick 4 from this list:
${roleTopics.coreTechnical.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

Q10: A fundamental concept question from the role-specific topics above.
Q11: A deeper question that tests understanding beyond definitions — ask them to compare two approaches, explain trade-offs, or describe when NOT to use something.
Q12: A practical problem-solving question — describe a real scenario and ask how they would handle it. Example scenarios: ${roleTopics.systemDesign.slice(0, 2).join(', ')}.
Q13: CURVEBALL QUESTION — This is designed to test depth beyond surface knowledge: "${roleTopics.curveball}"

**PHASE 5 — Coding Challenge (2 Qs, category: "coding")**
Q14-Q15: Coding problems the candidate must solve by writing actual code.
  - Use ${primaryLang} as the language (this is their strongest language from the resume)
  - CODING PROBLEMS MUST BE RELEVANT TO THE ROLE: ${roleTopics.codingFocus.join(', ')}
  - Q14 should be easier (warm-up), Q15 should be harder
  - Frame as: "Can you write a function in ${primaryLang} that..."
  - Include clear input/output examples in the question
  - For ${difficulty} level, adjust complexity appropriately
  - NEVER give generic LeetCode problems — make them relevant to ${targetRole}

**PHASE 6 — Behavioral (3 Qs, category: "behavioral")**
Q16-Q18: STAR-method behavioral questions tailored to their actual experience:
  - Teamwork/collaboration scenario — reference their actual team size or project context
  - Handling failure or setback — ask about a specific technical failure they might have faced given their resume
  - Leadership or initiative — calibrate to their level (${difficulty})

**PHASE 7 — Situational (2 Qs, category: "situational")**
Q19-Q20: "What would you do if..." scenarios SPECIFIC to ${targetRole}:
  - Use role-relevant crisis scenarios (e.g., for DevOps: "Your CI/CD pipeline breaks at 2AM"; for Frontend: "A major accessibility lawsuit"; for ML: "Your model is producing biased predictions in production")
  - Stakeholder/team conflict scenario relevant to their career level`;
    }

    const prompt = `You are an expert technical interviewer for the role of "${targetRole}"${targetCompany ? ` at ${targetCompany}` : ' at a top tech company'}.
You are conducting a professional, thorough interview that simulates a REAL interview experience.

${companyStyle}

=== FULL RESUME TEXT (you MUST reference SPECIFIC content — project names, company names, technologies, achievements, numbers) ===
"""
${resumeText || 'Not available'}
"""

=== STRUCTURED RESUME ANALYSIS ===
- Name: ${resumeAnalysis.name || 'Candidate'}
- Skills: ${JSON.stringify(resumeAnalysis.skills || {})}
- Programming Languages: ${JSON.stringify(resumeAnalysis.programmingLanguages || [])}
- Experience: ${JSON.stringify(resumeAnalysis.experience || [])}
- Internships: ${JSON.stringify(resumeAnalysis.internships || [])}
- Projects (detailed): ${JSON.stringify(resumeAnalysis.projects || [])}
- Education: ${JSON.stringify(resumeAnalysis.education || [])}
- Achievements: ${JSON.stringify(resumeAnalysis.achievements || [])}
- Strengths: ${JSON.stringify(resumeAnalysis.strengths || [])}
- Gaps/Concerns: ${JSON.stringify(resumeAnalysis.gaps || [])}
- Domain Expertise: ${JSON.stringify(resumeAnalysis.domainExpertise || [])}
- Career Gaps: ${JSON.stringify(resumeAnalysis.careerGaps || [])}
- Interesting Aspects: ${JSON.stringify(resumeAnalysis.interestingAspects || [])}
- Interview Focus Areas: ${JSON.stringify(resumeAnalysis.interviewFocusAreas || [])}
- Certifications: ${JSON.stringify(resumeAnalysis.certifications || [])}

=== ROLE-SPECIFIC TECHNICAL TOPICS (USE THESE — do NOT invent generic topics) ===
Core Technical: ${roleTopics.coreTechnical.join(', ')}
Coding Focus: ${roleTopics.codingFocus.join(', ')}
System Design Scenarios: ${roleTopics.systemDesign.join(', ')}
Curveball Question: ${roleTopics.curveball}

Difficulty Level: ${difficulty}
Guide: ${difficultyGuide[difficulty] || difficultyGuide.mid}
Primary Programming Language: ${primaryLang}

=== RESUME GAPS & AREAS TO PROBE ===
The resume analysis identified these areas where deep questioning would reveal true competency:
${gapsAndFocusAreas.length > 0 ? gapsAndFocusAreas.map((g, i) => `${i + 1}. ${g}`).join('\n') : 'No significant gaps identified — still probe claimed skills vs demonstrated experience.'}

YOU MUST include at least 1-2 questions that specifically test these gap areas.

${phaseInstructions}

CRITICAL RULES:
1. Resume/Project/Experience questions MUST reference REAL content from the resume — actual project names, company names, technologies, metrics, dates. NO generic questions allowed. If you write "Tell me about a project", that is WRONG. Write "Tell me about [Actual Project Name] — what problem were you solving?"
2. For project questions, ALWAYS ask "why this tech?" and suggest a REAL, REASONABLE alternative (e.g., "Why React and not Vue?" or "Why MongoDB and not PostgreSQL?"). The alternative must make sense for the context.
3. Coding questions MUST be in ${primaryLang}, include clear problem statements with examples, and be solvable in 5-15 minutes. CODING TOPICS MUST BE ROLE-RELEVANT — use the coding focus topics listed above.
4. Coding question format MUST include: problem description, input format, output format, and at least 2 examples.
5. Technical questions MUST come from the ROLE-SPECIFIC TECHNICAL TOPICS listed above — do NOT ask random CS trivia unless it's directly relevant to ${targetRole}.
6. Behavioral questions should reference their actual experience level — don't ask about "managing large teams" to a junior. Calibrate to ${difficulty} level.
7. Questions should flow naturally — like a real conversation, not an interrogation. Reference previous context when possible (e.g., "Earlier you mentioned X — building on that...").
8. Each question should be 1-4 sentences max — conversational tone, not robotic.
9. The array MUST follow the exact phase order specified above.
10. Include at least ONE curveball question from the role-specific topics — designed to test depth beyond surface knowledge.
11. For GAP/FOCUS areas from resume analysis — include probing questions that verify whether the candidate genuinely knows what they claim.

Return a JSON array (no markdown, no code blocks, just pure JSON):
[
  {
    "question": "The actual interview question text — must be specific and reference real resume content",
    "category": "resume|project|experience|technical|coding|behavioral|situational|closing",
    "expectedTopics": ["topic1", "topic2"],
    "difficulty": "${difficulty}",
    "codingLanguage": "${primaryLang} (only for coding category, otherwise null)",
    "expectedApproach": "For coding: expected algorithm/approach. For others: null"
  }
]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let questions;
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      questions = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback questions — still role-specific
      const candidateName = resumeAnalysis?.name || 'you';
      const firstProject = resumeAnalysis?.projects?.[0]?.name || 'your most notable project';
      const firstProjectTech = resumeAnalysis?.projects?.[0]?.technologies?.[0] || roleTopics.coreTechnical[0];
      const firstSkill = resumeAnalysis?.skills?.technical?.[0] || roleTopics.coreTechnical[0];
      const firstCompany = resumeAnalysis?.experience?.[0]?.company || resumeAnalysis?.internships?.[0]?.company || 'your most recent organization';
      questions = [
        { question: `To start things off, ${candidateName}, can you give me a brief walkthrough of your background and what specifically led you to pursue the ${targetRole} role?`, category: 'resume', expectedTopics: ['background', 'motivation'], difficulty },
        { question: `I see you worked on ${firstProject}. Can you walk me through what you built and what your individual contribution was?`, category: 'project', expectedTopics: ['projects', 'technical depth'], difficulty },
        { question: `Why did you choose ${firstProjectTech} for ${firstProject}? Were there alternatives you considered, and what trade-offs did you evaluate?`, category: 'project', expectedTopics: ['tech choices', 'trade-offs'], difficulty },
        { question: `Tell me about your time at ${firstCompany}. What were your main responsibilities and what's something you're particularly proud of?`, category: 'experience', expectedTopics: ['experience', 'achievements'], difficulty },
        { question: `Let's talk about ${roleTopics.coreTechnical[0]}. Can you explain this concept and how you've applied it in your work?`, category: 'technical', expectedTopics: [roleTopics.coreTechnical[0]], difficulty },
        { question: `Here's a scenario: ${roleTopics.systemDesign[0]}. How would you approach this?`, category: 'technical', expectedTopics: ['system design', 'architecture'], difficulty },
        { question: `${roleTopics.curveball}`, category: 'technical', expectedTopics: ['depth', 'understanding'], difficulty },
        { question: `Write a function in ${primaryLang} that takes a list of numbers and returns the two numbers that add up to a given target. Include the function signature and handle edge cases.`, category: 'coding', codingLanguage: primaryLang, expectedApproach: 'Two-pointer or hash map approach', expectedTopics: ['coding', 'problem solving'], difficulty },
        { question: 'Tell me about a time when you faced a significant technical challenge that seemed impossible at first. How did you approach it and what was the outcome?', category: 'behavioral', expectedTopics: ['problem-solving', 'resilience'], difficulty },
        { question: `Imagine you discover a critical bug in production at ${firstCompany || 'your company'} that affects users right now. Walk me through your immediate response.`, category: 'situational', expectedTopics: ['incident response', 'prioritization'], difficulty },
      ];
    }

    return NextResponse.json({ success: true, questions });
  } catch (error) {
    console.error('Question generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions: ' + error.message },
      { status: 500 }
    );
  }
}
