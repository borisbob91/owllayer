# DomOS Flutter - Extensions & Integrations

> Patterns avancés pour projets complexes et intégration avec l'écosystème Flutter

---

## 📦 Structure des Packages

```
domos-flutter/
├── domos_flutter/                    # Package core (base)
├── domos_flutter_extensions/         # Extensions avancées
└── domos_flutter_integrations/       # Intégrations state management
```

---

## 🔥 Package 1 : `domos_flutter_extensions`

### Installation

```yaml
dependencies:
  domos_flutter: ^0.1.0
  domos_flutter_extensions: ^0.1.0
```

### Contenu

```
domos_flutter_extensions/
├── lib/
│   ├── domos_flutter_extensions.dart
│   │
│   ├── src/
│   │   ├── stream_tools/
│   │   │   ├── stream_tool_handler.dart
│   │   │   ├── tool_events.dart
│   │   │   └── stream_extension.dart
│   │   │
│   │   ├── repository/
│   │   │   ├── repository_adapter.dart
│   │   │   ├── repository_mixin.dart
│   │   │   └── tool_definition.dart
│   │   │
│   │   ├── event_bus/
│   │   │   ├── event_bus_extension.dart
│   │   │   ├── event_emitter_tool.dart
│   │   │   └── event_listener_tool.dart
│   │   │
│   │   └── namespaces/
│   │       ├── tool_namespace.dart
│   │       ├── namespace_extension.dart
│   │       └── namespace_manager.dart
│   │
│   └── models/
│       ├── tool_progress.dart
│       └── tool_result.dart
```

---

## 🔄 Extension 1 : Stream Tools (Reactive)

### Concept

**Problème** : Les tools classiques sont "fire-and-forget" - pas de feedback progressif.

**Solution** : Tools qui retournent un `Stream<ToolEvent>` pour du feedback en temps réel.

### Implémentation Complète

```dart
// lib/src/stream_tools/tool_events.dart

/// Base event pour stream tools
abstract class ToolEvent {
  final DateTime timestamp;
  
  ToolEvent() : timestamp = DateTime.now();
}

/// Progress event (feedback intermédiaire)
class ToolProgress extends ToolEvent {
  final String status;
  final double? progress;  // 0.0 to 1.0
  final Map<String, dynamic>? metadata;
  
  ToolProgress({
    required this.status,
    this.progress,
    this.metadata,
  });
  
  @override
  String toString() => 'ToolProgress(status: $status, progress: $progress)';
}

/// Result event (résultat final)
class ToolResult extends ToolEvent {
  final dynamic data;
  final Map<String, dynamic>? metadata;
  
  ToolResult({required this.data, this.metadata});
  
  @override
  String toString() => 'ToolResult(data: $data)';
}

/// Error event
class ToolError extends ToolEvent {
  final String message;
  final dynamic error;
  final StackTrace? stackTrace;
  
  ToolError({
    required this.message,
    this.error,
    this.stackTrace,
  });
  
  @override
  String toString() => 'ToolError(message: $message)';
}

/// Log event (debugging)
class ToolLog extends ToolEvent {
  final String message;
  final String level;  // 'debug' | 'info' | 'warn' | 'error'
  
  ToolLog({required this.message, this.level = 'info'});
  
  @override
  String toString() => '[$level] $message';
}
```

```dart
// lib/src/stream_tools/stream_tool_handler.dart

/// Handler type pour stream tools
typedef StreamToolHandler = Stream<ToolEvent> Function(Map<String, dynamic> args);

/// Options pour stream tools
class StreamToolOptions {
  /// Timeout pour le stream (défaut: 30s)
  final Duration timeout;
  
  /// Envoyer les progress au serveur ?
  final bool sendProgressToServer;
  
  /// Buffer les events ?
  final bool bufferEvents;
  
  const StreamToolOptions({
    this.timeout = const Duration(seconds: 30),
    this.sendProgressToServer = true,
    this.bufferEvents = false,
  });
}
```

```dart
// lib/src/stream_tools/stream_extension.dart

import 'package:domos_flutter/domos_flutter.dart';
import 'stream_tool_handler.dart';
import 'tool_events.dart';

/// Extension pour enregistrer des stream tools
extension StreamToolsExtension on DomOSClient {
  
  /// Enregistrer un tool qui retourne un Stream
  void registerStreamTool({
    required String name,
    required String description,
    required StreamToolHandler handler,
    Map<String, ToolParameter>? parameters,
    RiskLevel risk = RiskLevel.none,
    StreamToolOptions options = const StreamToolOptions(),
  }) {
    registerTool(
      declaration: ToolDeclaration(
        name: name,
        description: description,
        parameters: parameters,
        risk: risk,
      ),
      handler: (args) async {
        return _executeStreamTool(name, handler, args, options);
      },
    );
  }
  
  /// Exécuter un stream tool
  Future<dynamic> _executeStreamTool(
    String toolName,
    StreamToolHandler handler,
    Map<String, dynamic> args,
    StreamToolOptions options,
  ) async {
    final events = <ToolEvent>[];
    dynamic result;
    
    try {
      final stream = handler(args).timeout(
        options.timeout,
        onTimeout: (sink) {
          sink.addError(TimeoutException('Tool execution timed out'));
          sink.close();
        },
      );
      
      await for (final event in stream) {
        if (options.bufferEvents) {
          events.add(event);
        }
        
        if (event is ToolProgress) {
          _handleProgress(toolName, event, options);
        } else if (event is ToolResult) {
          result = event.data;
        } else if (event is ToolError) {
          throw Exception(event.message);
        } else if (event is ToolLog) {
          _handleLog(toolName, event);
        }
      }
      
      return result ?? events;
      
    } catch (e, stack) {
      throw ToolExecutionException(
        toolName: toolName,
        message: e.toString(),
        stackTrace: stack,
      );
    }
  }
  
  void _handleProgress(
    String toolName,
    ToolProgress progress,
    StreamToolOptions options,
  ) {
    if (options.sendProgressToServer) {
      // Envoyer au serveur via context update
      updateContext({
        '_toolProgress': {
          'tool': toolName,
          'status': progress.status,
          'progress': progress.progress,
          'metadata': progress.metadata,
          'timestamp': progress.timestamp.toIso8601String(),
        }
      });
    }
  }
  
  void _handleLog(String toolName, ToolLog log) {
    // Logger integration
    print('[Tool:$toolName] ${log.message}');
  }
}

/// Exception pour stream tools
class ToolExecutionException implements Exception {
  final String toolName;
  final String message;
  final StackTrace? stackTrace;
  
  ToolExecutionException({
    required this.toolName,
    required this.message,
    this.stackTrace,
  });
  
  @override
  String toString() => 'ToolExecutionException($toolName): $message';
}
```

### Usage Exemple

```dart
// example/lib/stream_tools_example.dart

import 'package:flutter/material.dart';
import 'package:domos_flutter/domos_flutter.dart';
import 'package:domos_flutter_extensions/domos_flutter_extensions.dart';

class SearchScreen extends StatefulWidget {
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> with UseAgentMixin {
  String _searchStatus = '';
  double _progress = 0.0;
  List<String> _logs = [];
  
  @override
  void initState() {
    super.initState();
    
    // Register stream tool
    agent.registerStreamTool(
      name: 'search_products_advanced',
      description: 'Search products with real-time progress',
      handler: (args) async* {
        final query = args['query'] as String;
        
        // Étape 1
        yield ToolLog(message: 'Starting search for: $query', level: 'info');
        yield ToolProgress(status: '🔍 Initializing search...', progress: 0.1);
        await Future.delayed(Duration(milliseconds: 500));
        
        // Étape 2
        yield ToolProgress(status: '📡 Connecting to API...', progress: 0.3);
        await Future.delayed(Duration(milliseconds: 800));
        
        // Étape 3
        yield ToolLog(message: 'Fetching results from database', level: 'debug');
        yield ToolProgress(status: '📦 Fetching results...', progress: 0.5);
        
        final results = await _searchAPI(query);
        
        yield ToolLog(message: 'Found ${results.length} results', level: 'info');
        
        // Étape 4
        yield ToolProgress(status: '✨ Processing results...', progress: 0.8);
        await Future.delayed(Duration(milliseconds: 500));
        
        final formatted = _formatResults(results);
        
        // Étape 5
        yield ToolProgress(status: '✅ Done!', progress: 1.0);
        
        // Résultat final
        yield ToolResult(
          data: formatted,
          metadata: {
            'count': results.length,
            'query': query,
            'timestamp': DateTime.now().toIso8601String(),
          },
        );
      },
      options: StreamToolOptions(
        timeout: Duration(seconds: 30),
        sendProgressToServer: true,
        bufferEvents: true,
      ),
    );
    
    // Listen to progress updates
    agent.stateStream.listen((_) {
      final progressData = agent._shadowContext.get('_toolProgress');
      if (progressData != null && mounted) {
        setState(() {
          _searchStatus = progressData['status'] ?? '';
          _progress = (progressData['progress'] as num?)?.toDouble() ?? 0.0;
        });
      }
    });
  }
  
  Future<List<Map<String, dynamic>>> _searchAPI(String query) async {
    await Future.delayed(Duration(seconds: 1));
    return [
      {'id': '1', 'name': 'Product A'},
      {'id': '2', 'name': 'Product B'},
    ];
  }
  
  List<Map<String, dynamic>> _formatResults(List<Map<String, dynamic>> results) {
    return results.map((r) => {...r, 'formatted': true}).toList();
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Stream Tools Demo')),
      body: Column(
        children: [
          if (_searchStatus.isNotEmpty) ...[
            Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(_searchStatus, style: TextStyle(fontSize: 16)),
                  SizedBox(height: 8),
                  LinearProgressIndicator(value: _progress),
                  SizedBox(height: 8),
                  Text('${(_progress * 100).toInt()}%'),
                ],
              ),
            ),
          ],
          
          Expanded(
            child: ListView(
              children: _logs.map((log) => ListTile(title: Text(log))).toList(),
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## 🏗️ Extension 2 : Repository Adapter (Clean Architecture)

### Concept

**Problème** : Dupliquer la logique métier dans les tools.

**Solution** : Adapter automatiquement les repositories existants en tools.

### Implémentation Complète

```dart
// lib/src/repository/tool_definition.dart

import 'package:domos_flutter/domos_flutter.dart';

/// Définition d'un tool depuis un repository
class AgentToolDefinition {
  final String name;
  final String description;
  final Future<dynamic> Function(Map<String, dynamic>) handler;
  final Map<String, ToolParameter>? parameters;
  final RiskLevel risk;
  
  const AgentToolDefinition({
    required this.name,
    required this.description,
    required this.handler,
    this.parameters,
    this.risk = RiskLevel.none,
  });
}
```

```dart
// lib/src/repository/repository_adapter.dart

import 'package:domos_flutter/domos_flutter.dart';
import 'tool_definition.dart';

/// Base class pour adapter un Repository en tools
abstract class RepositoryToolsAdapter {
  /// Nom du domaine/namespace
  String get domain;
  
  /// Liste des tools exposés
  List<AgentToolDefinition> get tools;
  
  /// Enregistrer tous les tools du repository
  void registerAll(DomOSClient client) {
    for (final tool in tools) {
      client.registerTool(
        declaration: ToolDeclaration(
          name: '${domain}.${tool.name}',
          description: '[$domain] ${tool.description}',
          parameters: tool.parameters,
          risk: tool.risk,
        ),
        handler: tool.handler,
      );
    }
  }
  
  /// Désinscrire tous les tools
  void unregisterAll(DomOSClient client) {
    for (final tool in tools) {
      client.unregisterTool('${domain}.${tool.name}');
    }
  }
}

/// Adapter avec gestion d'erreurs automatique
abstract class SafeRepositoryToolsAdapter extends RepositoryToolsAdapter {
  @override
  void registerAll(DomOSClient client) {
    for (final tool in tools) {
      client.registerTool(
        declaration: ToolDeclaration(
          name: '${domain}.${tool.name}',
          description: '[$domain] ${tool.description}',
          parameters: tool.parameters,
          risk: tool.risk,
        ),
        handler: (args) async {
          try {
            return await tool.handler(args);
          } catch (e, stack) {
            return {
              'error': true,
              'message': e.toString(),
              'tool': tool.name,
            };
          }
        },
      );
    }
  }
}
```

```dart
// lib/src/repository/repository_mixin.dart

import 'package:flutter/widgets.dart';
import 'package:domos_flutter/domos_flutter.dart';
import 'repository_adapter.dart';

/// Mixin pour enregistrer automatiquement des adapters
mixin RepositoryToolsMixin<T extends StatefulWidget> on State<T> {
  /// Liste des adapters à enregistrer
  List<RepositoryToolsAdapter> get adapters;
  
  DomOSClient? _client;
  
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    
    if (_client == null) {
      _client = DomOSProvider.of(context);
      
      for (final adapter in adapters) {
        adapter.registerAll(_client!);
      }
    }
  }
  
  @override
  void dispose() {
    if (_client != null) {
      for (final adapter in adapters) {
        adapter.unregisterAll(_client!);
      }
    }
    super.dispose();
  }
}
```

### Usage Exemple

```dart
// example/lib/repository_example.dart

import 'package:domos_flutter/domos_flutter.dart';
import 'package:domos_flutter_extensions/domos_flutter_extensions.dart';

// 1. Define your repositories (business logic)
class ProductRepository {
  Future<List<Product>> search(String query) async {
    // Business logic here
    return await api.searchProducts(query);
  }
  
  Future<Product> getById(String id) async {
    return await api.getProduct(id);
  }
  
  Future<void> addToCart(String productId, int quantity) async {
    await api.addToCart(productId, quantity);
  }
}

class UserRepository {
  Future<User> getCurrentUser() async {
    return await api.getCurrentUser();
  }
  
  Future<void> updateProfile(User user) async {
    await api.updateUser(user);
  }
}

// 2. Create adapters
class ProductToolsAdapter extends SafeRepositoryToolsAdapter {
  final ProductRepository repo;
  
  ProductToolsAdapter(this.repo);
  
  @override
  String get domain => 'products';
  
  @override
  List<AgentToolDefinition> get tools => [
    AgentToolDefinition(
      name: 'search',
      description: 'Search for products by query',
      handler: (args) async {
        final query = args['query'] as String;
        final results = await repo.search(query);
        return results.map((p) => p.toJson()).toList();
      },
      parameters: {
        'query': ToolParameter(
          type: 'string',
          description: 'Search query',
          required: true,
        ),
      },
    ),
    
    AgentToolDefinition(
      name: 'getById',
      description: 'Get product details by ID',
      handler: (args) async {
        final id = args['id'] as String;
        final product = await repo.getById(id);
        return product.toJson();
      },
      parameters: {
        'id': ToolParameter(
          type: 'string',
          description: 'Product ID',
          required: true,
        ),
      },
    ),
    
    AgentToolDefinition(
      name: 'addToCart',
      description: 'Add product to shopping cart',
      handler: (args) async {
        final productId = args['productId'] as String;
        final quantity = args['quantity'] as int? ?? 1;
        await repo.addToCart(productId, quantity);
        return {'success': true, 'message': 'Added to cart'};
      },
      parameters: {
        'productId': ToolParameter(
          type: 'string',
          description: 'Product ID to add',
          required: true,
        ),
        'quantity': ToolParameter(
          type: 'integer',
          description: 'Quantity to add',
          required: false,
        ),
      },
      risk: RiskLevel.low,
    ),
  ];
}

class UserToolsAdapter extends SafeRepositoryToolsAdapter {
  final UserRepository repo;
  
  UserToolsAdapter(this.repo);
  
  @override
  String get domain => 'user';
  
  @override
  List<AgentToolDefinition> get tools => [
    AgentToolDefinition(
      name: 'getProfile',
      description: 'Get current user profile',
      handler: (_) async {
        final user = await repo.getCurrentUser();
        return user.toJson();
      },
    ),
    
    AgentToolDefinition(
      name: 'updateProfile',
      description: 'Update user profile',
      handler: (args) async {
        final user = User.fromJson(args);
        await repo.updateProfile(user);
        return {'success': true};
      },
      risk: RiskLevel.high,
    ),
  ];
}

// 3. Use in your app
class MyApp extends StatefulWidget {
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> with RepositoryToolsMixin {
  final productRepo = ProductRepository();
  final userRepo = UserRepository();
  
  @override
  List<RepositoryToolsAdapter> get adapters => [
    ProductToolsAdapter(productRepo),
    UserToolsAdapter(userRepo),
  ];
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: DomOSProvider(
        apiKey: 'pk_...',
        endpoint: 'ws://...',
        child: HomeScreen(),
      ),
    );
  }
}

// Result: Tools disponibles
// - products.search
// - products.getById
// - products.addToCart
// - user.getProfile
// - user.updateProfile
```

---

## 🔌 Extension 3 : Event Bus Integration

### Concept

**Problème** : Modules découplés qui doivent communiquer via events.

**Solution** : Tools qui émettent et écoutent des events sur un EventBus.

### Implémentation

```dart
// lib/src/event_bus/event_bus_extension.dart

import 'package:event_bus/event_bus.dart';
import 'package:domos_flutter/domos_flutter.dart';

extension EventBusToolsExtension on DomOSClient {
  
  /// Tool qui émet un event
  void registerEventEmitterTool({
    required String name,
    required String description,
    required EventBus eventBus,
    required dynamic Function(Map<String, dynamic>) eventFactory,
    Map<String, ToolParameter>? parameters,
  }) {
    registerTool(
      declaration: ToolDeclaration(
        name: name,
        description: description,
        parameters: parameters,
      ),
      handler: (args) async {
        final event = eventFactory(args);
        eventBus.fire(event);
        return {
          'success': true,
          'event': event.runtimeType.toString(),
          'message': 'Event emitted successfully',
        };
      },
    );
  }
  
  /// Tool qui écoute un event et attend sa réception
  void registerEventListenerTool<T>({
    required String name,
    required String description,
    required EventBus eventBus,
    required dynamic Function(T) responseExtractor,
    Duration timeout = const Duration(seconds: 10),
    Map<String, ToolParameter>? parameters,
  }) {
    registerTool(
      declaration: ToolDeclaration(
        name: name,
        description: description,
        parameters: parameters,
      ),
      handler: (args) async {
        final completer = Completer<dynamic>();
        
        final subscription = eventBus.on<T>().listen((event) {
          if (!completer.isCompleted) {
            final response = responseExtractor(event);
            completer.complete(response);
          }
        });
        
        try {
          final result = await completer.future.timeout(
            timeout,
            onTimeout: () => throw TimeoutException('Event listener timed out'),
          );
          
          return result;
        } finally {
          await subscription.cancel();
        }
      },
    );
  }
  
  /// Tool qui émet un event et attend la réponse
  void registerEventRequestTool<TRequest, TResponse>({
    required String name,
    required String description,
    required EventBus eventBus,
    required TRequest Function(Map<String, dynamic>) requestFactory,
    required dynamic Function(TResponse) responseExtractor,
    Duration timeout = const Duration(seconds: 10),
    Map<String, ToolParameter>? parameters,
  }) {
    registerTool(
      declaration: ToolDeclaration(
        name: name,
        description: description,
        parameters: parameters,
      ),
      handler: (args) async {
        final completer = Completer<dynamic>();
        
        // Listen for response
        final subscription = eventBus.on<TResponse>().listen((event) {
          if (!completer.isCompleted) {
            final response = responseExtractor(event);
            completer.complete(response);
          }
        });
        
        try {
          // Emit request
          final request = requestFactory(args);
          eventBus.fire(request);
          
          // Wait for response
          final result = await completer.future.timeout(
            timeout,
            onTimeout: () => throw TimeoutException('Request timed out'),
          );
          
          return result;
        } finally {
          await subscription.cancel();
        }
      },
    );
  }
}
```

### Usage Exemple

```dart
// example/lib/event_bus_example.dart

import 'package:event_bus/event_bus.dart';
import 'package:domos_flutter_extensions/domos_flutter_extensions.dart';

// 1. Define events
class SearchProductsRequested {
  final String query;
  SearchProductsRequested(this.query);
}

class SearchProductsCompleted {
  final List<Product> products;
  final String query;
  SearchProductsCompleted(this.products, this.query);
}

class AddToCartRequested {
  final String productId;
  AddToCartRequested(this.productId);
}

class CartUpdated {
  final int itemCount;
  CartUpdated(this.itemCount);
}

// 2. Setup app with event bus
class MyApp extends StatefulWidget {
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> with UseAgentMixin {
  final eventBus = EventBus();
  
  @override
  void initState() {
    super.initState();
    
    // Business logic handlers
    _setupEventHandlers();
    
    // Register tools
    _registerTools();
  }
  
  void _setupEventHandlers() {
    // Handle search requests
    eventBus.on<SearchProductsRequested>().listen((event) async {
      final products = await api.searchProducts(event.query);
      eventBus.fire(SearchProductsCompleted(products, event.query));
    });
    
    // Handle add to cart
    eventBus.on<AddToCartRequested>().listen((event) async {
      await cart.addProduct(event.productId);
      final count = await cart.getItemCount();
      eventBus.fire(CartUpdated(count));
    });
  }
  
  void _registerTools() {
    // Tool 1: Search products (request-response)
    agent.registerEventRequestTool<SearchProductsRequested, SearchProductsCompleted>(
      name: 'search_products_eventbus',
      description: 'Search products via event bus',
      eventBus: eventBus,
      requestFactory: (args) => SearchProductsRequested(args['query']),
      responseExtractor: (event) => {
        'query': event.query,
        'count': event.products.length,
        'products': event.products.map((p) => p.toJson()).toList(),
      },
      timeout: Duration(seconds: 15),
    );
    
    // Tool 2: Add to cart (emit only)
    agent.registerEventEmitterTool(
      name: 'add_to_cart_eventbus',
      description: 'Add product to cart via event',
      eventBus: eventBus,
      eventFactory: (args) => AddToCartRequested(args['productId']),
    );
    
    // Tool 3: Wait for cart update (listen only)
    agent.registerEventListenerTool<CartUpdated>(
      name: 'wait_for_cart_update',
      description: 'Wait for cart to be updated',
      eventBus: eventBus,
      responseExtractor: (event) => {
        'itemCount': event.itemCount,
        'message': 'Cart now has ${event.itemCount} items',
      },
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: DomOSProvider(
        apiKey: 'pk_...',
        endpoint: 'ws://...',
        child: HomeScreen(),
      ),
    );
  }
}
```

---

## 🧩 Extension 4 : Tool Namespaces

### Concept

**Problème** : Dans les gros projets, avoir 50+ tools à plat devient ingérable.

**Solution** : Organiser les tools par namespace/domaine.

### Implémentation

```dart
// lib/src/namespaces/tool_namespace.dart

import 'package:domos_flutter/domos_flutter.dart';

class ToolNamespace {
  final String namespace;
  final DomOSClient client;
  final Map<String, String> _registeredTools = {};
  
  ToolNamespace(this.namespace, this.client);
  
  /// Enregistrer un tool dans ce namespace
  void register({
    required String name,
    required String description,
    required Future<dynamic> Function(Map<String, dynamic>) handler,
    Map<String, ToolParameter>? parameters,
    RiskLevel risk = RiskLevel.none,
  }) {
    final fullName = '$namespace.$name';
    
    client.registerTool(
      declaration: ToolDeclaration(
        name: fullName,
        description: '[$namespace] $description',
        parameters: parameters,
        risk: risk,
      ),
      handler: handler,
    );
    
    _registeredTools[name] = fullName;
  }
  
  /// Désinscrire un tool spécifique
  void unregister(String name) {
    final fullName = _registeredTools[name];
    if (fullName != null) {
      client.unregisterTool(fullName);
      _registeredTools.remove(name);
    }
  }
  
  /// Désinscrire tous les tools du namespace
  void dispose() {
    for (final fullName in _registeredTools.values) {
      client.unregisterTool(fullName);
    }
    _registeredTools.clear();
  }
  
  /// Nombre de tools enregistrés
  int get toolCount => _registeredTools.length;
  
  /// Liste des noms de tools
  List<String> get toolNames => _registeredTools.keys.toList();
}
```

```dart
// lib/src/namespaces/namespace_extension.dart

import 'package:domos_flutter/domos_flutter.dart';
import 'tool_namespace.dart';

extension NamespaceExtension on DomOSClient {
  /// Créer un namespace
  ToolNamespace namespace(String name) {
    return ToolNamespace(name, this);
  }
}
```

```dart
// lib/src/namespaces/namespace_manager.dart

import 'package:domos_flutter/domos_flutter.dart';
import 'tool_namespace.dart';

/// Manager pour gérer plusieurs namespaces
class NamespaceManager {
  final DomOSClient client;
  final Map<String, ToolNamespace> _namespaces = {};
  
  NamespaceManager(this.client);
  
  /// Obtenir ou créer un namespace
  ToolNamespace getOrCreate(String name) {
    return _namespaces.putIfAbsent(
      name,
      () => ToolNamespace(name, client),
    );
  }
  
  /// Supprimer un namespace
  void remove(String name) {
    final ns = _namespaces.remove(name);
    ns?.dispose();
  }
  
  /// Supprimer tous les namespaces
  void disposeAll() {
    for (final ns in _namespaces.values) {
      ns.dispose();
    }
    _namespaces.clear();
  }
  
  /// Liste des namespaces
  List<String> get namespaces => _namespaces.keys.toList();
  
  /// Nombre total de tools
  int get totalToolCount {
    return _namespaces.values.fold(0, (sum, ns) => sum + ns.toolCount);
  }
}
```

### Usage Exemple

```dart
// example/lib/namespaces_example.dart

import 'package:domos_flutter_extensions/domos_flutter_extensions.dart';

class ECommerceApp extends StatefulWidget {
  @override
  State<ECommerceApp> createState() => _ECommerceAppState();
}

class _ECommerceAppState extends State<ECommerceApp> with UseAgentMixin {
  late NamespaceManager nsManager;
  
  @override
  void initState() {
    super.initState();
    
    nsManager = NamespaceManager(agent);
    
    // Setup namespaces
    _setupProductsNamespace();
    _setupCartNamespace();
    _setupUserNamespace();
    _setupOrdersNamespace();
  }
  
  void _setupProductsNamespace() {
    final products = nsManager.getOrCreate('products');
    
    products.register(
      name: 'search',  // → products.search
      description: 'Search for products',
      handler: (args) => api.searchProducts(args['query']),
    );
    
    products.register(
      name: 'getDetails',  // → products.getDetails
      description: 'Get product details',
      handler: (args) => api.getProduct(args['id']),
    );
    
    products.register(
      name: 'getReviews',  // → products.getReviews
      description: 'Get product reviews',
      handler: (args) => api.getReviews(args['productId']),
    );
  }
  
  void _setupCartNamespace() {
    final cart = nsManager.getOrCreate('cart');
    
    cart.register(
      name: 'add',  // → cart.add
      description: 'Add item to cart',
      handler: (args) => cartService.add(args['productId'], args['quantity']),
      risk: RiskLevel.low,
    );
    
    cart.register(
      name: 'remove',  // → cart.remove
      description: 'Remove item from cart',
      handler: (args) => cartService.remove(args['itemId']),
      risk: RiskLevel.low,
    );
    
    cart.register(
      name: 'getItems',  // → cart.getItems
      description: 'Get cart items',
      handler: (_) => cartService.getItems(),
    );
    
    cart.register(
      name: 'clear',  // → cart.clear
      description: 'Clear entire cart',
      handler: (_) => cartService.clear(),
      risk: RiskLevel.high,
    );
  }
  
  void _setupUserNamespace() {
    final user = nsManager.getOrCreate('user');
    
    user.register(
      name: 'getProfile',  // → user.getProfile
      description: 'Get user profile',
      handler: (_) => userService.getProfile(),
    );
    
    user.register(
      name: 'updateProfile',  // → user.updateProfile
      description: 'Update user profile',
      handler: (args) => userService.updateProfile(args),
      risk: RiskLevel.high,
    );
    
    user.register(
      name: 'getAddresses',  // → user.getAddresses
      description: 'Get saved addresses',
      handler: (_) => userService.getAddresses(),
    );
  }
  
  void _setupOrdersNamespace() {
    final orders = nsManager.getOrCreate('orders');
    
    orders.register(
      name: 'list',  // → orders.list
      description: 'List user orders',
      handler: (_) => orderService.listOrders(),
    );
    
    orders.register(
      name: 'getDetails',  // → orders.getDetails
      description: 'Get order details',
      handler: (args) => orderService.getOrder(args['orderId']),
    );
    
    orders.register(
      name: 'track',  // → orders.track
      description: 'Track order status',
      handler: (args) => orderService.trackOrder(args['orderId']),
    );
  }
  
  @override
  void dispose() {
    nsManager.disposeAll();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: Text('E-Commerce with Namespaces'),
          actions: [
            // Display tool count
            Center(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text('${nsManager.totalToolCount} tools'),
              ),
            ),
          ],
        ),
        body: Column(
          children: [
            // Display namespaces
            ...nsManager.namespaces.map((ns) {
              final namespace = nsManager.getOrCreate(ns);
              return ListTile(
                title: Text(ns),
                subtitle: Text('${namespace.toolCount} tools'),
                trailing: Icon(Icons.check_circle, color: Colors.green),
              );
            }),
          ],
        ),
      ),
    );
  }
}

// Result: Tools disponibles organisés par domaine
// products.*  (3 tools)
// cart.*      (4 tools)
// user.*      (3 tools)
// orders.*    (3 tools)
// Total: 13 tools bien organisés !
```

---

## 🎛️ Package 2 : `domos_flutter_integrations`

### Installation

```yaml
dependencies:
  domos_flutter: ^0.1.0
  domos_flutter_integrations: ^0.1.0
  
  # Choose your state management
  flutter_riverpod: ^2.5.0  # For Riverpod
  # OR
  flutter_bloc: ^8.1.0      # For Bloc
  # OR
  get: ^4.6.0               # For GetX
```

### Contenu

```
domos_flutter_integrations/
├── lib/
│   ├── domos_flutter_integrations.dart
│   │
│   ├── riverpod/
│   │   ├── domos_provider.dart
│   │   ├── agent_state_provider.dart
│   │   ├── tool_provider.dart
│   │   └── riverpod_tools.dart
│   │
│   ├── bloc/
│   │   ├── domos_bloc.dart
│   │   ├── domos_event.dart
│   │   ├── domos_state.dart
│   │   └── bloc_tools.dart
│   │
│   └── getx/
│       ├── domos_controller.dart
│       ├── domos_bindings.dart
│       └── getx_tools.dart
```

---

## 🔵 Integration 1 : Riverpod

### Implémentation

```dart
// lib/riverpod/domos_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:domos_flutter/domos_flutter.dart';

/// Provider pour DomOSClient
final domosClientProvider = Provider<DomOSClient>((ref) {
  final client = DomOSClient(
    DomOSClientOptions(
      endpoint: ref.watch(domosEndpointProvider),
      apiKey: ref.watch(domosApiKeyProvider),
      debug: true,
    ),
  );
  
  // Auto-connect
  client.connect();
  
  // Cleanup
  ref.onDispose(() => client.dispose());
  
  return client;
});

/// Provider pour l'endpoint (peut être dynamique)
final domosEndpointProvider = Provider<String>((ref) {
  return 'ws://localhost:3000/domos';
});

/// Provider pour l'API key
final domosApiKeyProvider = Provider<String>((ref) {
  return 'pk_demo_local';
});

/// Provider pour l'état de l'agent (Stream)
final agentStateProvider = StreamProvider<ClientState>((ref) {
  final client = ref.watch(domosClientProvider);
  return client.stateStream;
});

/// Provider pour le sessionId (Stream)
final sessionIdProvider = StreamProvider<String>((ref) {
  final client = ref.watch(domosClientProvider);
  return client.sessionStream;
});

/// Provider pour les réponses de l'agent (Stream)
final agentResponseProvider = StreamProvider<AgentResponse>((ref) {
  final client = ref.watch(domosClientProvider);
  return client.agentResponseStream;
});

/// Provider pour les tool calls (Stream)
final toolCallsProvider = StreamProvider<ToolCall>((ref) {
  final client = ref.watch(domosClientProvider);
  return client.toolCallStream;
});

/// Provider pour les approvals (Stream)
final approvalRequestsProvider = StreamProvider<ApprovalRequest>((ref) {
  final client = ref.watch(domosClientProvider);
  return client.approvalRequestStream;
});
```

```dart
// lib/riverpod/tool_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:domos_flutter/domos_flutter.dart';
import 'domos_provider.dart';

/// Factory pour créer des tool providers
class RiverpodToolProvider {
  /// Créer un provider qui enregistre automatiquement un tool
  static Provider<void> tool({
    required String name,
    required String description,
    required FutureOr<dynamic> Function(Ref ref, Map<String, dynamic> args) handler,
    Map<String, ToolParameter>? parameters,
    RiskLevel risk = RiskLevel.none,
  }) {
    return Provider((ref) {
      final client = ref.watch(domosClientProvider);
      
      // Register tool
      client.registerTool(
        declaration: ToolDeclaration(
          name: name,
          description: description,
          parameters: parameters,
          risk: risk,
        ),
        handler: (args) => handler(ref, args),
      );
      
      // Unregister on dispose
      ref.onDispose(() => client.unregisterTool(name));
    });
  }
  
  /// Créer un provider qui enregistre un tool depuis un repository
  static Provider<void> repositoryTool<T>({
    required String name,
    required String description,
    required Provider<T> repositoryProvider,
    required FutureOr<dynamic> Function(T repo, Map<String, dynamic> args) handler,
    Map<String, ToolParameter>? parameters,
  }) {
    return Provider((ref) {
      final client = ref.watch(domosClientProvider);
      final repo = ref.watch(repositoryProvider);
      
      client.registerTool(
        declaration: ToolDeclaration(
          name: name,
          description: description,
          parameters: parameters,
        ),
        handler: (args) => handler(repo, args),
      );
      
      ref.onDispose(() => client.unregisterTool(name));
    });
  }
}
```

### Usage Exemple

```dart
// example/lib/riverpod_example.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:domos_flutter_integrations/riverpod.dart';

// 1. Define repositories as providers
final productRepositoryProvider = Provider((ref) => ProductRepository());
final cartRepositoryProvider = Provider((ref) => CartRepository());

// 2. Define tools as providers
final searchProductsToolProvider = RiverpodToolProvider.repositoryTool(
  name: 'search_products',
  description: 'Search for products',
  repositoryProvider: productRepositoryProvider,
  handler: (repo, args) => repo.search(args['query']),
  parameters: {
    'query': ToolParameter(type: 'string', description: 'Search query'),
  },
);

final addToCartToolProvider = RiverpodToolProvider.repositoryTool(
  name: 'add_to_cart',
  description: 'Add product to cart',
  repositoryProvider: cartRepositoryProvider,
  handler: (repo, args) => repo.addProduct(args['productId']),
  parameters: {
    'productId': ToolParameter(type: 'string', description: 'Product ID'),
  },
);

// 3. Use in your app
class MyApp extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch tools (auto-register)
    ref.watch(searchProductsToolProvider);
    ref.watch(addToCartToolProvider);
    
    // Watch agent state
    final agentState = ref.watch(agentStateProvider);
    
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: Text('Riverpod Integration'),
          actions: [
            agentState.when(
              data: (state) => Chip(label: Text(state.toString())),
              loading: () => CircularProgressIndicator(),
              error: (_, __) => Icon(Icons.error),
            ),
          ],
        ),
        body: HomeScreen(),
      ),
    );
  }
}

class HomeScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final client = ref.watch(domosClientProvider);
    
    return Column(
      children: [
        ElevatedButton(
          onPressed: () => client.sendText('Search for laptops'),
          child: Text('Search Laptops'),
        ),
        
        // Listen to agent responses
        Consumer(
          builder: (context, ref, child) {
            final response = ref.watch(agentResponseProvider);
            return response.when(
              data: (data) => Text(data.text),
              loading: () => CircularProgressIndicator(),
              error: (err, stack) => Text('Error: $err'),
            );
          },
        ),
      ],
    );
  }
}
```

---

## 📋 Résumé des Extensions

| Extension | Package | Use Case | Avantage |
|-----------|---------|----------|----------|
| **Stream Tools** | extensions | Long-running tasks | Progress feedback |
| **Repository Adapter** | extensions | Clean architecture | Réutilise business logic |
| **Event Bus** | extensions | Module découplés | Communication async |
| **Namespaces** | extensions | Gros projets | Organisation |
| **Riverpod** | integrations | State management | Reactive, testable |
| **Bloc** | integrations | State management | Event-driven |
| **GetX** | integrations | State management | Simple, rapide |

---

## ✅ Checklist d'Implémentation Extensions

### Phase 1 : Extensions Core (3-4 jours)
- [ ] Stream Tools (types, handler, extension)
- [ ] Repository Adapter (base class, mixin)
- [ ] Event Bus (emitter, listener, request-response)
- [ ] Namespaces (namespace class, manager)

### Phase 2 : Integrations (2-3 jours)
- [ ] Riverpod (providers, tools)
- [ ] Bloc (bloc, events, states)
- [ ] GetX (controller, bindings)

### Phase 3 : Tests (2 jours)
- [ ] Unit tests (chaque extension)
- [ ] Integration tests (avec mocks)

### Phase 4 : Documentation (1 jour)
- [ ] Examples pour chaque pattern
- [ ] Migration guides

**Total estimé : 8-10 jours**

---

✅ **Documentation complète des Extensions & Integrations !** 🚀
